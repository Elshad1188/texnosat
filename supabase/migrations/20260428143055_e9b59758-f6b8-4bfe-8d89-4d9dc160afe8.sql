
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
        -- legacy: treat string/bool as inapp toggle
        _inapp_enabled := (_settings ->> _event_type) <> 'false';
      END IF;
    END IF;
  END IF;

  IF NOT _inapp_enabled THEN
    RETURN;
  END IF;

  INSERT INTO public.notifications (user_id, title, message, type, link)
  SELECT ur.user_id, _title, _message, 'admin', _link
  FROM public.user_roles ur WHERE ur.role = 'admin';

  INSERT INTO public.notifications (user_id, title, message, type, link)
  SELECT ur.user_id, _title, _message, 'moderation', _link
  FROM public.user_roles ur WHERE ur.role = 'moderator';
END;
$function$;

CREATE OR REPLACE FUNCTION public.process_spin_win(_prize_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _user_id uuid := auth.uid();
  _prize record;
  _last_spin timestamptz;
  _notifications_enabled boolean := true;
  _settings jsonb;
  _entry jsonb;
  _admin_id uuid;
  _full_name text;
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT value INTO _settings FROM public.site_settings WHERE key = 'admin_notifications';
  IF _settings IS NOT NULL THEN
    _entry := _settings -> 'spin_win';
    IF _entry IS NOT NULL THEN
      IF jsonb_typeof(_entry) = 'object' THEN
        _notifications_enabled := COALESCE((_entry ->> 'inapp')::boolean, true);
      ELSE
        _notifications_enabled := (_settings ->> 'spin_win') <> 'false';
      END IF;
    END IF;
  END IF;

  SELECT full_name INTO _full_name FROM public.profiles WHERE user_id = _user_id;

  SELECT last_spin_at INTO _last_spin FROM public.profiles WHERE user_id = _user_id;
  IF _last_spin IS NOT NULL AND _last_spin > now() - interval '24 hours' THEN
    RETURN json_build_object('success', false, 'error', 'Hər 24 saatda bir dəfə fırlada bilərsiniz');
  END IF;

  SELECT * INTO _prize FROM public.spin_prizes WHERE id = _prize_id AND is_active = true;
  IF NOT FOUND THEN RETURN json_build_object('success', false, 'error', 'Hədiyyə tapılmadı'); END IF;

  IF _prize.amount > 0 THEN
    UPDATE public.profiles SET last_spin_at = now() WHERE user_id = _user_id;
    UPDATE public.profiles SET balance = balance + _prize.amount WHERE user_id = _user_id;
    INSERT INTO public.balance_transactions (user_id, amount, type, description)
    VALUES (_user_id, _prize.amount, 'credit', 'Hədiyyə çarxı udulmuş məbləğ: ' || _prize.label);

    INSERT INTO public.spin_history (user_id, prize_id, amount)
    VALUES (_user_id, _prize.id, _prize.amount);

    IF _notifications_enabled THEN
      INSERT INTO public.notifications (user_id, type, title, message)
      VALUES (_user_id, 'gift', 'Təbriklər! 🎉', 'Hədiyyə çarxından ' || _prize.label || ' qazandınız. Məbləğ balansınıza əlavə edildi.');

      FOR _admin_id IN (SELECT user_id FROM public.user_roles WHERE role = 'admin'::public.app_role) LOOP
        INSERT INTO public.notifications (user_id, type, title, message)
        VALUES (_admin_id, 'admin_alert', 'Yeni çarx qalibi! 🎡', COALESCE(_full_name, 'Naməlum istifadəçi') || ' (' || _user_id || ') çarxı fırladaraq ' || _prize.label || ' qazandı.');
      END LOOP;
    END IF;
  END IF;

  RETURN json_build_object(
    'success', true,
    'can_spin_again', (_prize.amount = 0),
    'prize', json_build_object('id', _prize.id, 'label', _prize.label, 'amount', _prize.amount)
  );
END;
$function$;
