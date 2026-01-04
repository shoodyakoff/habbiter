-- Safely add tracking configuration columns to habits table (only if they don't exist)
DO $$
BEGIN
    -- Add track_notes if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='habits' AND column_name='track_notes') THEN
        ALTER TABLE habits ADD COLUMN track_notes BOOLEAN DEFAULT false;
    END IF;

    -- Add track_weight if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='habits' AND column_name='track_weight') THEN
        ALTER TABLE habits ADD COLUMN track_weight BOOLEAN DEFAULT false;
    END IF;

    -- Add track_volume if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='habits' AND column_name='track_volume') THEN
        ALTER TABLE habits ADD COLUMN track_volume BOOLEAN DEFAULT false;
    END IF;

    -- Add track_count if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='habits' AND column_name='track_count') THEN
        ALTER TABLE habits ADD COLUMN track_count BOOLEAN DEFAULT false;
    END IF;

    -- Add track_duration if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='habits' AND column_name='track_duration') THEN
        ALTER TABLE habits ADD COLUMN track_duration BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Safely add value columns to habit_records table (only if they don't exist)
DO $$
BEGIN
    -- Add note if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='habit_records' AND column_name='note') THEN
        ALTER TABLE habit_records ADD COLUMN note TEXT;
    END IF;

    -- Add value_weight if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='habit_records' AND column_name='value_weight') THEN
        ALTER TABLE habit_records ADD COLUMN value_weight INTEGER;
    END IF;

    -- Add value_volume if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='habit_records' AND column_name='value_volume') THEN
        ALTER TABLE habit_records ADD COLUMN value_volume INTEGER;
    END IF;

    -- Add value_count if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='habit_records' AND column_name='value_count') THEN
        ALTER TABLE habit_records ADD COLUMN value_count INTEGER;
    END IF;

    -- Add value_duration if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='habit_records' AND column_name='value_duration') THEN
        ALTER TABLE habit_records ADD COLUMN value_duration INTEGER;
    END IF;
END $$;
