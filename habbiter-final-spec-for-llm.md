# Habbiter — Финальное ТЗ для разработки

## 🎯 Обзор проекта

**Название:** Habbiter  
**Описание:** Мобильное веб-приложение для отслеживания привычек с авторизацией через Telegram  
**Язык интерфейса:** Русский (кроме названия "Habbiter")

---

## 🏗️ Архитектура (GitHub Pages + Supabase)

```
┌─────────────────────────────────────────────┐
│           GitHub Pages (Frontend)           │
│  - React SPA (Vite или Create React App)   │
│  - Статические файлы (HTML, CSS, JS)       │
│  - NO server-side code                      │
└────────────┬────────────────────────────────┘
             │
             │ HTTPS
             │
      ┌──────▼──────────────────────────┐
      │     Supabase (Backend)          │
      │                                 │
      │  ┌─────────────────────────┐   │
      │  │  Auth (Session Mgmt)    │   │
      │  └─────────────────────────┘   │
      │                                 │
      │  ┌─────────────────────────┐   │
      │  │  PostgreSQL Database    │   │
      │  │  - users                │   │
      │  │  - habits               │   │
      │  │  - habit_records        │   │
      │  │  - subscription_checks  │   │
      │  └─────────────────────────┘   │
      │                                 │
      │  ┌─────────────────────────┐   │
      │  │  Edge Functions         │   │
      │  │  - telegram-auth        │   │
      │  │  - check-subscription   │   │
      │  │  - telegram-webhook     │   │
      │  └─────────────────────────┘   │
      │                                 │
      │  ┌─────────────────────────┐   │
      │  │  Storage (optional)     │   │
      │  │  - user avatars         │   │
      │  └─────────────────────────┘   │
      └─────────────┬───────────────────┘
                    │
                    │ HTTPS
                    │
      ┌─────────────▼───────────────┐
      │   Telegram Bot API          │
      │   - getChatMember           │
      │   - sendMessage             │
      └─────────────────────────────┘
```

**Ключевые компоненты:**

1. **Frontend (GitHub Pages):**
   - React SPA
   - Client-side routing (React Router)
   - Supabase JS Client
   - Никаких секретов в коде!

2. **Backend (Supabase):**
   - PostgreSQL база данных
   - Supabase Auth (управление сессиями)
   - Edge Functions (serverless функции)
   - Row Level Security (защита данных)

3. **CI/CD (GitHub Actions):**
   - Автоматический деплой на GitHub Pages
   - Environment secrets (не в коде!)

---

## 🔐 Безопасность и секреты

### Принципы безопасности:

1. **НЕТ секретов в коде** ❌
   - Telegram Bot Token → Supabase Secrets
   - Channel ID → Supabase Secrets
   - Database credentials → управляются Supabase

2. **Публичные ключи (можно в коде)** ✅
   - Supabase URL → `VITE_SUPABASE_URL`
   - Supabase Anon Key → `VITE_SUPABASE_ANON_KEY`
   - Telegram Bot Username → `VITE_TELEGRAM_BOT_USERNAME`

3. **GitHub Secrets (для CI/CD)** 🔒
   - Используются только в GitHub Actions
   - Не попадают в frontend код

4. **Row Level Security (RLS)** 🛡️
   - Каждый пользователь видит только свои данные
   - Защита на уровне базы данных

### Где что хранится:

| Секрет | Где хранится | Как используется |
|--------|-------------|------------------|
| `TELEGRAM_BOT_TOKEN` | Supabase Secrets | Edge Functions |
| `TELEGRAM_CHANNEL_ID` | Supabase Secrets | Edge Functions |
| `SUPABASE_SERVICE_ROLE_KEY` | GitHub Secrets | CI/CD (опционально) |
| `SUPABASE_URL` | `.env` → Frontend | Публичный |
| `SUPABASE_ANON_KEY` | `.env` → Frontend | Публичный |

---

## 🗄️ База данных (PostgreSQL в Supabase)

### Таблица: `users`

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Telegram данные
  telegram_id BIGINT UNIQUE NOT NULL,
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  photo_url TEXT,
  
  -- Подписка
  is_subscribed BOOLEAN DEFAULT false,
  subscription_checked_at TIMESTAMPTZ,
  subscription_expires_at TIMESTAMPTZ,
  
  -- Метаданные
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

-- Индексы
CREATE INDEX idx_users_telegram_id ON users(telegram_id);
CREATE INDEX idx_users_subscription_expires ON users(subscription_expires_at);

-- RLS (Row Level Security)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Политика: пользователь видит только свою строку
CREATE POLICY "Users can view own data"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Политика: пользователь может обновлять только свою строку
CREATE POLICY "Users can update own data"
  ON users FOR UPDATE
  USING (auth.uid() = id);
```

### Таблица: `habits`

```sql
CREATE TABLE habits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Данные привычки
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  
  -- Настройки
  frequency TEXT DEFAULT 'daily', -- daily, specific_days, custom
  repeat_days INTEGER[], -- [1,2,3,4,5] для Пн-Пт
  
  -- Статус
  status TEXT DEFAULT 'active', -- active, archived, deleted
  archived_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  
  -- Метаданные
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT habits_name_length CHECK (char_length(name) <= 50)
);

-- Индексы
CREATE INDEX idx_habits_user_id ON habits(user_id);
CREATE INDEX idx_habits_status ON habits(status);

-- RLS
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own habits"
  ON habits FOR ALL
  USING (user_id IN (SELECT id FROM users WHERE auth.uid() = id));
```

### Таблица: `habit_records`

```sql
CREATE TABLE habit_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  habit_id UUID REFERENCES habits(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Данные выполнения
  date DATE NOT NULL,
  completed BOOLEAN DEFAULT false,
  
  -- Метаданные
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Уникальность: одна запись на привычку на день
  CONSTRAINT habit_records_unique UNIQUE (habit_id, date)
);

-- Индексы
CREATE INDEX idx_habit_records_habit_id ON habit_records(habit_id);
CREATE INDEX idx_habit_records_user_id ON habit_records(user_id);
CREATE INDEX idx_habit_records_date ON habit_records(date);

-- RLS
ALTER TABLE habit_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own records"
  ON habit_records FOR ALL
  USING (user_id IN (SELECT id FROM users WHERE auth.uid() = id));
```

### Таблица: `subscription_checks`

```sql
CREATE TABLE subscription_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Результат проверки
  is_subscribed BOOLEAN NOT NULL,
  check_method TEXT, -- 'login', 'cron', 'manual'
  status TEXT, -- 'member', 'left', 'kicked'
  error_message TEXT,
  
  -- Метаданные
  checked_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индекс
CREATE INDEX idx_subscription_checks_user_id ON subscription_checks(user_id);

-- RLS
ALTER TABLE subscription_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own checks"
  ON subscription_checks FOR SELECT
  USING (user_id IN (SELECT id FROM users WHERE auth.uid() = id));
```

### Database Functions (для streak calculation)

```sql
-- Функция расчёта streak
CREATE OR REPLACE FUNCTION calculate_streak(p_habit_id UUID)
RETURNS INTEGER AS $$
DECLARE
  current_streak INTEGER := 0;
  check_date DATE := CURRENT_DATE;
BEGIN
  -- Проверяем дни назад от сегодня
  LOOP
    IF EXISTS (
      SELECT 1 FROM habit_records
      WHERE habit_id = p_habit_id
        AND date = check_date
        AND completed = true
    ) THEN
      current_streak := current_streak + 1;
      check_date := check_date - INTERVAL '1 day';
    ELSE
      EXIT;
    END IF;
  END LOOP;
  
  RETURN current_streak;
END;
$$ LANGUAGE plpgsql;
```

---

## ⚡ Supabase Edge Functions

### 1. Функция: `telegram-auth`

**Путь:** `supabase/functions/telegram-auth/index.ts`

**Назначение:** Обработка авторизации через Telegram Login Widget

**Запрос:**
```typescript
POST /telegram-auth
Body: {
  id: string,
  first_name: string,
  last_name?: string,
  username?: string,
  photo_url?: string,
  auth_date: string,
  hash: string
}
```

**Логика:**
1. Проверить hash от Telegram (HMAC-SHA256)
2. Проверить свежесть auth_date (< 1 час)
3. Проверить подписку на канал (getChatMember)
4. Создать/обновить пользователя в БД
5. Создать Supabase Auth сессию
6. Вернуть session token

**Ответ:**
```typescript
{
  success: true,
  isSubscribed: boolean,
  session: {
    access_token: string,
    refresh_token: string,
    user: { ... }
  }
}
```

**Псевдокод:**
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!
const TELEGRAM_CHANNEL_ID = Deno.env.get('TELEGRAM_CHANNEL_ID')!

serve(async (req) => {
  const data = await req.json()
  
  // 1. Verify Telegram hash
  if (!verifyTelegramHash(data)) {
    return new Response('Invalid hash', { status: 401 })
  }
  
  // 2. Check auth_date
  if (isAuthDateExpired(data.auth_date)) {
    return new Response('Auth data expired', { status: 401 })
  }
  
  // 3. Check channel subscription
  const isSubscribed = await checkChannelSubscription(data.id)
  
  // 4. Create/update user
  const supabase = createClient(...)
  const { data: user } = await supabase
    .from('users')
    .upsert({
      telegram_id: data.id,
      username: data.username,
      first_name: data.first_name,
      is_subscribed: isSubscribed,
      subscription_checked_at: new Date(),
      subscription_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    })
    .select()
    .single()
  
  // 5. Create Auth session
  const { data: session } = await supabase.auth.signInWithPassword({
    email: `${data.id}@telegram.user`,
    password: TELEGRAM_BOT_TOKEN // одинаковый для всех
  })
  
  return new Response(JSON.stringify({
    success: true,
    isSubscribed,
    session
  }))
})
```

---

### 2. Функция: `check-subscription`

**Путь:** `supabase/functions/check-subscription/index.ts`

**Назначение:** Проверка подписки текущего пользователя

**Запрос:**
```typescript
POST /check-subscription
Headers: {
  Authorization: Bearer <access_token>
}
```

**Логика:**
1. Получить user_id из JWT
2. Получить telegram_id из БД
3. Проверить подписку через Telegram API
4. Обновить статус в БД
5. Вернуть результат

**Ответ:**
```typescript
{
  isSubscribed: boolean,
  checkedAt: string
}
```

---

### 3. Функция: `telegram-webhook`

**Путь:** `supabase/functions/telegram-webhook/index.ts`

**Назначение:** Обработка callback от Telegram бота (кнопка "Я подписался")

**Запрос:**
```typescript
POST /telegram-webhook
Body: {
  update_id: number,
  callback_query?: {
    id: string,
    from: { id: number },
    data: string
  }
}
```

**Логика:**
1. Получить callback_query
2. Если callback_data === 'check_subscription'
3. Проверить подписку
4. Отправить answerCallbackQuery
5. Обновить сообщение

---

### 4. Функция: `cron-check-subscriptions`

**Путь:** `supabase/functions/cron-check-subscriptions/index.ts`

**Назначение:** Периодическая проверка подписок (вызывается через Supabase pg_cron)

**Запрос:**
```typescript
POST /cron-check-subscriptions
Headers: {
  Authorization: Bearer <cron_secret>
}
```

**Логика:**
1. Проверить cron_secret
2. Получить всех пользователей с истёкшим кешем
3. Для каждого проверить подписку
4. Обновить статус
5. Отправить уведомление если отписался

---

## 🎨 Frontend (React SPA на GitHub Pages)

### Технологический стек:

**Build Tool:** Vite  
**Framework:** React 18  
**Routing:** React Router v6  
**Styling:** Tailwind CSS  
**UI Components:** shadcn/ui (Radix UI)  
**Icons:** Phosphor Icons  
**HTTP Client:** Supabase JS Client  
**State Management:** React Context + Supabase Realtime (опционально)

### Структура проекта:

```
habbiter/
├── public/
│   └── favicon.ico
├── src/
│   ├── components/
│   │   ├── ui/              # shadcn/ui компоненты
│   │   ├── HabitCard.tsx
│   │   ├── ProgressBar.tsx
│   │   └── WeekSwitcher.tsx
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── SubscribePage.tsx
│   │   ├── HabitsPage.tsx
│   │   ├── AnalyticsPage.tsx
│   │   └── ProfilePage.tsx
│   ├── lib/
│   │   ├── supabase.ts      # Supabase client
│   │   └── utils.ts
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   └── useHabits.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── .env.example
├── .gitignore
├── package.json
├── vite.config.ts
└── README.md
```

### Настройка Vite для GitHub Pages:

**vite.config.ts:**
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/habbiter/', // название репозитория
  build: {
    outDir: 'dist',
  },
})
```

### Environment Variables (`.env`):

```env
# Публичные ключи (можно коммитить в .env.example)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_TELEGRAM_BOT_USERNAME=habbiter_bot
VITE_TELEGRAM_CHANNEL_USERNAME=your_channel
```

### Supabase Client (`src/lib/supabase.ts`):

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})
```

### Auth Hook (`src/hooks/useAuth.ts`):

```typescript
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Получить текущую сессию
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Слушать изменения авторизации
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return { user, loading }
}
```

### Protected Route:

```typescript
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <LoadingSpinner />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
```

### Login Page (с Telegram Widget):

```typescript
export function LoginPage() {
  useEffect(() => {
    // Загрузить Telegram Widget
    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.setAttribute('data-telegram-login', import.meta.env.VITE_TELEGRAM_BOT_USERNAME)
    script.setAttribute('data-size', 'large')
    script.setAttribute('data-radius', '8')
    script.setAttribute('data-auth-url', `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/telegram-auth`)
    script.setAttribute('data-request-access', 'write')
    script.async = true

    document.getElementById('telegram-login')?.appendChild(script)
  }, [])

  return (
    <div>
      <h1>Habbiter</h1>
      <div id="telegram-login" />
    </div>
  )
}
```

---

## 🚀 CI/CD (GitHub Actions)

### Файл: `.github/workflows/deploy.yml`

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Create .env file
        run: |
          echo "VITE_SUPABASE_URL=${{ secrets.VITE_SUPABASE_URL }}" >> .env
          echo "VITE_SUPABASE_ANON_KEY=${{ secrets.VITE_SUPABASE_ANON_KEY }}" >> .env
          echo "VITE_TELEGRAM_BOT_USERNAME=${{ secrets.VITE_TELEGRAM_BOT_USERNAME }}" >> .env
          echo "VITE_TELEGRAM_CHANNEL_USERNAME=${{ secrets.VITE_TELEGRAM_CHANNEL_USERNAME }}" >> .env

      - name: Build
        run: npm run build

      - name: Setup Pages
        uses: actions/configure-pages@v4

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

### GitHub Secrets (настроить в Settings → Secrets):

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_TELEGRAM_BOT_USERNAME=habbiter_bot
VITE_TELEGRAM_CHANNEL_USERNAME=your_channel
```

---

## 📱 Telegram Mini App

### Entry Point:

```typescript
// src/pages/MiniAppPage.tsx
export function MiniAppPage() {
  useEffect(() => {
    if (!window.Telegram?.WebApp) {
      console.error('Not in Telegram')
      return
    }

    const tg = window.Telegram.WebApp
    tg.ready()
    tg.expand()

    // Получить initData
    const initData = tg.initData

    // Отправить на Edge Function для авторизации
    fetch(`${supabaseUrl}/functions/v1/telegram-auth-miniapp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData })
    })
      .then(res => res.json())
      .then(data => {
        if (data.isSubscribed) {
          navigate('/habits')
        } else {
          navigate('/subscribe')
        }
      })
  }, [])

  return <LoadingSpinner />
}
```

---

## 🔄 Периодическая проверка подписки

### Вариант 1: Supabase pg_cron (встроенный)

**SQL:**
```sql
-- Включить расширение
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Создать cron job (каждое воскресенье в 00:00 UTC)
SELECT cron.schedule(
  'check-subscriptions-weekly',
  '0 0 * * 0',
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/cron-check-subscriptions',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_CRON_SECRET"}'::jsonb
  );
  $$
);
```

### Вариант 2: GitHub Actions Cron

**Файл:** `.github/workflows/check-subscriptions.yml`

```yaml
name: Check Subscriptions

on:
  schedule:
    - cron: '0 0 * * 0' # каждое воскресенье в 00:00 UTC
  workflow_dispatch:

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - name: Call Supabase Function
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            https://your-project.supabase.co/functions/v1/cron-check-subscriptions
```

---

## 📦 Зависимости (package.json)

```json
{
  "name": "habbiter",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "@supabase/supabase-js": "^2.39.0",
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-checkbox": "^1.0.4",
    "phosphor-react": "^1.4.1",
    "date-fns": "^3.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "vite": "^5.0.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "typescript": "^5.3.0"
  }
}
```

---

## ✅ Acceptance Criteria (для LLM агента)

### Функциональные требования:

**Авторизация:**
- [ ] Реализован Telegram Login Widget на странице `/login`
- [ ] При авторизации вызывается Edge Function `telegram-auth`
- [ ] Проверяется hash от Telegram (HMAC-SHA256)
- [ ] Проверяется подписка на канал через Telegram API
- [ ] Создаётся Supabase Auth сессия
- [ ] Если подписан → редирект на `/habits`
- [ ] Если не подписан → редирект на `/subscribe`

**База данных:**
- [ ] Созданы все 4 таблицы (users, habits, habit_records, subscription_checks)
- [ ] Включён Row Level Security (RLS) на всех таблицах
- [ ] Созданы политики доступа (пользователь видит только свои данные)
- [ ] Создана функция `calculate_streak`

**Edge Functions:**
- [ ] Функция `telegram-auth` работает корректно
- [ ] Функция `check-subscription` проверяет подписку
- [ ] Функция `telegram-webhook` обрабатывает callback
- [ ] Функция `cron-check-subscriptions` проверяет всех пользователей

**Frontend:**
- [ ] Приложение собирается командой `npm run build`
- [ ] Деплоится на GitHub Pages
- [ ] Работает авторизация через Telegram
- [ ] Работает проверка подписки
- [ ] Защищённые роуты требуют авторизации
- [ ] Страница `/subscribe` корректно отображается

**Безопасность:**
- [ ] Нет секретов в коде (только в Supabase Secrets и GitHub Secrets)
- [ ] RLS включён на всех таблицах
- [ ] Проверяется hash от Telegram
- [ ] Проверяется свежесть auth_date

**CI/CD:**
- [ ] GitHub Actions деплоит на GitHub Pages при push в main
- [ ] Environment variables берутся из GitHub Secrets
- [ ] Build проходит успешно

---

## 🎯 Задачи для LLM агента

### Phase 1: Database Setup

**Задача:**
1. Создать SQL миграцию для всех таблиц
2. Включить RLS на всех таблицах
3. Создать политики доступа
4. Создать функцию `calculate_streak`

**Файлы:**
- `supabase/migrations/20250103_create_tables.sql`

---

### Phase 2: Edge Functions

**Задача:**
1. Создать Edge Function `telegram-auth`
   - Проверка hash
   - Проверка подписки
   - Создание сессии
2. Создать Edge Function `check-subscription`
   - Получение user из JWT
   - Проверка подписки
3. Создать Edge Function `telegram-webhook`
   - Обработка callback
4. Создать Edge Function `cron-check-subscriptions`
   - Массовая проверка подписок

**Файлы:**
- `supabase/functions/telegram-auth/index.ts`
- `supabase/functions/check-subscription/index.ts`
- `supabase/functions/telegram-webhook/index.ts`
- `supabase/functions/cron-check-subscriptions/index.ts`

---

### Phase 3: Frontend

**Задача:**
1. Настроить Vite проект
2. Создать Supabase client
3. Создать страницы:
   - LoginPage (с Telegram Widget)
   - SubscribePage
   - HabitsPage (главная страница из предыдущего ТЗ)
   - AnalyticsPage
   - ProfilePage
4. Создать хуки:
   - useAuth
   - useHabits
5. Настроить роутинг с защитой
6. Интегрировать с Supabase

**Файлы:**
- `src/lib/supabase.ts`
- `src/hooks/useAuth.ts`
- `src/hooks/useHabits.ts`
- `src/pages/*`
- `src/App.tsx`

---

### Phase 4: CI/CD

**Задача:**
1. Создать GitHub Action для деплоя
2. Настроить build для GitHub Pages
3. Настроить environment variables

**Файлы:**
- `.github/workflows/deploy.yml`
- `vite.config.ts`

---

## 📚 Дополнительные материалы

### Документация:
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [Telegram Login Widget](https://core.telegram.org/widgets/login)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [GitHub Pages](https://docs.github.com/en/pages)
- [Vite](https://vitejs.dev/)

### Полезные команды:

```bash
# Разработка
npm run dev

# Build
npm run build

# Preview build
npm run preview

# Supabase CLI
supabase functions new function-name
supabase functions deploy function-name
supabase db push
```

---

## 🔒 Чеклист безопасности

- [ ] Все секреты в Supabase Secrets или GitHub Secrets
- [ ] Никаких секретов в коде
- [ ] RLS включён на всех таблицах
- [ ] Политики доступа настроены правильно
- [ ] Hash от Telegram проверяется
- [ ] auth_date проверяется на свежесть
- [ ] HTTPS везде
- [ ] CORS настроен правильно
- [ ] Rate limiting на Edge Functions
- [ ] Input validation (Zod или Joi)

---

*Документ создан: 03.01.2025*
*Версия: 1.0 (GitHub Pages + Supabase)*
