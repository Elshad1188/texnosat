
-- Contests table
CREATE TABLE public.contests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start timestamptz NOT NULL,
  week_end timestamptz NOT NULL,
  total_pool numeric NOT NULL DEFAULT 0,
  participants_count integer NOT NULL DEFAULT 0,
  invites_count integer NOT NULL DEFAULT 0,
  winner_id uuid,
  second_id uuid,
  third_id uuid,
  winner_amount numeric DEFAULT 0,
  second_amount numeric DEFAULT 0,
  third_amount numeric DEFAULT 0,
  status text NOT NULL DEFAULT 'active', -- active | finalized
  winner_video_url text,
  winner_cover_url text,
  winner_note text,
  finalized_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.contest_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id uuid NOT NULL,
  user_id uuid NOT NULL,
  referral_code text NOT NULL,
  invites_count integer NOT NULL DEFAULT 0,
  entries_count integer NOT NULL DEFAULT 1,
  amount_paid numeric NOT NULL DEFAULT 0,
  paid_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contest_id, user_id),
  UNIQUE (referral_code)
);

CREATE INDEX idx_contest_participants_contest ON public.contest_participants(contest_id);
CREATE INDEX idx_contest_participants_user ON public.contest_participants(user_id);
CREATE INDEX idx_contest_participants_invites ON public.contest_participants(contest_id, invites_count DESC);

CREATE TABLE public.contest_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contest_id uuid NOT NULL,
  inviter_user_id uuid NOT NULL,
  invited_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contest_id, invited_user_id)
);
CREATE INDEX idx_contest_invites_inviter ON public.contest_invites(contest_id, inviter_user_id);

CREATE TABLE public.contest_settings (
  id integer PRIMARY KEY DEFAULT 1,
  is_enabled boolean NOT NULL DEFAULT true,
  entry_fee numeric NOT NULL DEFAULT 1,
  winner_pct numeric NOT NULL DEFAULT 70,
  second_pct numeric NOT NULL DEFAULT 10,
  third_pct numeric NOT NULL DEFAULT 5,
  rollover_pct numeric NOT NULL DEFAULT 10,
  commission_pct numeric NOT NULL DEFAULT 5,
  min_invites_to_win integer NOT NULL DEFAULT 3,
  bonus_balance_amount numeric NOT NULL DEFAULT 1,
  contest_title text NOT NULL DEFAULT 'Elan24 Çempionatı',
  contest_description text NOT NULL DEFAULT 'Cəmi 1 AZN ilə həftəlik dəvət yarışmasına qoşul, dostlarını dəvət et və böyük fondu qazan!',
  rules_text text NOT NULL DEFAULT '• 1 AZN ödəyərək yarışmaya qoşul və balansına 1 AZN bonus al
• Sənə unikal dəvət linki veriləcək
• Linkin vasitəsilə qeydiyyatdan keçən hər yeni istifadəçi sənin dəvət sayğacını artırır
• Həftə sonu (Bazar 23:59) ən çox dəvət edən qalib olur
• Qalibə fondun 70%-i, 2-ci və 3-cü yerlərə müvafiq olaraq 10% və 5% Epoint vasitəsilə köçürülür
• Qalib olmaq üçün ən azı 3 uğurlu dəvət lazımdır',
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.contest_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE public.contests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contest_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contest_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contest_settings ENABLE ROW LEVEL SECURITY;

-- contests policies
CREATE POLICY "Anyone can view contests" ON public.contests FOR SELECT USING (true);
CREATE POLICY "Admins manage contests" ON public.contests FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- contest_participants policies
CREATE POLICY "Anyone can view participants leaderboard" ON public.contest_participants FOR SELECT USING (true);
CREATE POLICY "Admins manage participants" ON public.contest_participants FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- contest_invites policies
CREATE POLICY "Inviter and invitee can view their invites" ON public.contest_invites FOR SELECT USING (auth.uid() = inviter_user_id OR auth.uid() = invited_user_id OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage invites" ON public.contest_invites FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- contest_settings policies
CREATE POLICY "Anyone can view contest settings" ON public.contest_settings FOR SELECT USING (true);
CREATE POLICY "Admins manage contest settings" ON public.contest_settings FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Helper: get or create current active contest (week starts Monday 00:00, ends Sunday 23:59:59)
CREATE OR REPLACE FUNCTION public.get_or_create_current_contest()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _id uuid;
  _week_start timestamptz;
  _week_end timestamptz;
  _rollover numeric := 0;
  _settings record;
BEGIN
  -- Compute current week boundaries (Monday 00:00 - next Monday 00:00, in Asia/Baku)
  _week_start := date_trunc('week', (now() AT TIME ZONE 'Asia/Baku'))::timestamp AT TIME ZONE 'Asia/Baku';
  _week_end := _week_start + interval '7 days';

  SELECT id INTO _id FROM public.contests
  WHERE status = 'active' AND week_start = _week_start LIMIT 1;

  IF _id IS NOT NULL THEN
    RETURN _id;
  END IF;

  -- Calculate rollover from previous finalized contest (if any)
  SELECT * INTO _settings FROM public.contest_settings WHERE id = 1;
  SELECT COALESCE(total_pool * COALESCE(_settings.rollover_pct, 10) / 100.0, 0)
    INTO _rollover
  FROM public.contests
  WHERE status = 'finalized'
  ORDER BY week_end DESC LIMIT 1;

  INSERT INTO public.contests (week_start, week_end, total_pool, status)
  VALUES (_week_start, _week_end, COALESCE(_rollover, 0), 'active')
  RETURNING id INTO _id;

  RETURN _id;
END;
$$;

-- Process a contest join (called from edge function after Epoint payment success)
CREATE OR REPLACE FUNCTION public.process_contest_join(_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _contest_id uuid;
  _settings record;
  _participant record;
  _new_code text;
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'user_id required'; END IF;

  SELECT * INTO _settings FROM public.contest_settings WHERE id = 1;
  IF NOT _settings.is_enabled THEN RETURN json_build_object('success', false, 'error', 'Yarışma deaktivdir'); END IF;

  _contest_id := public.get_or_create_current_contest();

  SELECT * INTO _participant FROM public.contest_participants
  WHERE contest_id = _contest_id AND user_id = _user_id;

  IF FOUND THEN
    -- Re-entry: increase entries and pool
    UPDATE public.contest_participants
       SET entries_count = entries_count + 1,
           amount_paid = amount_paid + _settings.entry_fee
     WHERE id = _participant.id;
  ELSE
    LOOP
      _new_code := UPPER(SUBSTR(MD5(RANDOM()::text || _user_id::text || clock_timestamp()::text), 1, 8));
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.contest_participants WHERE referral_code = _new_code);
    END LOOP;

    INSERT INTO public.contest_participants (contest_id, user_id, referral_code, amount_paid)
    VALUES (_contest_id, _user_id, _new_code, _settings.entry_fee);

    UPDATE public.contests SET participants_count = participants_count + 1 WHERE id = _contest_id;
  END IF;

  -- Add to total pool
  UPDATE public.contests SET total_pool = total_pool + _settings.entry_fee WHERE id = _contest_id;

  -- Bonus balance to user
  IF _settings.bonus_balance_amount > 0 THEN
    UPDATE public.profiles SET balance = balance + _settings.bonus_balance_amount WHERE user_id = _user_id;
    INSERT INTO public.balance_transactions (user_id, amount, type, description)
    VALUES (_user_id, _settings.bonus_balance_amount, 'credit', 'Yarışma qoşulma bonusu');
  END IF;

  -- Notification
  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (_user_id, '🏆 Yarışmaya qoşuldunuz!', 'Uğurlar! Dəvət linkinizi paylaşın və qalib olun.', 'info', '/contest/me');

  RETURN json_build_object('success', true, 'contest_id', _contest_id);
END;
$$;

-- Register a successful invite (called from frontend after new user signup with referral code)
CREATE OR REPLACE FUNCTION public.register_contest_invite(_referral_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _invited uuid := auth.uid();
  _contest_id uuid;
  _participant record;
  _profile record;
BEGIN
  IF _invited IS NULL THEN RETURN json_build_object('success', false, 'error', 'Not authenticated'); END IF;
  IF _referral_code IS NULL OR _referral_code = '' THEN RETURN json_build_object('success', false, 'error', 'No code'); END IF;

  -- Anti-abuse: account must be < 24h old and have no listings/orders/debits
  SELECT * INTO _profile FROM public.profiles WHERE user_id = _invited;
  IF _profile.created_at < now() - interval '24 hours' THEN
    RETURN json_build_object('success', false, 'error', 'Account too old');
  END IF;
  IF EXISTS (SELECT 1 FROM public.listings WHERE user_id = _invited)
     OR EXISTS (SELECT 1 FROM public.orders WHERE buyer_id = _invited) THEN
    RETURN json_build_object('success', false, 'error', 'Account already active');
  END IF;

  SELECT * INTO _participant FROM public.contest_participants
  WHERE referral_code = UPPER(trim(_referral_code))
  ORDER BY created_at DESC LIMIT 1;

  IF NOT FOUND THEN RETURN json_build_object('success', false, 'error', 'Invalid code'); END IF;
  IF _participant.user_id = _invited THEN RETURN json_build_object('success', false, 'error', 'Self-invite'); END IF;

  _contest_id := _participant.contest_id;

  -- Only count if contest is still active
  IF NOT EXISTS (SELECT 1 FROM public.contests WHERE id = _contest_id AND status = 'active') THEN
    RETURN json_build_object('success', false, 'error', 'Contest closed');
  END IF;

  -- One invite per invited user per contest
  IF EXISTS (SELECT 1 FROM public.contest_invites WHERE contest_id = _contest_id AND invited_user_id = _invited) THEN
    RETURN json_build_object('success', false, 'error', 'Already counted');
  END IF;

  INSERT INTO public.contest_invites (contest_id, inviter_user_id, invited_user_id)
  VALUES (_contest_id, _participant.user_id, _invited);

  UPDATE public.contest_participants
     SET invites_count = invites_count + 1
   WHERE contest_id = _contest_id AND user_id = _participant.user_id;

  UPDATE public.contests SET invites_count = invites_count + 1 WHERE id = _contest_id;

  -- Notify inviter
  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (_participant.user_id, '🎉 Yeni dəvət!', 'Sənin linkin vasitəsilə yeni istifadəçi qeydiyyatdan keçdi. Reytinqdə yüksəldin!', 'info', '/contest/me');

  RETURN json_build_object('success', true);
END;
$$;

-- Finalize current contest: pick winners, distribute, create payouts, notify
CREATE OR REPLACE FUNCTION public.finalize_current_contest()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _contest record;
  _settings record;
  _winners record;
  _w_amount numeric;
  _s_amount numeric;
  _t_amount numeric;
  _admin_id uuid;
BEGIN
  -- Only admins or service role can call this
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

  -- Top 3 by invites_count, must meet min_invites
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

  -- Award balances
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

  -- Notify all admins
  FOR _admin_id IN (SELECT user_id FROM public.user_roles WHERE role = 'admin'::app_role) LOOP
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (_admin_id, '🏁 Yarışma yekunlaşdı', 'Həftəlik yarışma sona çatdı. Fond: ' || _contest.total_pool || ' AZN', 'admin_alert', '/admin?tab=contest');
  END LOOP;

  -- Create new active contest immediately
  PERFORM public.get_or_create_current_contest();

  RETURN json_build_object('success', true, 'contest_id', _contest.id, 'winner_amount', _w_amount);
END;
$$;
