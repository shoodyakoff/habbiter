-- Обновить constraints для иконок (25 новых иконок)
-- Файл: 20260104_update_habit_icons.sql

-- Шаг 1: Миграция старых данных (если были другие иконки)
-- Приводим все невалидные иконки к 'target'
UPDATE habits
SET icon = 'target'
WHERE icon NOT IN (
    'barbell', 'book', 'bookOpen', 'bowlFood', 'brain',
    'coffee', 'drop', 'eye', 'firstAid', 'flame',
    'graduationCap', 'headphones', 'heart', 'leaf', 'lightning',
    'moon', 'musicNote', 'paintBrush', 'pill', 'plant',
    'running', 'shower', 'sun', 'target', 'yinYang'
);

-- Шаг 2: Удалить старый constraint
ALTER TABLE habits
  DROP CONSTRAINT IF EXISTS habits_icon_check;

-- Шаг 3: Добавить новый constraint
ALTER TABLE habits
  ADD CONSTRAINT habits_icon_check
  CHECK (icon IN (
    'barbell', 'book', 'bookOpen', 'bowlFood', 'brain',
    'coffee', 'drop', 'eye', 'firstAid', 'flame',
    'graduationCap', 'headphones', 'heart', 'leaf', 'lightning',
    'moon', 'musicNote', 'paintBrush', 'pill', 'plant',
    'running', 'shower', 'sun', 'target', 'yinYang'
  ));

-- Шаг 4: Проверка
DO $$
BEGIN
  RAISE NOTICE 'Icon migration completed successfully';
  RAISE NOTICE 'All habits now use one of the 25 allowed icons';
END $$;
