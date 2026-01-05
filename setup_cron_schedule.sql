-- Setup cron schedule for weekly subscription check
-- Run this script to configure the cron job

-- First, check if pg_cron is enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create cron_execution_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS cron_execution_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_name TEXT NOT NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT, -- 'success', 'error', 'partial_success'
  result JSONB,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_cron_logs_executed_at ON cron_execution_logs(executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_cron_logs_job_name ON cron_execution_logs(job_name);

-- Enable RLS for cron_execution_logs
ALTER TABLE cron_execution_logs ENABLE ROW LEVEL SECURITY;

-- Drop policy if exists and recreate
DROP POLICY IF EXISTS "Service role can manage cron logs" ON cron_execution_logs;
CREATE POLICY "Service role can manage cron logs"
  ON cron_execution_logs FOR ALL
  USING (true);

-- Remove existing cron job if exists
SELECT cron.unschedule('weekly-subscription-check') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'weekly-subscription-check'
);

-- Schedule the weekly subscription check
-- Replace YOUR_PROJECT_URL with your actual Supabase project URL
-- Replace YOUR_SERVICE_ROLE_KEY with your actual service role key
SELECT cron.schedule(
  'weekly-subscription-check',
  '0 0 * * 1', -- Every Monday at 00:00 UTC
  $$
  SELECT net.http_post(
    url := 'https://gdwuluiqoectlwdzbiar.supabase.co/functions/v1/cron-check-subscriptions',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    )
  );
  $$
);

-- Verify the cron job was created
SELECT * FROM cron.job WHERE jobname = 'weekly-subscription-check';
