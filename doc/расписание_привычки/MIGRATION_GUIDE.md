# Руководство по миграции: Добавление историчности расписаний привычек

**Дата:** 2026-01-10
**Версия миграции:** 20260110_add_habit_schedule_history

---

## Обзор

Эта миграция добавляет таблицу `habit_schedule_history` для хранения истории изменений расписания привычек. Это необходимо для корректного отображения статистики за прошлые периоды.

### Что делает миграция

1. ✅ Создает новую таблицу `habit_schedule_history`
2. ✅ Настраивает RLS (Row Level Security) политики
3. ✅ Добавляет defaults и constraints в таблицу `habits`
4. ✅ Переносит текущее состояние расписаний в историю
5. ✅ **НЕ удаляет** и **НЕ изменяет** существующие данные привычек

### Безопасность данных

- ✅ Все существующие привычки остаются без изменений
- ✅ Все `habit_records` остаются без изменений
- ✅ Миграция идемпотентна (можно запускать повторно)
- ✅ Полный откат (rollback) поддерживается

---

## Предварительные требования

1. **Доступ к Supabase Dashboard** или Supabase CLI
2. **Права администратора БД** (для выполнения миграций)
3. **Бэкап базы данных** (рекомендуется, но не обязательно для production)

---

## Способ 1: Применение через Supabase Dashboard (Рекомендуется)

### Шаг 1: Создать бэкап (опционально)

В Supabase Dashboard:
1. Перейдите в Settings → Database
2. Нажмите "Create backup" (если доступно)

### Шаг 2: Применить миграцию

1. Откройте **SQL Editor** в Supabase Dashboard
2. Скопируйте содержимое файла `supabase/migrations/20260110_add_habit_schedule_history_up.sql`
3. Вставьте в SQL Editor
4. Нажмите **Run** или **Execute**

### Шаг 3: Проверить результат

Выполните в SQL Editor:

```sql
-- Проверка создания таблицы
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'habit_schedule_history';

-- Проверка миграции данных
SELECT
  (SELECT COUNT(*) FROM habits) as total_habits,
  (SELECT COUNT(*) FROM habit_schedule_history) as total_history_records;

-- Должны совпадать: каждая привычка имеет одну запись в истории
```

Ожидаемый результат:
```
total_habits | total_history_records
-------------|----------------------
     42      |         42
```

---

## Способ 2: Применение через Supabase CLI

### Шаг 1: Установить Supabase CLI (если еще не установлен)

```bash
npm install -g supabase
```

### Шаг 2: Войти в проект

```bash
supabase login
supabase link --project-ref your-project-ref
```

### Шаг 3: Применить миграцию

```bash
supabase db push
```

Или применить конкретный файл:

```bash
psql $DATABASE_URL -f supabase/migrations/20260110_add_habit_schedule_history_up.sql
```

---

## Откат миграции (Rollback)

Если что-то пошло не так, можно откатить изменения.

### Способ 1: Через Supabase Dashboard

1. Откройте SQL Editor
2. Скопируйте содержимое файла `supabase/migrations/20260110_add_habit_schedule_history_down.sql`
3. Вставьте в SQL Editor
4. Нажмите **Run**

### Способ 2: Через psql

```bash
psql $DATABASE_URL -f supabase/migrations/20260110_add_habit_schedule_history_down.sql
```

### Что происходит при откате

- ❌ Таблица `habit_schedule_history` удаляется
- ❌ RLS политики удаляются
- ❌ Constraint `habits_check_frequency` удаляется
- ✅ Таблица `habits` остается БЕЗ ИЗМЕНЕНИЙ
- ✅ Все данные привычек сохраняются

**Важно:** После отката вы потеряете историю изменений расписаний, но текущие привычки останутся нетронутыми.

---

## Проверка корректности миграции

### Запросы для проверки

```sql
-- 1. Проверка структуры таблицы habit_schedule_history
\d habit_schedule_history

-- 2. Проверка наличия constraints
SELECT conname, contype
FROM pg_constraint
WHERE conrelid = 'habit_schedule_history'::regclass;

-- 3. Проверка RLS политик
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename = 'habit_schedule_history';

-- 4. Проверка данных
SELECT
  h.id,
  h.name,
  h.frequency as current_frequency,
  hsh.frequency as history_frequency,
  hsh.effective_from,
  hsh.effective_until
FROM habits h
LEFT JOIN habit_schedule_history hsh ON h.id = hsh.habit_id
LIMIT 5;
```

### Ожидаемые результаты

1. Таблица `habit_schedule_history` существует
2. Есть 2 constraint: `check_frequency`, `check_dates`
3. Есть 2 RLS политики: для SELECT и для ALL
4. Каждая привычка имеет минимум одну запись в истории с `effective_until = NULL`

---

## Частые проблемы и решения

### Проблема 1: "relation already exists"

**Причина:** Таблица уже была создана ранее.

**Решение:** Миграция идемпотентна, используется `IF NOT EXISTS`. Просто продолжайте.

### Проблема 2: "permission denied"

**Причина:** Недостаточно прав для создания таблицы.

**Решение:** Убедитесь, что вы вошли как администратор БД (через Supabase Dashboard или как postgres user).

### Проблема 3: Количество записей не совпадает

**Причина:** Возможно, миграция прервалась.

**Решение:**
1. Проверьте логи ошибок
2. Запустите миграцию повторно (она безопасна)
3. Или выполните откат и примените заново

---

## После применения миграции

### Обновление TypeScript типов

После применения миграции необходимо обновить TypeScript типы:

```bash
# Если используете Supabase CLI
npx supabase gen types typescript --local > src/types/database.types.ts

# Или для remote проекта
npx supabase gen types typescript --project-id your-project-ref > src/types/database.types.ts
```

### Обновление кода приложения

См. [Technical_Specification.md](Technical_Specification.md) секцию "Следующие шаги" для списка необходимых изменений в коде.

---

## Поддержка

Если возникли проблемы:

1. Проверьте логи в Supabase Dashboard → Database → Logs
2. Выполните запросы из раздела "Проверка корректности миграции"
3. Если проблема критична - выполните откат миграции
4. Создайте issue с описанием ошибки

---

## Версионность

- **Версия миграции:** 20260110
- **Зависимости:** Требуется наличие таблицы `habits` с полями `frequency` и `repeat_days`
- **Обратная совместимость:** Да (код без изменений продолжит работать, но без историчности)
