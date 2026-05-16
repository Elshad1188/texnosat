-- Enable pg_cron + pg_net schedule for weekly contest finalization
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Drop existing schedule if any
DO $$
BEGIN
  PERFORM cron.unschedule('contest_finalize_weekly');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Run every Monday 00:01 Asia/Baku (= Sunday 20:01 UTC)
SELECT cron.schedule(
  'contest_finalize_weekly',
  '1 20 * * 0',
  $$SELECT public.finalize_current_contest();$$
);