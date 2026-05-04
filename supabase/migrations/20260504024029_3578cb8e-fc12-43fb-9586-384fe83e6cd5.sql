-- 1) handle_new_user: also store phone if provided
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, phone)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NULLIF(NEW.raw_user_meta_data ->> 'phone', '')
  );
  RETURN NEW;
END;
$function$;

-- 2) notify_admins: store event_type as notification.type so per-type push toggle (admin_notifications) is consulted by on_notification_push trigger.
CREATE OR REPLACE FUNCTION public.notify_admins(_event_type text, _title text, _message text, _link text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _settings jsonb;
  _entry jsonb;
  _inapp_enabled boolean := true;
BEGIN
  SELECT value INTO _settings FROM public.site_settings WHERE key = 'admin_notifications';

  IF _settings IS NOT NULL THEN
    _entry := _settings -> _event_type;
    IF _entry IS NOT NULL THEN
      IF jsonb_typeof(_entry) = 'object' THEN
        _inapp_enabled := COALESCE((_entry ->> 'inapp')::boolean, true);
      ELSE
        _inapp_enabled := (_settings ->> _event_type) <> 'false';
      END IF;
    END IF;
  END IF;

  IF NOT _inapp_enabled THEN
    RETURN;
  END IF;

  INSERT INTO public.notifications (user_id, title, message, type, link)
  SELECT ur.user_id, _title, _message, _event_type, _link
  FROM public.user_roles ur WHERE ur.role IN ('admin'::public.app_role, 'moderator'::public.app_role);
END;
$function$;