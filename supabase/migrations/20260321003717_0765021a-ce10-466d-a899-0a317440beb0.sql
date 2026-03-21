
-- Enable pg_cron and pg_net extensions for scheduled scraping
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Table to store scraper schedules
CREATE TABLE public.scraper_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  category_url text NOT NULL,
  target_category text NOT NULL,
  target_location text NOT NULL DEFAULT 'Bakı',
  scrape_limit integer NOT NULL DEFAULT 20,
  fetch_details boolean NOT NULL DEFAULT false,
  cron_expression text NOT NULL DEFAULT '0 */6 * * *',
  is_active boolean NOT NULL DEFAULT true,
  user_id uuid NOT NULL,
  last_run_at timestamptz,
  last_run_result jsonb,
  cron_job_id bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.scraper_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage scraper schedules"
  ON public.scraper_schedules FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
