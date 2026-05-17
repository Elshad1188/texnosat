
ALTER TABLE public.contest_settings
  ADD COLUMN IF NOT EXISTS min_invites_for_free_join integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS free_join_window_hours integer NOT NULL DEFAULT 24;

CREATE OR REPLACE FUNCTION public.process_contest_free_join(_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _settings record;
  _contest_id uuid;
  _participant record;
  _new_code text;
  _invite_count int;
  _window_hours int;
  _required int;
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'user_id required'; END IF;

  SELECT * INTO _settings FROM public.contest_settings WHERE id = 1;
  IF NOT _settings.is_enabled THEN
    RETURN json_build_object('success', false, 'error', 'Yarışma deaktivdir');
  END IF;

  _window_hours := COALESCE(_settings.free_join_window_hours, 24);
  _required := COALESCE(_settings.min_invites_for_free_join, 5);

  SELECT COUNT(*) INTO _invite_count
  FROM public.referrals
  WHERE referrer_id = _user_id
    AND created_at > now() - (_window_hours || ' hours')::interval;

  IF _invite_count < _required THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Pulsuz qoşulmaq üçün son ' || _window_hours || ' saatda ən azı ' || _required || ' istifadəçi dəvət etməlisiniz',
      'invites', _invite_count,
      'required', _required
    );
  END IF;

  _contest_id := public.get_or_create_current_contest();

  SELECT * INTO _participant FROM public.contest_participants
  WHERE contest_id = _contest_id AND user_id = _user_id;

  IF FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Siz artıq bu yarışmadasınız');
  END IF;

  LOOP
    _new_code := UPPER(SUBSTR(MD5(RANDOM()::text || _user_id::text || clock_timestamp()::text), 1, 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.contest_participants WHERE referral_code = _new_code);
  END LOOP;

  INSERT INTO public.contest_participants (contest_id, user_id, referral_code, amount_paid, entries_count)
  VALUES (_contest_id, _user_id, _new_code, 0, 1);

  UPDATE public.contests
     SET participants_count = participants_count + 1
   WHERE id = _contest_id;

  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (_user_id, '🏆 Yarışmaya pulsuz qoşuldunuz!', 'Dostlarınızı dəvət etdiyiniz üçün təbrik edirik. Davam edin və qalib olun!', 'info', '/contest/me');

  RETURN json_build_object('success', true, 'contest_id', _contest_id, 'invites', _invite_count);
END;
$$;
