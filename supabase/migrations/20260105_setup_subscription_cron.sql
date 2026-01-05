-- Setup weekly subscription check cron job
-- This migration configures automated subscription verification

-- Note: pg_cron might not be available on all Supabase tiers
-- Alternative: Use Supabase Edge Function Scheduler
-- Command: supabase functions deploy cron-check-subscriptions --schedule "0 0 * * 1"

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create table for cron execution logs
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

-- RLS for cron_execution_logs (admin only)
ALTER TABLE cron_execution_logs ENABLE ROW LEVEL SECURITY;

-- Service role can insert logs
CREATE POLICY "Service role can manage cron logs"
  ON cron_execution_logs FOR ALL
  USING (true);

-- Note: The actual cron schedule needs to be configured via Supabase Dashboard
-- or using pg_cron.schedule() with proper service role permissions.
--
-- If using pg_cron, the schedule should be:
-- Schedule: '0 0 * * 1' (Every Monday at 00:00 UTC)
-- Command: Call the cron-check-subscriptions edge function
--
-- Example SQL (requires elevated permissions):
-- SELECT cron.schedule(
--   'weekly-subscription-check',
--   '0 0 * * 1',
--   $$
--   SELECT net.http_post(
--     url := '<YOUR_SUPABASE_URL>/functions/v1/cron-check-subscriptions',
--     headers := jsonb_build_object(
--       'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
--     )
--   );
--   $$
-- );
--
-- IMPORTANT: For production, configure this via Supabase Dashboard > Database > Cron Jobs
-- or use the Edge Function Scheduler feature.
