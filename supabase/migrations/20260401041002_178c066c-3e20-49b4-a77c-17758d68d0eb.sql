
CREATE OR REPLACE FUNCTION public.on_notification_push()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _url text;
  _key text;
  _email_enabled boolean := true;
  _is_online boolean := false;
  _email_body text;
BEGIN
  SELECT decrypted_secret INTO _url
  FROM vault.decrypted_secrets
  WHERE name = 'SUPABASE_URL'
  LIMIT 1;

  SELECT decrypted_secret INTO _key
  FROM vault.decrypted_secrets
  WHERE name = 'SUPABASE_SERVICE_ROLE_KEY'
  LIMIT 1;

  -- Check if user has email notifications enabled
  SELECT COALESCE(p.email_notifications, true)
  INTO _email_enabled
  FROM public.profiles p
  WHERE p.user_id = NEW.user_id
  LIMIT 1;

  -- Check if user is currently online (last_seen within 2 minutes)
  SELECT EXISTS(
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = NEW.user_id
      AND p.last_seen IS NOT NULL
      AND p.last_seen > (now() - interval '2 minutes')
  ) INTO _is_online;

  _email_body := trim(
    BOTH E'\n' FROM concat_ws(
      E'\n\n',
      NULLIF(COALESCE(NEW.message, ''), ''),
      CASE
        WHEN NEW.link IS NOT NULL AND NEW.link <> '' THEN 'Bölmə: ' || NEW.link
        ELSE NULL
      END
    )
  );

  IF _url IS NOT NULL AND _key IS NOT NULL THEN
    -- Always try push notification
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
          'link', COALESCE(NEW.link, '/')
        ),
        timeout_milliseconds := 30000
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE LOG 'Push dispatch failed for notification %: %', NEW.id, SQLERRM;
    END;

    -- Only send email if user is OFFLINE and has email notifications enabled
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
            'body', CASE
              WHEN _email_body IS NULL OR _email_body = '' THEN COALESCE(NEW.title, 'Yeni bildiriş')
              ELSE _email_body
            END
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
$$;
