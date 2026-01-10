-- Migration: Add habit_schedule_history table for tracking schedule changes
-- Date: 2026-01-10
-- Description: Creates a new table to store historical schedule data for habits.
--              This enables correct statistics calculation when users change their habit schedules.
--              Current schedule remains in habits table for fast access.

-- ============================================================================
-- STEP 1: Create habit_schedule_history table
-- ============================================================================

CREATE TABLE IF NOT EXISTS habit_schedule_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,

  -- Schedule settings that were in effect
  frequency TEXT NOT NULL,
  repeat_days INTEGER[], -- ISO-8601: 1=Monday, 7=Sunday

  -- Period of validity
  effective_from TIMESTAMPTZ NOT NULL,
  effective_until TIMESTAMPTZ, -- NULL = "currently in effect"

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT check_frequency CHECK (frequency IN ('daily', 'specific_days')),
  CONSTRAINT check_dates CHECK (effective_until IS NULL OR effective_from < effective_until)
);

-- ============================================================================
-- STEP 2: Create indexes
-- ============================================================================

-- Index for fast lookup by date range
CREATE INDEX IF NOT EXISTS idx_habit_schedule_history_lookup
  ON habit_schedule_history(habit_id, effective_from DESC, effective_until);

-- ============================================================================
-- STEP 3: Enable Row Level Security (RLS)
-- ============================================================================

ALTER TABLE habit_schedule_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own habit schedules
CREATE POLICY "Users can view own habit schedules"
  ON habit_schedule_history FOR SELECT
  USING (
    habit_id IN (
      SELECT id FROM habits WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can manage their own habit schedules
CREATE POLICY "Users can manage own habit schedules"
  ON habit_schedule_history FOR ALL
  USING (
    habit_id IN (
      SELECT id FROM habits WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- STEP 4: Update habits table (add defaults and constraints)
-- ============================================================================

-- Set default value for frequency
ALTER TABLE habits
  ALTER COLUMN frequency SET DEFAULT 'daily';

-- Update existing NULL values to 'daily'
UPDATE habits
SET frequency = 'daily'
WHERE frequency IS NULL;

-- Update existing NULL repeat_days to empty array
UPDATE habits
SET repeat_days = ARRAY[]::INTEGER[]
WHERE repeat_days IS NULL;

-- Add constraint for frequency (only if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'habits_check_frequency'
  ) THEN
    ALTER TABLE habits
      ADD CONSTRAINT habits_check_frequency CHECK (frequency IN ('daily', 'specific_days'));
  END IF;
END
$$;

-- ============================================================================
-- STEP 5: Migrate existing data to history
-- ============================================================================

-- Copy current schedule state as the first historical record
INSERT INTO habit_schedule_history (habit_id, frequency, repeat_days, effective_from)
SELECT
  id,
  COALESCE(frequency, 'daily'),
  COALESCE(repeat_days, ARRAY[]::INTEGER[]),
  created_at -- Schedule has been in effect since habit creation
FROM habits
ON CONFLICT DO NOTHING; -- Safety: skip if already exists

-- ============================================================================
-- VERIFICATION QUERIES (for manual testing)
-- ============================================================================

-- Uncomment to verify migration results:
-- SELECT COUNT(*) as total_habits FROM habits;
-- SELECT COUNT(*) as total_history_records FROM habit_schedule_history;
-- SELECT frequency, COUNT(*) FROM habits GROUP BY frequency;
