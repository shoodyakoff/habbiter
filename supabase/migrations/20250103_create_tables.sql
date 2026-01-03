-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pg_cron extension (for scheduled tasks)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- USERS Table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Telegram data
  telegram_id BIGINT UNIQUE NOT NULL,
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  photo_url TEXT,
  
  -- Subscription
  is_subscribed BOOLEAN DEFAULT false,
  subscription_checked_at TIMESTAMPTZ,
  subscription_expires_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

-- Users Indexes
CREATE INDEX idx_users_telegram_id ON users(telegram_id);
CREATE INDEX idx_users_subscription_expires ON users(subscription_expires_at);

-- Users RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own data"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON users FOR UPDATE
  USING (auth.uid() = id);


-- HABITS Table
CREATE TABLE habits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Habit data
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  
  -- Settings
  frequency TEXT DEFAULT 'daily', -- daily, specific_days, custom
  repeat_days INTEGER[], -- [1,2,3,4,5] for Mon-Fri
  
  -- Status
  status TEXT DEFAULT 'active', -- active, archived, deleted
  archived_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT habits_name_length CHECK (char_length(name) <= 50)
);

-- Habits Indexes
CREATE INDEX idx_habits_user_id ON habits(user_id);
CREATE INDEX idx_habits_status ON habits(status);

-- Habits RLS
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own habits"
  ON habits FOR ALL
  USING (user_id IN (SELECT id FROM users WHERE auth.uid() = id));


-- HABIT RECORDS Table
CREATE TABLE habit_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  habit_id UUID REFERENCES habits(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Record data
  date DATE NOT NULL,
  completed BOOLEAN DEFAULT false,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Uniqueness: one record per habit per day
  CONSTRAINT habit_records_unique UNIQUE (habit_id, date)
);

-- Habit Records Indexes
CREATE INDEX idx_habit_records_habit_id ON habit_records(habit_id);
CREATE INDEX idx_habit_records_user_id ON habit_records(user_id);
CREATE INDEX idx_habit_records_date ON habit_records(date);

-- Habit Records RLS
ALTER TABLE habit_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own records"
  ON habit_records FOR ALL
  USING (user_id IN (SELECT id FROM users WHERE auth.uid() = id));


-- SUBSCRIPTION CHECKS Table
CREATE TABLE subscription_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Check result
  is_subscribed BOOLEAN NOT NULL,
  check_method TEXT, -- 'login', 'cron', 'manual'
  status TEXT, -- 'member', 'left', 'kicked'
  error_message TEXT,
  
  -- Metadata
  checked_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscription Checks Indexes
CREATE INDEX idx_subscription_checks_user_id ON subscription_checks(user_id);

-- Subscription Checks RLS
ALTER TABLE subscription_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own checks"
  ON subscription_checks FOR SELECT
  USING (user_id IN (SELECT id FROM users WHERE auth.uid() = id));


-- CALCULATE STREAK Function
CREATE OR REPLACE FUNCTION calculate_streak(p_habit_id UUID)
RETURNS INTEGER AS $$
DECLARE
  current_streak INTEGER := 0;
  check_date DATE := CURRENT_DATE;
BEGIN
  -- Check days backwards from today
  LOOP
    IF EXISTS (
      SELECT 1 FROM habit_records
      WHERE habit_id = p_habit_id
        AND date = check_date
        AND completed = true
    ) THEN
      current_streak := current_streak + 1;
      check_date := check_date - INTERVAL '1 day';
    ELSE
      -- Check if we missed today but have yesterday (streak shouldn't reset if we just haven't done it TODAY yet?)
      -- Standard streak logic: if today is not done, check yesterday.
      -- But the loop starts at check_date = CURRENT_DATE.
      -- If today is not done, it breaks immediately returning 0?
      -- If I haven't done it today, my streak is technically still active from yesterday?
      -- The spec implementation breaks if today is missing.
      -- Let's stick to the spec implementation for now.
      EXIT;
    END IF;
  END LOOP;
  
  RETURN current_streak;
END;
$$ LANGUAGE plpgsql;
