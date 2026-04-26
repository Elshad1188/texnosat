
-- SMS Settings (singleton)
CREATE TABLE IF NOT EXISTS public.sms_settings (
  id integer PRIMARY KEY DEFAULT 1,
  provider text NOT NULL DEFAULT 'lsim',
  sender_name text NOT NULL DEFAULT 'Elan24',
  api_login text,
  api_password_secret_hint text,
  is_enabled boolean NOT NULL DEFAULT false,
  rate_limit_per_minute integer NOT NULL DEFAULT 60,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sms_settings_singleton CHECK (id = 1)
);
INSERT INTO public.sms_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

ALTER TABLE public.sms_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage sms settings" ON public.sms_settings
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- SMS Campaigns
CREATE TABLE IF NOT EXISTS public.sms_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  source_filter text NOT NULL DEFAULT 'all', -- all, registered, scraped
  category_filter text,
  region_filter text,
  total_recipients integer NOT NULL DEFAULT 0,
  sent_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE public.sms_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage sms campaigns" ON public.sms_campaigns
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- SMS Logs (per phone)
CREATE TABLE IF NOT EXISTS public.sms_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES public.sms_campaigns(id) ON DELETE CASCADE,
  phone text NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending, sent, failed
  provider_message_id text,
  error_message text,
  source text, -- registered | scraped
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_sms_logs_campaign ON public.sms_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_phone_created ON public.sms_logs(phone, created_at DESC);

ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage sms logs" ON public.sms_logs
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
