
CREATE OR REPLACE FUNCTION public.on_new_message_notify_recipient()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  _sender_name text;
  _recipient_id uuid;
  _buyer_id uuid;
  _seller_id uuid;
BEGIN
  SELECT COALESCE(full_name, 'İstifadəçi') INTO _sender_name FROM public.profiles WHERE user_id = NEW.sender_id;
  SELECT buyer_id, seller_id INTO _buyer_id, _seller_id FROM public.conversations WHERE id = NEW.conversation_id;

  IF NEW.sender_id = _buyer_id THEN
    _recipient_id := _seller_id;
  ELSE
    _recipient_id := _buyer_id;
  END IF;

  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (
    _recipient_id,
    _sender_name || ' sizə mesaj göndərdi',
    LEFT(NEW.content, 100),
    'message',
    '/messages'
  );

  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_new_message_notify
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.on_new_message_notify_recipient();
