-- Fix cron schedule to use correct service role key
-- Replace YOUR_SERVICE_ROLE_KEY with your actual service role key from Dashboard → Settings → API

-- First, remove the existing job
SELECT cron.unschedule('weekly-subscription-check');

-- Recreate with correct service role key (hardcoded)
SELECT cron.schedule(
  'weekly-subscription-check',
  '0 0 * * 1', -- Every Monday at 00:00 UTC
  $$
  SELECT net.http_post(
    url := 'https://gdwuluiqoectlwdzbiar.supabase.co/functions/v1/cron-check-subscriptions',
    headers := jsonb_build_object(
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY_HERE'
    )
  );
  $$
);

-- Verify the updated cron job
SELECT jobid, schedule, command, active, jobname FROM cron.job WHERE jobname = 'weekly-subscription-check';
