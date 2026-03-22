
-- 1. Add spin_settings to site_settings if not exists
INSERT INTO public.site_settings (key, value)
VALUES ('spin_settings', '{"notifications_enabled": true}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 2. Update process_spin_win to handle notifications
CREATE OR REPLACE FUNCTION public.process_spin_win(_prize_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _prize record;
  _last_spin timestamptz;
  _notifications_enabled boolean;
  _admin_id uuid;
BEGIN
  -- Validate user
  IF _user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- Check notifications setting
  SELECT (value->>'notifications_enabled')::boolean INTO _notifications_enabled 
  FROM public.site_settings WHERE key = 'spin_settings';
  _notifications_enabled := COALESCE(_notifications_enabled, true);

  -- Check cooldown (24 hours)
  SELECT last_spin_at INTO _last_spin FROM public.profiles WHERE user_id = _user_id;
  IF _last_spin IS NOT NULL AND _last_spin > now() - interval '24 hours' THEN
    RETURN json_build_object('success', false, 'error', 'Hər 24 saatda bir dəfə fırlada bilərsiniz');
  END IF;

  -- Get prize info
  SELECT * INTO _prize FROM public.spin_prizes WHERE id = _prize_id AND is_active = true;
  IF NOT FOUND THEN RETURN json_build_object('success', false, 'error', 'Hədiyyə tapılmadı'); END IF;

  -- Only update cooldown and history if user won something > 0
  IF _prize.amount > 0 THEN
    UPDATE public.profiles SET last_spin_at = now() WHERE user_id = _user_id;
    UPDATE public.profiles SET balance = balance + _prize.amount WHERE user_id = _user_id;
    INSERT INTO public.balance_transactions (user_id, amount, type, description)
    VALUES (_user_id, _prize.amount, 'credit', 'Hədiyyə çarxı udulmuş məbləğ: ' || _prize.label);
    
    INSERT INTO public.spin_history (user_id, prize_id, amount)
    VALUES (_user_id, _prize.id, _prize.amount);

    -- Send notifications if enabled
    IF _notifications_enabled THEN
      -- Notification to user
      INSERT INTO public.notifications (user_id, type, title, message)
      VALUES (_user_id, 'gift', 'Təbriklər! 🎉', 'Hədiyyə çarxından ' || _prize.label || ' qazandınız. Məbləğ balansınıza əlavə edildi.');

      -- Notification to all admins
      FOR _admin_id IN (SELECT user_id FROM public.user_roles WHERE role = 'admin'::public.app_role) LOOP
        INSERT INTO public.notifications (user_id, type, title, message)
        VALUES (_admin_id, 'admin_alert', 'Yeni çarx qalibi! 🎡', 'İstifadəçi (ID: ' || _user_id || ') çarxı fırladaraq ' || _prize.label || ' qazandı.');
      END LOOP;
    END IF;
  END IF;

  RETURN json_build_object(
    'success', true, 
    'can_spin_again', (_prize.amount = 0),
    'prize', json_build_object('id', _prize.id, 'label', _prize.label, 'amount', _prize.amount)
  );
END;
$$;
