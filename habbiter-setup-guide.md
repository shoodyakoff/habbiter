# Habbiter — Пошаговая инструкция по настройке

## 📋 Обзор

Эта инструкция поможет вам настроить всю инфраструктуру для приложения Habbiter с нуля.

**Что мы будем настраивать:**
1. ✅ Telegram бот
2. ✅ Telegram Mini App  
3. ✅ Supabase проект (база данных + Edge Functions)
4. ✅ GitHub репозиторий
5. ✅ GitHub Pages (хостинг)
6. ✅ CI/CD pipeline

**Время выполнения:** ~2-3 часа

**Что потребуется:**
- Telegram аккаунт
- GitHub аккаунт
- Supabase аккаунт (бесплатный)
- Терминал с установленными: Node.js, Git, npm

---

## 🤖 ЭТАП 1: Создание Telegram бота

### 1.1 Создание бота через @BotFather

**Шаг 1:** Открыть Telegram и найти [@BotFather](https://t.me/BotFather)

**Шаг 2:** Отправить команду:
```
/newbot
```

**Шаг 3:** BotFather попросит ввести название бота. Введите:
```
Habbiter Bot
```

**Шаг 4:** BotFather попросит ввести username бота (должен заканчиваться на `bot`):
```
habbiter_bot
```
*Примечание: если username занят, попробуйте `habbiter_habits_bot` или добавьте свой постфикс*

**Шаг 5:** BotFather выдаст вам **Bot Token**. Скопируйте его!

```
Use this token to access the HTTP API:
123456789:ABCdefGHIjklMNOpqrsTUVwxyz

Keep your token secure and store it safely, it can be used by anyone to control your bot.
```

**✅ Сохраните токен в блокнот. Формат:**
```
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
```

---

### 1.2 Настройка Login Widget

**Шаг 1:** В чате с @BotFather отправьте:
```
/setdomain
```

**Шаг 2:** Выберите вашего бота из списка (нажмите на название)

**Шаг 3:** Введите ваш домен GitHub Pages:
```
https://ваш-username.github.io
```

**Пример:**
```
https://stasprod.github.io
```

**Шаг 4:** BotFather подтвердит:
```
Success! Login widget domain updated.
```

**✅ Готово!** Теперь Login Widget сможет работать на вашем домене.

---

### 1.3 Настройка описания и команд (опционально)

**Описание бота:**
```
/setdescription
```
Введите:
```
Habbiter - отслеживайте привычки каждый день!
```

**Команды бота:**
```
/setcommands
```
Введите:
```
start - Запустить приложение
help - Помощь
```

---

## 📱 ЭТАП 2: Создание Telegram Mini App

### 2.1 Создание Mini App

**Шаг 1:** В чате с @BotFather отправьте:
```
/newapp
```

**Шаг 2:** Выберите вашего бота

**Шаг 3:** Введите название приложения:
```
Habbiter
```

**Шаг 4:** Введите описание:
```
Отслеживайте свои привычки каждый день. Формируйте полезные привычки легко и удобно!
```

**Шаг 5:** Загрузите иконку приложения (512x512 PNG)
- Создайте или скачайте иконку 512x512px
- Отправьте файл @BotFather

**Шаг 6:** Загрузите GIF превью (опционально)
- Можно пропустить, отправив `/empty`

**Шаг 7:** Введите URL приложения:
```
https://ваш-username.github.io/habbiter/
```

**Пример:**
```
https://stasprod.github.io/habbiter/
```

**Шаг 8:** Выберите платформы:
- Web (обязательно)
- iOS (опционально)
- Android (опционально)

**Шаг 9:** BotFather подтвердит создание:
```
Success! Your Mini App "Habbiter" has been created.
```

**✅ Готово!** Mini App создано.

---

### 2.2 Добавление кнопки запуска Mini App

**Опционально:** Можно настроить кнопку меню для быстрого запуска

**Шаг 1:**
```
/setmenubutton
```

**Шаг 2:** Выберите вашего бота

**Шаг 3:** Введите текст кнопки:
```
Открыть Habbiter
```

**Шаг 4:** Введите URL:
```
https://ваш-username.github.io/habbiter/
```

---

## 📢 ЭТАП 3: Создание/настройка Telegram канала

### 3.1 Создание канала (если ещё нет)

**Шаг 1:** В Telegram нажмите:
- iOS/Android: Menu → New Channel
- Desktop: Menu → Create Channel

**Шаг 2:** Введите название канала:
```
Habbiter — Привычки
```

**Шаг 3:** Введите описание:
```
Советы по формированию привычек, мотивация и новости приложения Habbiter
```

**Шаг 4:** Выберите тип канала: **Public**

**Шаг 5:** Введите username канала:
```
habbiter_channel
```
*Примечание: если занят, придумайте другой*

**✅ Сохраните username канала:**
```
TELEGRAM_CHANNEL_USERNAME=habbiter_channel
```

---

### 3.2 Получение Channel ID (числовой)

**Вариант 1: Через @userinfobot**

1. Добавьте [@userinfobot](https://t.me/userinfobot) в ваш канал как администратора
2. Бот отправит сообщение с ID канала
3. Скопируйте ID (будет начинаться с `-100`)
4. Удалите бота из канала

**Пример:**
```
TELEGRAM_CHANNEL_ID=-1001234567890
```

**Вариант 2: Вручную**

1. Откройте канал в браузере
2. URL будет вида: `https://t.me/habbiter_channel`
3. Можно использовать `@username` вместо числового ID

**✅ Сохраните Channel ID:**
```
TELEGRAM_CHANNEL_ID=@habbiter_channel
или
TELEGRAM_CHANNEL_ID=-1001234567890
```

---

### 3.3 Добавление бота администратором канала

**ВАЖНО:** Бот должен быть администратором канала, чтобы проверять подписку!

**Шаг 1:** Откройте ваш канал

**Шаг 2:** Нажмите на название канала → Administrators

**Шаг 3:** Add Administrator

**Шаг 4:** Найдите вашего бота (`@habbiter_bot`)

**Шаг 5:** Дайте права:
- ✅ Manage Channel (только это нужно для getChatMember)

**Шаг 6:** Save

**✅ Проверка:** Бот должен появиться в списке администраторов

---

## 🗄️ ЭТАП 4: Настройка Supabase

### 4.1 Создание Supabase проекта

**Шаг 1:** Зайдите на [supabase.com](https://supabase.com)

**Шаг 2:** Sign Up или Login (можно через GitHub)

**Шаг 3:** Нажмите "New Project"

**Шаг 4:** Заполните форму:
- **Name:** `habbiter`
- **Database Password:** (придумайте надёжный пароль и сохраните!)
- **Region:** выберите ближайший к вашим пользователям
- **Pricing Plan:** Free

**Шаг 5:** Нажмите "Create new project"

**⏱️ Подождите 2-3 минуты** пока проект создаётся

---

### 4.2 Получение API ключей

**Шаг 1:** В проекте перейдите в: **Settings** → **API**

**Шаг 2:** Скопируйте **Project URL:**
```
https://ваш-проект.supabase.co
```

**Шаг 3:** Скопируйте **anon public** ключ:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Шаг 4:** Скопируйте **service_role** ключ (для Edge Functions):
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**✅ Сохраните в блокнот:**
```
SUPABASE_URL=https://ваш-проект.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

### 4.3 Создание базы данных

**Шаг 1:** В Supabase перейдите в: **SQL Editor**

**Шаг 2:** Нажмите "+ New Query"

**Шаг 3:** Вставьте SQL код (из файла `migrations.sql` который создаст LLM агент)

**Базовая структура (можете вставить сразу):**

```sql
-- Включить UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Таблица пользователей
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  telegram_id BIGINT UNIQUE NOT NULL,
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  photo_url TEXT,
  is_subscribed BOOLEAN DEFAULT false,
  subscription_checked_at TIMESTAMPTZ,
  subscription_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

-- Индексы
CREATE INDEX idx_users_telegram_id ON users(telegram_id);
CREATE INDEX idx_users_subscription_expires ON users(subscription_expires_at);

-- Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Политики (пользователь видит только свои данные)
CREATE POLICY "Users can view own data"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- Таблица привычек
CREATE TABLE habits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  frequency TEXT DEFAULT 'daily',
  repeat_days INTEGER[],
  status TEXT DEFAULT 'active',
  archived_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT habits_name_length CHECK (char_length(name) <= 50)
);

CREATE INDEX idx_habits_user_id ON habits(user_id);
CREATE INDEX idx_habits_status ON habits(status);

ALTER TABLE habits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own habits"
  ON habits FOR ALL
  USING (user_id IN (SELECT id FROM users WHERE auth.uid() = id));

-- Таблица записей привычек
CREATE TABLE habit_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  habit_id UUID REFERENCES habits(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT habit_records_unique UNIQUE (habit_id, date)
);

CREATE INDEX idx_habit_records_habit_id ON habit_records(habit_id);
CREATE INDEX idx_habit_records_user_id ON habit_records(user_id);
CREATE INDEX idx_habit_records_date ON habit_records(date);

ALTER TABLE habit_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own records"
  ON habit_records FOR ALL
  USING (user_id IN (SELECT id FROM users WHERE auth.uid() = id));

-- Таблица проверок подписки
CREATE TABLE subscription_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  is_subscribed BOOLEAN NOT NULL,
  check_method TEXT,
  status TEXT,
  error_message TEXT,
  checked_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subscription_checks_user_id ON subscription_checks(user_id);

ALTER TABLE subscription_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own checks"
  ON subscription_checks FOR SELECT
  USING (user_id IN (SELECT id FROM users WHERE auth.uid() = id));

-- Функция расчёта streak
CREATE OR REPLACE FUNCTION calculate_streak(p_habit_id UUID)
RETURNS INTEGER AS $$
DECLARE
  current_streak INTEGER := 0;
  check_date DATE := CURRENT_DATE;
BEGIN
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

**Шаг 4:** Нажмите "Run" (внизу справа)

**✅ Проверка:** Должно появиться сообщение "Success. No rows returned"

**Шаг 5:** Перейдите в **Table Editor** и убедитесь что таблицы созданы:
- users
- habits
- habit_records
- subscription_checks

---

### 4.4 Настройка Supabase Secrets

**Шаг 1:** Перейдите в **Settings** → **Vault** (или **Secrets**)

**Шаг 2:** Добавьте секреты:

**Secret 1:**
```
Name: TELEGRAM_BOT_TOKEN
Value: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz
```

**Secret 2:**
```
Name: TELEGRAM_CHANNEL_ID
Value: @habbiter_channel
(или -1001234567890)
```

**Secret 3:**
```
Name: CRON_SECRET
Value: (генерируем рандомную строку)
```

**Генерация CRON_SECRET (в терминале):**
```bash
openssl rand -base64 32
```
Или просто придумайте длинную рандомную строку.

**✅ Сохраните CRON_SECRET в блокнот**

---

## ⚡ ЭТАП 5: Создание Supabase Edge Functions

### 5.1 Установка Supabase CLI

**macOS:**
```bash
brew install supabase/tap/supabase
```

**Windows:**
```bash
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

**Linux:**
```bash
brew install supabase/tap/supabase
```

**Проверка установки:**
```bash
supabase --version
```

---

### 5.2 Инициализация проекта

**Шаг 1:** Создайте папку для проекта:
```bash
mkdir habbiter
cd habbiter
```

**Шаг 2:** Инициализируйте Supabase:
```bash
supabase init
```

Это создаст папку `supabase/`

---

### 5.3 Логин в Supabase

```bash
supabase login
```

Откроется браузер → авторизуйтесь → получите access token

---

### 5.4 Линк к проекту

```bash
supabase link --project-ref ваш-project-id
```

**Где взять project-id?**
- Откройте Supabase Dashboard
- URL вида: `https://app.supabase.com/project/abcdefgh`
- `abcdefgh` — это ваш project-id

**Альтернатива:**
```bash
supabase link
```
Выберите проект из списка

---

### 5.5 Создание Edge Functions

**LLM агент создаст файлы функций. Вам нужно будет их деплоить.**

**Структура проекта будет:**
```
habbiter/
├── supabase/
│   ├── functions/
│   │   ├── telegram-auth/
│   │   │   └── index.ts
│   │   ├── check-subscription/
│   │   │   └── index.ts
│   │   ├── telegram-webhook/
│   │   │   └── index.ts
│   │   └── cron-check-subscriptions/
│   │       └── index.ts
│   └── config.toml
```

**После того как LLM агент создаст функции, выполните:**

```bash
# Деплой всех функций
supabase functions deploy telegram-auth
supabase functions deploy check-subscription
supabase functions deploy telegram-webhook
supabase functions deploy cron-check-subscriptions
```

**Или деплой всех сразу:**
```bash
supabase functions deploy
```

**✅ Проверка:**
```bash
supabase functions list
```

Должны увидеть список ваших функций с URL:
```
telegram-auth: https://ваш-проект.supabase.co/functions/v1/telegram-auth
check-subscription: https://ваш-проект.supabase.co/functions/v1/check-subscription
...
```

---

### 5.6 Настройка секретов для функций

Edge Functions должны иметь доступ к секретам.

**Проверить секреты:**
```bash
supabase secrets list
```

Должны увидеть:
- TELEGRAM_BOT_TOKEN
- TELEGRAM_CHANNEL_ID
- CRON_SECRET

**Если секретов нет, установите через CLI:**
```bash
supabase secrets set TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
supabase secrets set TELEGRAM_CHANNEL_ID=@habbiter_channel
supabase secrets set CRON_SECRET=ваш-случайный-секрет
```

---

## 🐙 ЭТАП 6: Настройка GitHub репозитория

### 6.1 Создание репозитория

**Шаг 1:** Зайдите на [github.com](https://github.com)

**Шаг 2:** Нажмите "New repository"

**Шаг 3:** Заполните:
- **Repository name:** `habbiter`
- **Description:** "Habit tracking web app"
- **Public** или **Private** (GitHub Pages работает в обоих случаях)
- ✅ Initialize with README (опционально)

**Шаг 4:** Create repository

---

### 6.2 Клонирование репозитория

```bash
cd ~/projects  # или куда хотите
git clone https://github.com/ваш-username/habbiter.git
cd habbiter
```

---

### 6.3 Добавление файлов проекта

**LLM агент создаст все файлы. Вам нужно будет их закоммитить:**

```bash
git add .
git commit -m "Initial commit: project setup"
git push origin main
```

---

### 6.4 Настройка GitHub Secrets

**Шаг 1:** В репозитории зайдите в: **Settings** → **Secrets and variables** → **Actions**

**Шаг 2:** Нажмите "New repository secret"

**Добавьте следующие секреты:**

**Secret 1:**
```
Name: VITE_SUPABASE_URL
Value: https://ваш-проект.supabase.co
```

**Secret 2:**
```
Name: VITE_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Secret 3:**
```
Name: VITE_TELEGRAM_BOT_USERNAME
Value: habbiter_bot
```

**Secret 4:**
```
Name: VITE_TELEGRAM_CHANNEL_USERNAME
Value: habbiter_channel
```

**✅ Всего должно быть 4 секрета**

---

### 6.5 Настройка GitHub Pages

**Шаг 1:** В репозитории зайдите в: **Settings** → **Pages**

**Шаг 2:** В разделе **Source** выберите:
- **Source:** GitHub Actions (не Branch!)

**Шаг 3:** Сохраните

**✅ GitHub Pages настроен!**

После первого деплоя (через GitHub Actions) ваше приложение будет доступно по адресу:
```
https://ваш-username.github.io/habbiter/
```

---

## 🚀 ЭТАП 7: Деплой приложения

### 7.1 Первый деплой

**После того как LLM агент создаст все файлы:**

**Шаг 1:** Закоммитить и запушить в main:
```bash
git add .
git commit -m "Add frontend and CI/CD"
git push origin main
```

**Шаг 2:** GitHub Actions автоматически запустится

**Шаг 3:** Проверить прогресс:
- Зайдите в репозиторий → **Actions**
- Должен быть workflow "Deploy to GitHub Pages"
- Кликните на него → смотрите логи

**⏱️ Подождите 2-5 минут**

**Шаг 4:** После успешного деплоя, откройте:
```
https://ваш-username.github.io/habbiter/
```

**✅ Приложение должно загрузиться!**

---

## 🔗 ЭТАП 8: Настройка Telegram Webhook

### 8.1 Установка webhook для бота

**Это нужно чтобы бот получал уведомления о callback (кнопка "Я подписался")**

**Выполните curl команду (замените на свои данные):**

```bash
curl -X POST https://api.telegram.org/bot<BOT_TOKEN>/setWebhook \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://ваш-проект.supabase.co/functions/v1/telegram-webhook"
  }'
```

**Пример:**
```bash
curl -X POST https://api.telegram.org/bot123456789:ABCdefGHIjklMNOpqrsTUVwxyz/setWebhook \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://abcdefgh.supabase.co/functions/v1/telegram-webhook"
  }'
```

**Ответ должен быть:**
```json
{
  "ok": true,
  "result": true,
  "description": "Webhook was set"
}
```

**✅ Проверка webhook:**
```bash
curl https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo
```

Должно показать ваш URL.

---

## ⏰ ЭТАП 9: Настройка периодической проверки (Cron)

### Вариант 1: Supabase pg_cron (рекомендуется)

**Шаг 1:** В Supabase перейдите в **SQL Editor**

**Шаг 2:** Создайте новый query и выполните:

```sql
-- Включить расширение pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Создать cron job (каждое воскресенье в 00:00 UTC)
SELECT cron.schedule(
  'check-subscriptions-weekly',
  '0 0 * * 0',
  $$
  SELECT
    net.http_post(
      url := 'https://ваш-проект.supabase.co/functions/v1/cron-check-subscriptions',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ваш-CRON_SECRET'
      ),
      body := jsonb_build_object()
    ) AS request_id;
  $$
);
```

**Замените:**
- `https://ваш-проект.supabase.co` на ваш Supabase URL
- `ваш-CRON_SECRET` на ваш CRON_SECRET из секретов

**✅ Проверка:**
```sql
SELECT * FROM cron.job;
```

Должен появиться ваш job.

---

### Вариант 2: GitHub Actions Cron

**Создайте файл:** `.github/workflows/check-subscriptions.yml`

```yaml
name: Check Subscriptions

on:
  schedule:
    - cron: '0 0 * * 0' # каждое воскресенье
  workflow_dispatch: # можно запускать вручную

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - name: Call Supabase Function
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            ${{ secrets.SUPABASE_URL }}/functions/v1/cron-check-subscriptions
```

**Добавьте secret `CRON_SECRET` в GitHub Secrets (если ещё не добавили)**

---

## ✅ ЭТАП 10: Тестирование

### 10.1 Тест авторизации (Web)

**Шаг 1:** Откройте ваше приложение:
```
https://ваш-username.github.io/habbiter/
```

**Шаг 2:** Нажмите кнопку "Войти через Telegram"

**Шаг 3:** Telegram откроется (или web.telegram.org)

**Шаг 4:** Подтвердите авторизацию

**Шаг 5:** Должен произойти редирект:
- Если вы подписаны на канал → `/habits`
- Если не подписаны → `/subscribe`

**✅ Если всё работает — отлично!**

---

### 10.2 Тест проверки подписки

**Шаг 1:** Если вы не подписаны, откроется страница `/subscribe`

**Шаг 2:** Нажмите "Подписаться на канал"

**Шаг 3:** Подпишитесь в Telegram

**Шаг 4:** Вернитесь в приложение

**Шаг 5:** Нажмите "Я подписался"

**Шаг 6:** Должен произойти редирект на `/habits`

**✅ Готово!**

---

### 10.3 Тест отписки

**Шаг 1:** Отпишитесь от канала в Telegram

**Шаг 2:** Подождите до следующего воскресенья (когда запустится cron)

**Или запустите cron вручную:**

**Через SQL:**
```sql
SELECT cron.schedule(
  'test-check-now',
  '* * * * *', -- каждую минуту (только для теста!)
  $$
  SELECT
    net.http_post(
      url := 'https://ваш-проект.supabase.co/functions/v1/cron-check-subscriptions',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ваш-CRON_SECRET'
      ),
      body := jsonb_build_object()
    ) AS request_id;
  $$
);
```

**Шаг 3:** Через минуту обновите страницу

**Шаг 4:** Должен произойти редирект на `/subscribe`

**Шаг 5:** В Telegram должно прийти сообщение от бота

**Шаг 6:** Удалите тестовый cron:
```sql
SELECT cron.unschedule('test-check-now');
```

**✅ Всё работает!**

---

## 📝 ЭТАП 11: Финальный чеклист

### Telegram:
- [x] Бот создан (@habbiter_bot)
- [x] Bot Token сохранён
- [x] Login Widget настроен (setdomain)
- [x] Mini App создано
- [x] Канал создан (@habbiter_channel)
- [x] Бот добавлен администратором канала

### Supabase:
- [x] Проект создан
- [x] База данных настроена (таблицы, RLS)
- [x] API ключи получены
- [x] Секреты добавлены (Vault)
- [x] Edge Functions созданы и задеплоены
- [x] pg_cron настроен (или GitHub Actions Cron)

### GitHub:
- [x] Репозиторий создан
- [x] GitHub Secrets настроены
- [x] GitHub Pages включён
- [x] GitHub Actions работает
- [x] Приложение задеплоено

### Тестирование:
- [x] Авторизация через Telegram работает
- [x] Проверка подписки работает
- [x] Отписка детектится
- [x] Уведомления приходят

---

## 🆘 Troubleshooting (Решение проблем)

### Проблема 1: "Invalid hash" при авторизации

**Причина:** Неправильная проверка hash в Edge Function

**Решение:**
1. Проверьте что `TELEGRAM_BOT_TOKEN` правильный в Supabase Secrets
2. Проверьте что в Edge Function используется правильный алгоритм HMAC-SHA256
3. Перезапустите функцию: `supabase functions deploy telegram-auth`

---

### Проблема 2: "403 Forbidden" при проверке подписки

**Причина:** Бот не администратор канала

**Решение:**
1. Зайдите в канал
2. Administrators → Add Administrator
3. Добавьте бота с правами "Manage Channel"

---

### Проблема 3: GitHub Actions падает с ошибкой

**Причина:** Неправильные secrets или ошибка в коде

**Решение:**
1. Зайдите в Actions → кликните на failed workflow
2. Посмотрите логи
3. Проверьте что все GitHub Secrets добавлены правильно
4. Проверьте что в `vite.config.ts` указан правильный `base`

---

### Проблема 4: Приложение не загружается на GitHub Pages

**Причина:** Неправильный base path

**Решение:**
В `vite.config.ts` должно быть:
```typescript
export default defineConfig({
  base: '/habbiter/', // название репозитория
})
```

---

### Проблема 5: Edge Function не вызывается

**Причина:** Неправильный URL или CORS

**Решение:**
1. Проверьте URL функции в Supabase Dashboard
2. Проверьте что функция задеплоена: `supabase functions list`
3. Проверьте логи: `supabase functions logs telegram-auth`

---

### Проблема 6: RLS блокирует доступ к данным

**Причина:** Неправильные политики RLS

**Решение:**
1. Проверьте что пользователь авторизован (есть auth.uid())
2. Проверьте политики в Supabase → Table Editor → RLS
3. Временно отключите RLS для дебага (НЕ на продакшене!)

---

## 📚 Полезные ссылки

### Документация:
- [Supabase Docs](https://supabase.com/docs)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Telegram Login Widget](https://core.telegram.org/widgets/login)
- [GitHub Pages](https://docs.github.com/en/pages)
- [Vite](https://vitejs.dev/)

### Инструменты:
- [Supabase Dashboard](https://app.supabase.com)
- [GitHub Actions](https://github.com/features/actions)
- [Telegram @BotFather](https://t.me/BotFather)

---

## 🎉 Готово!

Теперь у вас полностью настроенная инфраструктура для Habbiter!

**Следующие шаги:**
1. Передать финальное ТЗ LLM агенту для написания кода
2. После получения кода — деплой
3. Тестирование
4. Запуск! 🚀

**Удачи с проектом!** 💪

---

*Инструкция создана: 03.01.2025*
*Версия: 1.0*
