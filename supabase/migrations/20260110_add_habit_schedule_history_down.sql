-- Rollback Migration: Remove habit_schedule_history table
-- Date: 2026-01-10
-- Description: Safely reverts the habit_schedule_history migration.
--              This rollback:
--              1. Drops the habit_schedule_history table (CASCADE removes policies/indexes)
--              2. Removes the constraint from habits table
--              3. Does NOT remove data from habits table - existing schedules remain intact
--
-- IMPORTANT: This is a SAFE rollback - no habit data will be lost.
--            Only the historical schedule tracking is removed.

-- ============================================================================
-- STEP 1: Drop habit_schedule_history table (CASCADE removes all dependencies)
-- ============================================================================

DROP TABLE IF EXISTS habit_schedule_history CASCADE;

-- Note: CASCADE will automatically drop:
-- - All RLS policies on the table
-- - All indexes (idx_habit_schedule_history_lookup)
-- - All constraints

-- ============================================================================
-- STEP 2: Remove constraint from habits table (if exists)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'habits_check_frequency'
  ) THEN
    ALTER TABLE habits DROP CONSTRAINT habits_check_frequency;
  END IF;
END
$$;

-- ============================================================================
-- STEP 3: (Optional) Reset defaults in habits table
-- ============================================================================

-- Remove default for frequency (if you want to restore original state)
-- Uncomment if needed:
-- ALTER TABLE habits ALTER COLUMN frequency DROP DEFAULT;

-- ============================================================================
-- NOTE: Data Preservation
-- ============================================================================

-- The following are PRESERVED during rollback:
-- 1. All habits records remain unchanged
-- 2. habits.frequency and habits.repeat_days keep their values
-- 3. All habit_records remain unchanged
--
-- What is LOST:
-- 1. Historical schedule change tracking
-- 2. Ability to see statistics with historical schedules
--
-- If you need to reapply this migration, run the _up.sql file again.

-- ============================================================================
-- VERIFICATION QUERIES (for manual testing)
-- ============================================================================

-- Uncomment to verify rollback results:
-- SELECT COUNT(*) FROM habits; -- Should remain unchanged
-- SELECT table_name FROM information_schema.tables
--   WHERE table_schema = 'public' AND table_name = 'habit_schedule_history'; -- Should return 0 rows
