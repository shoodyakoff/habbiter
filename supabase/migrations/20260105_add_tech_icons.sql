-- Add tech icons to allowed habits icons
-- File: 20260105_add_tech_icons.sql

ALTER TABLE habits
  DROP CONSTRAINT IF EXISTS habits_icon_check;

ALTER TABLE habits
  ADD CONSTRAINT habits_icon_check
  CHECK (icon IN (
    'barbell', 'book', 'bookOpen', 'bowlFood', 'brain',
    'coffee', 'drop', 'eye', 'firstAid', 'flame',
    'graduationCap', 'headphones', 'heart', 'leaf', 'lightning',
    'moon', 'musicNote', 'paintBrush', 'pill', 'plant',
    'running', 'shower', 'sun', 'target', 'yinYang',
    'desktop', 'code', 'robot', 'cpu'
  ));
