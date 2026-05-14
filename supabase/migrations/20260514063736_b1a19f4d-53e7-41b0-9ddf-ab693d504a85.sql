DROP POLICY IF EXISTS "Anyone can view site settings" ON public.site_settings;

CREATE POLICY "Public can view non-sensitive site settings"
ON public.site_settings
FOR SELECT
USING (
  key NOT IN ('smtp', 'email_templates')
  OR has_role(auth.uid(), 'admin'::app_role)
);