-- Миграция существующих hex-цветов в названия цветов
-- КРИТИЧНО: ДОЛЖНА выполниться ПЕРЕД добавлением constraints
-- Файл: 20260104_migrate_habit_colors_data.sql

-- Шаг 1: Создать backup для возможности отката
CREATE TEMP TABLE IF NOT EXISTS habits_color_backup AS
SELECT id, color FROM habits WHERE color NOT IN (
    'crimson', 'ruby', 'coral', 'rose',
    'amber', 'gold', 'terracotta', 'peach',
    'emerald', 'jade', 'sage', 'mint',
    'sapphire', 'turquoise', 'teal', 'cerulean',
    'amethyst', 'lavender', 'plum', 'orchid'
);

-- Шаг 2: Обновить записи (маппинг старых hex-цветов на новые названия)
UPDATE habits
SET color = CASE UPPER(color)
  WHEN '#EF4444' THEN 'crimson'      -- Red → crimson
  WHEN '#F97316' THEN 'coral'        -- Orange → coral
  WHEN '#F59E0B' THEN 'gold'         -- Amber → gold
  WHEN '#10B981' THEN 'emerald'      -- Green → emerald
  WHEN '#14B8A6' THEN 'turquoise'    -- Teal → turquoise
  WHEN '#3B82F6' THEN 'sapphire'     -- Blue → sapphire
  WHEN '#6366F1' THEN 'amethyst'     -- Indigo → amethyst
  WHEN '#8B5CF6' THEN 'plum'         -- Violet → plum
  WHEN '#EC4899' THEN 'rose'         -- Pink → rose
  WHEN '#6B7280' THEN 'sage'         -- Gray → sage
  ELSE 'sapphire'                    -- Fallback для всех остальных невалидных значений
END
WHERE color NOT IN (
    'crimson', 'ruby', 'coral', 'rose',
    'amber', 'gold', 'terracotta', 'peach',
    'emerald', 'jade', 'sage', 'mint',
    'sapphire', 'turquoise', 'teal', 'cerulean',
    'amethyst', 'lavender', 'plum', 'orchid'
);

-- Шаг 3: Проверка успешности миграции
DO $$
DECLARE
  invalid_count INTEGER;
  updated_count INTEGER;
BEGIN
  -- Проверяем, остались ли невалидные цвета
  SELECT COUNT(*) INTO invalid_count
  FROM habits
  WHERE color NOT IN (
    'crimson', 'ruby', 'coral', 'rose',
    'amber', 'gold', 'terracotta', 'peach',
    'emerald', 'jade', 'sage', 'mint',
    'sapphire', 'turquoise', 'teal', 'cerulean',
    'amethyst', 'lavender', 'plum', 'orchid'
  );

  -- Считаем сколько записей обновили
  SELECT COUNT(*) INTO updated_count
  FROM habits_color_backup;

  IF invalid_count > 0 THEN
    RAISE EXCEPTION 'Migration failed: % habits still have invalid colors', invalid_count;
  END IF;

  RAISE NOTICE 'Migration successful: % habits converted', updated_count;
  RAISE NOTICE 'All habits now use color names (crimson, ruby, coral, etc.)';
END $$;
