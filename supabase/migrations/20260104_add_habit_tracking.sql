-- Add tracking configuration columns to habits table
ALTER TABLE habits
ADD COLUMN track_notes BOOLEAN DEFAULT false,
ADD COLUMN track_weight BOOLEAN DEFAULT false,
ADD COLUMN track_volume BOOLEAN DEFAULT false,
ADD COLUMN track_count BOOLEAN DEFAULT false,
ADD COLUMN track_duration BOOLEAN DEFAULT false;

-- Add value columns to habit_records table
ALTER TABLE habit_records
ADD COLUMN note TEXT,
ADD COLUMN value_weight INTEGER,
ADD COLUMN value_volume INTEGER,
ADD COLUMN value_count INTEGER,
ADD COLUMN value_duration INTEGER;
