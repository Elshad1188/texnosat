CREATE OR REPLACE FUNCTION public.on_notification_push()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  _url text;
  _key text;
  _email_enabled boolean := true;
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

  SELECT COALESCE(
    (
      SELECT p.email_notifications
      FROM public.profiles p
      WHERE p.user_id = NEW.user_id
      LIMIT 1
    ),
    true
  )
  INTO _email_enabled;

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

    IF _email_enabled THEN
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
$function$;