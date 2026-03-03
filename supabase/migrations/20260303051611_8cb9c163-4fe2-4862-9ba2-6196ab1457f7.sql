
-- Create site_settings table for theme customization
CREATE TABLE public.site_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid
);

-- Enable RLS
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read site settings (needed to apply theme)
CREATE POLICY "Anyone can view site settings"
ON public.site_settings FOR SELECT
USING (true);

-- Only admins can modify
CREATE POLICY "Admins can insert site settings"
ON public.site_settings FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update site settings"
ON public.site_settings FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete site settings"
ON public.site_settings FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default theme
INSERT INTO public.site_settings (key, value) VALUES ('theme', '{
  "primary_h": 24,
  "primary_s": 95,
  "primary_l": 53,
  "secondary_h": 220,
  "secondary_s": 60,
  "secondary_l": 18,
  "accent_h": 24,
  "accent_s": 80,
  "accent_l": 95,
  "background_h": 30,
  "background_s": 25,
  "background_l": 97,
  "card_h": 0,
  "card_s": 0,
  "card_l": 100,
  "radius": 0.75
}'::jsonb);
