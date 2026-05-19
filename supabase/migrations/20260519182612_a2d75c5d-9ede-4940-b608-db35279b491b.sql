CREATE OR REPLACE FUNCTION public.finalize_current_contest()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _contest record;
  _settings record;
  _winners record;
  _w_amount numeric;
  _s_amount numeric;
  _t_amount numeric;
  _admin_id uuid;
  _w1_name text;
  _w2_name text;
  _w3_name text;
  _announce text;
  _winners_payload jsonb;
BEGIN
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR auth.role() = 'service_role') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT * INTO _settings FROM public.contest_settings WHERE id = 1;

  SELECT * INTO _contest FROM public.contests
  WHERE status = 'active' AND week_end <= now() + interval '1 minute'
  ORDER BY week_end ASC LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'No contest ready to finalize');
  END IF;

  _w_amount := _contest.total_pool * _settings.winner_pct / 100.0;
  _s_amount := _contest.total_pool * _settings.second_pct / 100.0;
  _t_amount := _contest.total_pool * _settings.third_pct / 100.0;

  WITH ranked AS (
    SELECT user_id, invites_count,
           ROW_NUMBER() OVER (ORDER BY invites_count DESC, created_at ASC) AS rnk
    FROM public.contest_participants
    WHERE contest_id = _contest.id AND invites_count >= _settings.min_invites_to_win
  )
  SELECT
    MAX(CASE WHEN rnk = 1 THEN user_id END) AS w1,
    MAX(CASE WHEN rnk = 2 THEN user_id END) AS w2,
    MAX(CASE WHEN rnk = 3 THEN user_id END) AS w3
  INTO _winners FROM ranked;

  -- Award balances + winner notifications
  IF _winners.w1 IS NOT NULL AND _w_amount > 0 THEN
    UPDATE public.profiles SET balance = balance + _w_amount WHERE user_id = _winners.w1;
    INSERT INTO public.balance_transactions (user_id, amount, type, description, reference_id)
    VALUES (_winners.w1, _w_amount, 'credit', '🏆 Yarışma 1-ci yer mükafatı', _contest.id);
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (_winners.w1, '🏆 Təbriklər! 1-ci oldunuz!', 'Yarışmanın qalibi siz oldunuz! ' || _w_amount || ' AZN balansınıza əlavə edildi.', 'gift', '/contest');
  END IF;

  IF _winners.w2 IS NOT NULL AND _s_amount > 0 THEN
    UPDATE public.profiles SET balance = balance + _s_amount WHERE user_id = _winners.w2;
    INSERT INTO public.balance_transactions (user_id, amount, type, description, reference_id)
    VALUES (_winners.w2, _s_amount, 'credit', '🥈 Yarışma 2-ci yer mükafatı', _contest.id);
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (_winners.w2, '🥈 2-ci oldunuz!', _s_amount || ' AZN balansınıza əlavə edildi.', 'gift', '/contest');
  END IF;

  IF _winners.w3 IS NOT NULL AND _t_amount > 0 THEN
    UPDATE public.profiles SET balance = balance + _t_amount WHERE user_id = _winners.w3;
    INSERT INTO public.balance_transactions (user_id, amount, type, description, reference_id)
    VALUES (_winners.w3, _t_amount, 'credit', '🥉 Yarışma 3-cü yer mükafatı', _contest.id);
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (_winners.w3, '🥉 3-cü oldunuz!', _t_amount || ' AZN balansınıza əlavə edildi.', 'gift', '/contest');
  END IF;

  UPDATE public.contests
     SET status = 'finalized',
         winner_id = _winners.w1, second_id = _winners.w2, third_id = _winners.w3,
         winner_amount = COALESCE(_w_amount,0),
         second_amount = COALESCE(_s_amount,0),
         third_amount = COALESCE(_t_amount,0),
         finalized_at = now()
   WHERE id = _contest.id;

  -- Resolve winner names
  SELECT COALESCE(full_name, 'İstifadəçi') INTO _w1_name FROM public.profiles WHERE user_id = _winners.w1;
  SELECT COALESCE(full_name, 'İstifadəçi') INTO _w2_name FROM public.profiles WHERE user_id = _winners.w2;
  SELECT COALESCE(full_name, 'İstifadəçi') INTO _w3_name FROM public.profiles WHERE user_id = _winners.w3;

  _announce := '🏆 Həftəlik yarışmanın qalibləri elan olundu! ';
  IF _winners.w1 IS NOT NULL THEN
    _announce := _announce || '1-ci: ' || _w1_name || ' (' || ROUND(_w_amount, 2) || ' ₼)';
  END IF;
  IF _winners.w2 IS NOT NULL THEN
    _announce := _announce || ', 2-ci: ' || _w2_name || ' (' || ROUND(_s_amount, 2) || ' ₼)';
  END IF;
  IF _winners.w3 IS NOT NULL THEN
    _announce := _announce || ', 3-cü: ' || _w3_name || ' (' || ROUND(_t_amount, 2) || ' ₼)';
  END IF;

  -- Save announcement to site_settings for the homepage banner
  _winners_payload := jsonb_build_object(
    'contest_id', _contest.id,
    'finalized_at', now(),
    'total_pool', _contest.total_pool,
    'winners', jsonb_build_array(
      jsonb_build_object('place', 1, 'user_id', _winners.w1, 'name', _w1_name, 'amount', _w_amount, 'invites', (SELECT invites_count FROM public.contest_participants WHERE contest_id = _contest.id AND user_id = _winners.w1)),
      jsonb_build_object('place', 2, 'user_id', _winners.w2, 'name', _w2_name, 'amount', _s_amount, 'invites', (SELECT invites_count FROM public.contest_participants WHERE contest_id = _contest.id AND user_id = _winners.w2)),
      jsonb_build_object('place', 3, 'user_id', _winners.w3, 'name', _w3_name, 'amount', _t_amount, 'invites', (SELECT invites_count FROM public.contest_participants WHERE contest_id = _contest.id AND user_id = _winners.w3))
    )
  );

  INSERT INTO public.site_settings (key, value)
  VALUES ('last_contest_winners', _winners_payload)
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

  -- Notify ALL contest participants (broadcast)
  INSERT INTO public.notifications (user_id, title, message, type, link)
  SELECT DISTINCT cp.user_id, '🏆 Yarışma yekunlaşdı!', _announce, 'info', '/contest'
  FROM public.contest_participants cp
  WHERE cp.contest_id = _contest.id
    AND cp.user_id NOT IN (
      COALESCE(_winners.w1, '00000000-0000-0000-0000-000000000000'::uuid),
      COALESCE(_winners.w2, '00000000-0000-0000-0000-000000000000'::uuid),
      COALESCE(_winners.w3, '00000000-0000-0000-0000-000000000000'::uuid)
    );

  -- Notify all admins/moderators
  FOR _admin_id IN (SELECT user_id FROM public.user_roles WHERE role IN ('admin'::app_role, 'moderator'::app_role)) LOOP
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (_admin_id, '🏁 Yarışma yekunlaşdı', _announce, 'admin_alert', '/admin?tab=contest');
  END LOOP;

  -- Create new active contest immediately
  PERFORM public.get_or_create_current_contest();

  RETURN json_build_object('success', true, 'contest_id', _contest.id, 'winner_amount', _w_amount, 'announcement', _announce);
END;
$function$;