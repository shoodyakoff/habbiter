-- Обновить constraints для иконок (25 новых иконок)
-- Файл: 20260104_update_habit_icons.sql

-- Удалить старый constraint
ALTER TABLE habits
  DROP CONSTRAINT IF EXISTS habits_icon_check;

-- Добавить новый constraint
ALTER TABLE habits
  ADD CONSTRAINT habits_icon_check
  CHECK (icon IN (
    'barbell', 'book', 'bookOpen', 'bowlFood', 'brain',
    'coffee', 'drop', 'eye', 'firstAid', 'flame',
    'graduationCap', 'headphones', 'heart', 'leaf', 'lightning',
    'moon', 'musicNote', 'paintBrush', 'pill', 'plant',
    'running', 'shower', 'sun', 'target', 'yinYang'
  ));

-- Опционально: миграция старых данных (если были другие иконки)
-- UPDATE habits SET icon = 'target' WHERE icon NOT IN (
--   'barbell', 'book', 'bookOpen', 'bowlFood', 'brain',
--   'coffee', 'drop', 'eye', 'firstAid', 'flame',
--   'graduationCap', 'headphones', 'heart', 'leaf', 'lightning',
--   'moon', 'musicNote', 'paintBrush', 'pill', 'plant',
--   'running', 'shower', 'sun', 'target', 'yinYang'
-- );
