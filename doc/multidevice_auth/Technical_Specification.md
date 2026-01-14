# Поддержка мульти-девайс авторизации — Техническое задание

**Дата:** 2026-01-13

---

## Связанные документы
- **Проектирование:** Design.md
- **Бизнес-требования:** Business_Requirements.md

## История изменений
- 2026-01-13 - Документ создан
- 2026-01-13 - Добавлена секция с проверкой настроек Supabase и детальный flow кода

---

## Задача: Оптимизация авторизации для поддержки нескольких устройств

### Описание
Необходимо рефакторить логику авторизации в Edge Functions, чтобы устранить создание лишних сессий и избыточные обновления пользователя, которые приводят к сбросу авторизации на других устройствах.

---

## Шаг 0: Проверка настроек Supabase (КРИТИЧНО!)

**Перед началом рефакторинга необходимо проверить настройки Auth в Supabase Dashboard:**

### Где проверить
Откройте Supabase Dashboard и перейдите по пути:
```
Dashboard → Authentication → Sessions
```
Или прямая ссылка: `https://supabase.com/dashboard/project/<your-project-id>/auth/sessions`

### Что проверить

1. **"Single session per user"** - ДОЛЖНА БЫТЬ **ВЫКЛЮЧЕНА (disabled)**
   - Если включена, то последний вход будет автоматически завершать предыдущие сессии
   - Это объясняет текущую проблему с разлогиниванием

2. **"Session Inactivity Timeout"** - рекомендуется оставить по умолчанию или достаточно большим значением

3. **"Maximum Session Duration"** - рекомендуется оставить по умолчанию

4. **JWT expiration time** (в Advanced Settings):
   - По умолчанию: 3600 секунд (1 час)
   - Минимум рекомендованный: 300 секунд (5 минут)
   - Важно: сессии проверяются только при истечении JWT, не раньше

### Важная информация о поведении

Согласно [официальной документации](https://supabase.com/docs/guides/auth/sessions):

> Sessions are not proactively destroyed when you change these settings, but rather the check is enforced whenever a session is refreshed next.

Это значит, что даже после изменения настроек, эффект будет виден только после истечения текущего JWT токена.

### Дополнительная проверка через SQL

Можно проверить количество активных сессий у пользователя:
```sql
SELECT
  u.email,
  COUNT(s.id) as active_sessions
FROM auth.users u
LEFT JOIN auth.sessions s ON s.user_id = u.id
GROUP BY u.id, u.email
HAVING COUNT(s.id) > 1;
```

---

## Что сделать (в порядке приоритета)

**Порядок рефакторинга критически важен!**

1. Рефакторинг `supabase/functions/telegram-auth/index.ts` (ПРИОРИТЕТ 1 - основная функция)
2. Рефакторинг `supabase/functions/telegram-auth-miniapp/index.ts` (ПРИОРИТЕТ 2)
3. Рефакторинг `supabase/functions/telegram-webhook/index.ts` (ПРИОРИТЕТ 3 - функция `authorizeUser`)
4. Рефакторинг `supabase/functions/generate-auth-token/index.ts` (ПРИОРИТЕТ 4 - action `poll`)

**Стратегия внедрения:** Рефакторить по одной функции, тестировать, коммитить. Не менять все сразу.

---

## Требования

### Общая логика авторизации (для всех функций)

Вместо текущей последовательности действий реализовать следующий алгоритм:

#### 1. Поиск пользователя через таблицу (НЕ через Auth API!)

```typescript
const { data: existingUser } = await supabase
  .from('users')
  .select('id')
  .eq('telegram_id', telegramId)
  .single()

let userId = existingUser?.id
```

**Почему так:** Избегаем лишнего вызова `signInWithPassword` только для получения ID.

#### 2. Создание пользователя (если не найден)

```typescript
if (!userId) {
  const { data: createdUser, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { telegram_id: telegramId }
  })

  if (createError) {
    // Если ошибка "User already exists" - значит рассинхрон между auth.users и public.users
    if (createError.message.includes('already exists')) {
      // Fallback: попробовать найти через signIn (только в крайнем случае)
      const { data: signInData } = await supabase.auth.signInWithPassword({ email, password })
      userId = signInData?.user?.id
    } else {
      throw createError
    }
  } else {
    userId = createdUser.user.id
  }
}
```

**Важно:** Fallback на `signInWithPassword` нужен только для recovery рассинхрона. В нормальной ситуации этот код не выполняется.

#### 3. Условное обновление метаданных (КРИТИЧНО!)

```typescript
// Получаем текущие метаданные
const { data: { user } } = await supabase.auth.admin.getUserById(userId)

// Обновляем ТОЛЬКО если изменилось
if (user.app_metadata?.is_subscribed !== isSubscribed) {
  await supabase.auth.admin.updateUserById(userId, {
    app_metadata: { is_subscribed: isSubscribed }
  })
}
```

**Почему так:** Каждый вызов `updateUserById` может провоцировать инвалидацию refresh tokens через Refresh Token Rotation. Обновляем только при реальном изменении.

#### 4. Обновление таблицы public.users

```typescript
await supabase
  .from('users')
  .upsert({
    id: userId,
    telegram_id: telegramId,
    username,
    first_name,
    last_name,
    photo_url,
    is_subscribed: isSubscribed,
    subscription_checked_at: new Date().toISOString(),
    subscription_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    last_login_at: new Date().toISOString()
  }, { onConflict: 'telegram_id' })
```

#### 5. Создание сессии (ОДИН РАЗ!)

```typescript
// Единственный вызов signInWithPassword в конце
const { data: sessionData, error: sessionError } = await supabase.auth.signInWithPassword({
  email,
  password
})

if (sessionError) throw sessionError

return sessionData.session
```

**Почему так:** Каждый `signInWithPassword` создает новую сессию. Нам нужна только одна.

---

### Блок-схема правильного flow

```
┌─────────────────────────────────────┐
│ 1. Поиск в public.users             │
│    по telegram_id                   │
└──────────────┬──────────────────────┘
               │
               ▼
        ┌──────┴──────┐
        │ Найден?     │
        └──────┬──────┘
         Нет   │   Да
     ┌─────────┴─────────┐
     ▼                   ▼
┌────────────┐     ┌──────────────┐
│ 2. Создать │     │ userId = id  │
│ через      │     └──────┬───────┘
│ createUser │            │
└─────┬──────┘            │
      │                   │
      └─────────┬─────────┘
                ▼
     ┌──────────────────────┐
     │ 3. Получить текущие  │
     │    метаданные через  │
     │    getUserById       │
     └──────────┬───────────┘
                ▼
     ┌──────────────────────┐
     │ is_subscribed        │
     │ изменился?           │
     └──────┬───────────────┘
       Да   │   Нет
     ┌──────┴──────┐   │
     ▼             │   │
┌────────────┐     │   │
│ updateUser │     │   │
│ ById       │     │   │
└─────┬──────┘     │   │
      └────────┬───┴───┘
               ▼
     ┌─────────────────────┐
     │ 4. Upsert в         │
     │    public.users     │
     └──────────┬──────────┘
                ▼
     ┌─────────────────────┐
     │ 5. signInWithPass   │
     │    (ОДИН РАЗ)       │
     └──────────┬──────────┘
                ▼
     ┌─────────────────────┐
     │ Вернуть session     │
     └─────────────────────┘
```

### Детали реализации по файлам

#### Файл 1: `telegram-auth/index.ts` (ПРИОРИТЕТ 1)

**Текущие проблемы:**
- Строки 64-72: Лишний `signInWithPassword` для получения ID
- Строка 96: Безусловный `updateUserById` при каждом входе
- Строки 101-104: Второй `signInWithPassword`

**Что изменить:**
1. Заменить блок строк 62-72 на поиск через `public.users`
2. Добавить условие перед `updateUserById` (строка 96)
3. Оставить только один финальный `signInWithPassword` (строки 101-104)

**Эталонный код:**
```typescript
// Вместо строк 62-72
const { data: existingUser } = await supabase
  .from('users')
  .select('id')
  .eq('telegram_id', data.id)
  .single()

let userId = existingUser?.id

if (!userId) {
  const { data: createdUser, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { telegram_id: data.id }
  })

  if (createError && createError.message.includes('already exists')) {
    // Рассинхрон - fallback
    const { data: signInData } = await supabase.auth.signInWithPassword({ email, password })
    userId = signInData?.user?.id
  } else if (createError) {
    throw createError
  } else {
    userId = createdUser.user.id
  }
}

// ... upsert в public.users (строки 75-88) - оставить как есть ...

// Вместо строк 96-98 (безусловный updateUserById)
const { data: { user } } = await supabase.auth.admin.getUserById(userId)
if (user.app_metadata?.is_subscribed !== isSubscribed) {
  await supabase.auth.admin.updateUserById(userId, {
    app_metadata: { is_subscribed: isSubscribed }
  })
}

// Строки 101-104 оставить как есть (финальный signIn)
```

---

#### Файл 2: `telegram-auth-miniapp/index.ts` (ПРИОРИТЕТ 2)

**Аналогичные изменения** как в `telegram-auth/index.ts`:
- Убрать строки 62-70 (лишний signIn)
- Заменить на поиск через `public.users`
- Добавить условие перед `updateUserById` (строка 94)

---

#### Файл 3: `telegram-webhook/index.ts` - функция `authorizeUser` (ПРИОРИТЕТ 3)

**Текущие проблемы:**
- Строка 173: Лишний `signInWithPassword` (сессия здесь не нужна!)
- Строка 189: Безусловный `updateUserById`

**Что изменить:**

```typescript
// Строки 164-175: Заменить на поиск через public.users
const { data: existingUser } = await supabase
  .from('users')
  .select('id')
  .eq('telegram_id', userId)
  .single()

let authUserId = existingUser?.id

if (!authUserId) {
  const { data: createdUser, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { telegram_id: userId }
  })

  if (createError && createError.message.includes('already exists')) {
    // Рассинхрон - используем admin API для поиска
    const { data: { users } } = await supabase.auth.admin.listUsers()
    const foundUser = users.find(u => u.email === email)
    authUserId = foundUser?.id
  } else if (createError) {
    throw createError
  } else {
    authUserId = createdUser.user.id
  }
}

// УБРАТЬ строки 173-175 полностью! (signInWithPassword не нужен в webhook)

// ... upsert в public.users (строки 179-186) - оставить ...

// Строки 189-192: Добавить условие
const { data: { user } } = await supabase.auth.admin.getUserById(authUserId)
if (user.app_metadata?.is_subscribed !== isSubscribed) {
  await supabase.auth.admin.updateUserById(authUserId, {
    app_metadata: { is_subscribed: isSubscribed }
  })
}
```

**Почему убираем signIn:** В webhook мы только подготавливаем пользователя и помечаем токен как `success`. Реальная сессия создается позже в `generate-auth-token` при polling.

---

#### Файл 4: `generate-auth-token/index.ts` (ПРИОРИТЕТ 4)

**Текущая ситуация:**
- Строки 59-62: Единственный вызов `signInWithPassword` когда статус = `success`
- Это правильно! Здесь изменений НЕ требуется.

**Проверить:**
- Убедиться, что нет дополнительных вызовов `updateUserById` в этой функции
- По коду (строки 1-82) - дополнительных обновлений нет ✅

---

## Критерии приемки

```gherkin
Сценарий: Одновременная работа на двух устройствах
Дано Пользователь авторизован на Телефоне (Сессия А)
Когда Пользователь авторизуется на ПК (получает Сессию Б)
Тогда Сессия Б успешно создана
И Сессия А остается активной (пользователь может обновить страницу на Телефоне и остаться в системе)
```

```gherkin
Сценарий: Отсутствие лишних обновлений
Дано Пользователь уже существует и статус подписки не изменился
Когда Пользователь авторизуется повторно
Тогда `auth.users.updated_at` не должен измениться (или метаданные не должны перезаписываться)
И Не должно создаваться более 1 новой сессии за процесс входа
```

---

## План тестирования

### Тест 1: Проверка настроек Supabase
```bash
# Выполнить SQL запрос в Supabase Dashboard → SQL Editor
SELECT
  u.email,
  COUNT(s.id) as active_sessions
FROM auth.users u
LEFT JOIN auth.sessions s ON s.user_id = u.id
WHERE u.email LIKE '%@telegram.user'
GROUP BY u.id, u.email
ORDER BY active_sessions DESC;
```

**Ожидаемый результат:** Если у пользователя > 1 сессии - это норма после фикса.

### Тест 2: Мульти-девайс авторизация (главный тест!)

**Шаги:**
1. Открыть приложение в браузере Chrome на компьютере
2. Авторизоваться через Telegram
3. Не закрывая вкладку, открыть приложение в браузере Safari на телефоне
4. Авторизоваться через Telegram на телефоне
5. Вернуться к вкладке Chrome на компьютере
6. Обновить страницу (F5)

**Ожидаемый результат:**
- ✅ Пользователь остается авторизованным на обоих устройствах
- ✅ Не требуется повторная авторизация

### Тест 3: Проверка количества сессий при входе

**До рефакторинга (текущее):**
- При входе создается 2 сессии
- Можно проверить через SQL после авторизации

**После рефакторинга:**
- При входе создается только 1 сессия

```sql
-- Выполнить ДО и ПОСЛЕ авторизации
SELECT COUNT(*) FROM auth.sessions WHERE user_id = '<user-uuid>';
```

### Тест 4: Проверка обновления метаданных

```sql
-- Посмотреть updated_at перед повторным входом
SELECT id, email, updated_at, raw_app_meta_data
FROM auth.users
WHERE email = '<test-user>@telegram.user';

-- Авторизоваться повторно с тем же статусом подписки

-- Проверить updated_at после входа
SELECT id, email, updated_at, raw_app_meta_data
FROM auth.users
WHERE email = '<test-user>@telegram.user';
```

**Ожидаемый результат:**
- Если `is_subscribed` не изменился → `updated_at` НЕ должен измениться
- Если `is_subscribed` изменился → `updated_at` обновится

---

## Откат изменений (Rollback Plan)

Если после деплоя возникают проблемы:

### Вариант 1: Откат через Git
```bash
git revert <commit-hash>
git push
```

### Вариант 2: Быстрый откат отдельной функции

Если проблема в конкретной Edge Function:
```bash
# Откатить только одну функцию
cd supabase/functions/<function-name>
git checkout HEAD~1 index.ts
supabase functions deploy <function-name>
```

### Вариант 3: Аварийное восстановление

Скопировать старый код из коммита и задеплоить вручную через Dashboard.

---

## Метрики успеха (после деплоя)

Через неделю после внедрения проверить:

1. **Количество жалоб на разлогинивание:**
   - Цель: 0 жалоб
   - Источник: обратная связь пользователей

2. **Средний lifetime сессий:**
   ```sql
   SELECT
     AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/3600) as avg_session_hours
   FROM auth.sessions
   WHERE created_at > NOW() - INTERVAL '7 days';
   ```
   - Ожидается увеличение по сравнению с текущим

3. **Количество активных сессий на пользователя:**
   ```sql
   SELECT
     AVG(session_count) as avg_sessions_per_user
   FROM (
     SELECT user_id, COUNT(*) as session_count
     FROM auth.sessions
     GROUP BY user_id
   ) subquery;
   ```
   - Ожидается: 1.5-2 (пользователи используют несколько устройств)

---

## Открытые вопросы
Нет.

## Не входит в задачу
- Изменение механизма паролей (Bot Token).
- UI управления сессиями (панель "Где я залогинен").
- Добавление возможности удаленного выхода с других устройств.

---

## Полезные ссылки

- [User sessions | Supabase Docs](https://supabase.com/docs/guides/auth/sessions)
- [Auth architecture | Supabase Docs](https://supabase.com/docs/guides/auth/architecture)
- [Refresh Token Rotation (GoTrue)](https://github.com/supabase/auth)
