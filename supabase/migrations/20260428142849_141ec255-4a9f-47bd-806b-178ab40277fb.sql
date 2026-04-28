
-- Add presence_state column to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS presence_state text NOT NULL DEFAULT 'offline';

CREATE INDEX IF NOT EXISTS idx_profiles_presence ON public.profiles(presence_state, last_seen);

-- Update on_notification_push trigger to respect per-type push toggle and skip when user is active
CREATE OR REPLACE FUNCTION public.on_notification_push()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _url text;
  _key text;
  _email_enabled boolean := true;
  _is_active boolean := false;
  _is_online boolean := false;
  _email_body text;
  _settings jsonb;
  _type_setting jsonb;
  _push_enabled boolean := true;
  _notif_type_key text;
BEGIN
  SELECT decrypted_secret INTO _url FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL' LIMIT 1;
  SELECT decrypted_secret INTO _key FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY' LIMIT 1;

  -- Map notification type to admin settings key
  -- NEW.type values include: admin, moderation, message, info, gift, admin_alert, saved_search, stock_alert
  -- For admin/moderation channel notifications use the original event keys (new_listing, new_store etc.)
  -- We try to infer from message content / link, but easiest: respect the bare 'type' if a settings key exists.
  _notif_type_key := COALESCE(NEW.type, 'info');

  -- Read admin notification settings
  SELECT value INTO _settings FROM public.site_settings WHERE key = 'admin_notifications';
  IF _settings IS NOT NULL THEN
    _type_setting := _settings -> _notif_type_key;
    -- Backward compatible: settings can be boolean string OR object {inapp,push}
    IF _type_setting IS NOT NULL THEN
      IF jsonb_typeof(_type_setting) = 'object' THEN
        _push_enabled := COALESCE((_type_setting ->> 'push')::boolean, true);
      ELSE
        -- legacy string 'true'/'false' = inapp toggle, push defaults to true
        _push_enabled := true;
      END IF;
    END IF;
  END IF;

  -- Email enabled per user
  SELECT COALESCE(p.email_notifications, true) INTO _email_enabled
  FROM public.profiles p WHERE p.user_id = NEW.user_id LIMIT 1;

  -- Active = app open & visible (last 30s with presence_state='active')
  SELECT EXISTS(
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = NEW.user_id
      AND p.presence_state = 'active'
      AND p.last_seen IS NOT NULL
      AND p.last_seen > (now() - interval '30 seconds')
  ) INTO _is_active;

  -- Online (for email gating, 2 min)
  SELECT EXISTS(
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = NEW.user_id
      AND p.last_seen IS NOT NULL
      AND p.last_seen > (now() - interval '2 minutes')
  ) INTO _is_online;

  _email_body := trim(BOTH E'\n' FROM concat_ws(E'\n\n',
    NULLIF(COALESCE(NEW.message, ''), ''),
    CASE WHEN NEW.link IS NOT NULL AND NEW.link <> '' THEN 'Bölmə: ' || NEW.link ELSE NULL END
  ));

  IF _url IS NOT NULL AND _key IS NOT NULL THEN
    -- Push: only if admin enabled push for this type AND user is NOT actively viewing the app
    IF _push_enabled AND NOT _is_active THEN
      BEGIN
        PERFORM net.http_post(
          url := _url || '/functions/v1/send-user-push',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || _key
          ),
          body := jsonb_build_object(
            'user_id', NEW.user_id,
            'title', NEW.title,
            'body', COALESCE(NEW.message, ''),
            'link', COALESCE(NEW.link, '/'),
            'notification_type', _notif_type_key
          ),
          timeout_milliseconds := 30000
        );
      EXCEPTION WHEN OTHERS THEN
        RAISE LOG 'Push dispatch failed for notification %: %', NEW.id, SQLERRM;
      END;
    END IF;

    -- Email: only if offline > 2m and user opted-in
    IF _email_enabled AND NOT _is_online THEN
      BEGIN
        PERFORM net.http_post(
          url := _url || '/functions/v1/send-email',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || _key
          ),
          body := jsonb_build_object(
            'to_user_id', NEW.user_id,
            'subject', COALESCE(NEW.title, 'Yeni bildiriş'),
            'body', CASE WHEN _email_body IS NULL OR _email_body = '' THEN COALESCE(NEW.title, 'Yeni bildiriş') ELSE _email_body END
          ),
          timeout_milliseconds := 30000
        );
      EXCEPTION WHEN OTHERS THEN
        RAISE LOG 'Email dispatch failed for notification %: %', NEW.id, SQLERRM;
      END;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
