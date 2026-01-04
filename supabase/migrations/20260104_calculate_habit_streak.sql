-- Function to calculate habit streak
CREATE OR REPLACE FUNCTION calculate_habit_streak(
  p_habit_id UUID,
  p_user_id UUID
) RETURNS INTEGER AS $$
DECLARE
  current_streak INTEGER := 0;
  check_date DATE := CURRENT_DATE;
  has_record BOOLEAN;
BEGIN
  -- First check if we have a record for today or yesterday
  -- If neither, streak is broken (0), unless we want to preserve streak from yesterday?
  -- Logic: If completed today -> streak includes today.
  -- If not completed today but completed yesterday -> streak is valid, continues from yesterday.
  -- If not completed today AND not completed yesterday -> streak broken (0).
  
  -- However, the loop below starts from check_date (today).
  -- If today is missing, loop continues to yesterday?
  -- No, we need strict continuity.
  
  -- Let's check the loop logic:
  -- Iteration 1: check_date = today. If exists, streak++, date--.
  -- Iteration 2: check_date = yesterday. If exists, streak++, date--.
  
  -- Case: Completed yesterday, NOT today.
  -- Iteration 1 (today): exists? False. Loop exits. Streak = 0.
  -- THIS IS WRONG. If I completed yesterday, my streak is non-zero (it's pending today).
  
  -- Fix logic:
  -- Check today. If exists, streak++. Next check yesterday.
  -- If today MISSING, check yesterday. If yesterday exists, streak++. Next check day before yesterday.
  -- If yesterday ALSO missing, streak = 0.
  
  -- Revised Logic:
  
  SELECT EXISTS (
    SELECT 1 FROM habit_records
    WHERE habit_id = p_habit_id
      AND user_id = p_user_id
      AND date = check_date
      AND completed = true
  ) INTO has_record;
  
  IF has_record THEN
    current_streak := 1;
    check_date := check_date - INTERVAL '1 day';
  ELSE
    -- Check yesterday
    check_date := check_date - INTERVAL '1 day';
     SELECT EXISTS (
      SELECT 1 FROM habit_records
      WHERE habit_id = p_habit_id
        AND user_id = p_user_id
        AND date = check_date
        AND completed = true
    ) INTO has_record;
    
    IF has_record THEN
      current_streak := 1;
      check_date := check_date - INTERVAL '1 day';
    ELSE
      RETURN 0;
    END IF;
  END IF;
  
  -- Now loop for previous days
  LOOP
    SELECT EXISTS (
      SELECT 1 FROM habit_records
      WHERE habit_id = p_habit_id
        AND user_id = p_user_id
        AND date = check_date
        AND completed = true
    ) INTO has_record;

    IF NOT has_record THEN
      EXIT;
    END IF;

    current_streak := current_streak + 1;
    check_date := check_date - INTERVAL '1 day';
  END LOOP;

  RETURN current_streak;
END;
$$ LANGUAGE plpgsql STABLE;
