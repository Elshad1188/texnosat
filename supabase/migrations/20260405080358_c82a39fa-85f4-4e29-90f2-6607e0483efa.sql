
CREATE OR REPLACE FUNCTION public.notify_admins(_event_type text, _title text, _message text, _link text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _settings jsonb;
  _admin_id uuid;
BEGIN
  SELECT value INTO _settings FROM public.site_settings WHERE key = 'admin_notifications';
  
  IF _settings IS NULL THEN
    _settings := '{}'::jsonb;
  END IF;
  
  IF (_settings->>_event_type) = 'false' THEN
    RETURN;
  END IF;
  
  -- Notify admins
  INSERT INTO public.notifications (user_id, title, message, type, link)
  SELECT ur.user_id, _title, _message, 'admin', _link
  FROM public.user_roles ur
  WHERE ur.role = 'admin';

  -- Also notify moderators
  INSERT INTO public.notifications (user_id, title, message, type, link)
  SELECT ur.user_id, _title, _message, 'moderation', _link
  FROM public.user_roles ur
  WHERE ur.role = 'moderator';
END;
$function$;

-- Allow moderators to view their own notifications (already covered by existing policy)
-- Allow moderators to insert notifications for moderation actions
CREATE POLICY "Moderators can insert notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'moderator'::app_role));

-- Allow moderators to view reports
CREATE POLICY "Moderators can view all reports"
ON public.reports
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'moderator'::app_role));

-- Allow moderators to update reports
CREATE POLICY "Moderators can update reports"
ON public.reports
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'moderator'::app_role));

-- Allow moderators to update listings (for approve/reject)
CREATE POLICY "Moderators can update listings"
ON public.listings
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'moderator'::app_role));

-- Allow moderators to view all listings
CREATE POLICY "Moderators can view all listings"
ON public.listings
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'moderator'::app_role));

-- Allow moderators to update stores
CREATE POLICY "Moderators can update stores"
ON public.stores
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'moderator'::app_role));
