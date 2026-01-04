-- Добавить constraint для валидации цветов привычек
-- КРИТИЧНО: Выполняется ПОСЛЕ миграции данных (20260104_migrate_habit_colors_data.sql)
-- Файл: 20260104_migrate_habit_colors_constraints.sql

-- Удалить старый constraint если существует
ALTER TABLE habits
  DROP CONSTRAINT IF EXISTS habits_color_check;

-- Добавить новый constraint для 20 цветов
ALTER TABLE habits
  ADD CONSTRAINT habits_color_check
  CHECK (color IN (
    -- Reds & Pinks
    'crimson', 'ruby', 'coral', 'rose',
    -- Oranges & Yellows
    'amber', 'gold', 'terracotta', 'peach',
    -- Greens
    'emerald', 'jade', 'sage', 'mint',
    -- Blues
    'sapphire', 'turquoise', 'teal', 'cerulean',
    -- Purples
    'amethyst', 'lavender', 'plum', 'orchid'
  ));

-- Проверка: попытка вставить hex-цвет должна провалиться
DO $$
BEGIN
  RAISE NOTICE 'Color constraint added successfully';
  RAISE NOTICE 'Database now only accepts 20 named colors (crimson, ruby, coral, etc.)';
  RAISE NOTICE 'Hex colors (#XXXXXX) are no longer allowed';
END $$;
