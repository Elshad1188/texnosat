CREATE OR REPLACE FUNCTION public.on_notification_push()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _url text;
  _key text;
BEGIN
  SELECT decrypted_secret INTO _url
  FROM vault.decrypted_secrets
  WHERE name = 'SUPABASE_URL'
  LIMIT 1;

  SELECT decrypted_secret INTO _key
  FROM vault.decrypted_secrets
  WHERE name = 'SUPABASE_SERVICE_ROLE_KEY'
  LIMIT 1;

  IF _url IS NOT NULL AND _key IS NOT NULL THEN
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
      timeout_milliseconds := 20000
    );
  END IF;

  RETURN NEW;
END;
$function$;