-- Safe migration to fix colors and icons without data loss where possible
-- File: 20260104_fix_habit_colors_safe.sql

-- 1. Try to recover/map any remaining hex colors (if any exist)
-- This covers common Tailwind/HTML colors that might have been used
UPDATE habits
SET color = CASE 
  -- Reds
  WHEN color ILIKE '#EF4444' OR color ILIKE '#DC2626' OR color ILIKE 'red' THEN 'crimson'
  WHEN color ILIKE '#F87171' OR color ILIKE 'lightred' THEN 'coral'
  
  -- Oranges
  WHEN color ILIKE '#F97316' OR color ILIKE '#EA580C' OR color ILIKE 'orange' THEN 'terracotta'
  WHEN color ILIKE '#FBBF24' OR color ILIKE '#D97706' OR color ILIKE 'amber' THEN 'amber'
  
  -- Yellows
  WHEN color ILIKE '#FACC15' OR color ILIKE '#CA8A04' OR color ILIKE 'yellow' THEN 'gold'
  
  -- Greens
  WHEN color ILIKE '#22C55E' OR color ILIKE '#16A34A' OR color ILIKE 'green' THEN 'emerald'
  WHEN color ILIKE '#10B981' OR color ILIKE '#059669' OR color ILIKE 'emerald' THEN 'jade'
  WHEN color ILIKE '#84CC16' OR color ILIKE '#65A30D' OR color ILIKE 'lime' THEN 'sage'
  
  -- Teals/Cyans
  WHEN color ILIKE '#14B8A6' OR color ILIKE '#0D9488' OR color ILIKE 'teal' THEN 'teal'
  WHEN color ILIKE '#06B6D4' OR color ILIKE '#0891B2' OR color ILIKE 'cyan' THEN 'turquoise'
  
  -- Blues
  WHEN color ILIKE '#3B82F6' OR color ILIKE '#2563EB' OR color ILIKE 'blue' THEN 'sapphire'
  WHEN color ILIKE '#60A5FA' OR color ILIKE 'lightblue' THEN 'cerulean'
  
  -- Indigos/Violets
  WHEN color ILIKE '#6366F1' OR color ILIKE '#4F46E5' OR color ILIKE 'indigo' THEN 'amethyst'
  WHEN color ILIKE '#8B5CF6' OR color ILIKE '#7C3AED' OR color ILIKE 'violet' THEN 'plum'
  
  -- Pinks/Purples
  WHEN color ILIKE '#EC4899' OR color ILIKE '#DB2777' OR color ILIKE 'pink' THEN 'rose'
  WHEN color ILIKE '#D946EF' OR color ILIKE '#C026D3' OR color ILIKE 'fuchsia' THEN 'orchid'
  
  -- Fallback for unknown HEX values to 'sapphire' ONLY if they are definitely not valid names
  ELSE 'sapphire'
END
WHERE color NOT IN (
    'crimson', 'ruby', 'coral', 'rose',
    'amber', 'gold', 'terracotta', 'peach',
    'emerald', 'jade', 'sage', 'mint',
    'sapphire', 'turquoise', 'teal', 'cerulean',
    'amethyst', 'lavender', 'plum', 'orchid'
);

-- 2. Fix Icons (Map old names to new names if needed, otherwise default)
UPDATE habits
SET icon = CASE 
  WHEN icon = 'check' THEN 'target'
  ELSE 'target'
END
WHERE icon NOT IN (
    'barbell', 'book', 'bookOpen', 'bowlFood', 'brain',
    'coffee', 'drop', 'eye', 'firstAid', 'flame',
    'graduationCap', 'headphones', 'heart', 'leaf', 'lightning',
    'moon', 'musicNote', 'paintBrush', 'pill', 'plant',
    'running', 'shower', 'sun', 'target', 'yinYang'
);

-- 3. Re-apply Constraints safely
DO $$
BEGIN
    -- Color Constraint
    ALTER TABLE habits DROP CONSTRAINT IF EXISTS habits_color_check;
    ALTER TABLE habits ADD CONSTRAINT habits_color_check
    CHECK (color IN (
        'crimson', 'ruby', 'coral', 'rose',
        'amber', 'gold', 'terracotta', 'peach',
        'emerald', 'jade', 'sage', 'mint',
        'sapphire', 'turquoise', 'teal', 'cerulean',
        'amethyst', 'lavender', 'plum', 'orchid'
    ));

    -- Icon Constraint
    ALTER TABLE habits DROP CONSTRAINT IF EXISTS habits_icon_check;
    ALTER TABLE habits ADD CONSTRAINT habits_icon_check
    CHECK (icon IN (
        'barbell', 'book', 'bookOpen', 'bowlFood', 'brain',
        'coffee', 'drop', 'eye', 'firstAid', 'flame',
        'graduationCap', 'headphones', 'heart', 'leaf', 'lightning',
        'moon', 'musicNote', 'paintBrush', 'pill', 'plant',
        'running', 'shower', 'sun', 'target', 'yinYang'
    ));
END $$;
