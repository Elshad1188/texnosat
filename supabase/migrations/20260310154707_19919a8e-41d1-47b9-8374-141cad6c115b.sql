
-- Add referral_code to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code text UNIQUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referred_by uuid;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS balance numeric NOT NULL DEFAULT 0;

-- Generate referral codes for existing users
UPDATE public.profiles SET referral_code = UPPER(SUBSTR(MD5(RANDOM()::text), 1, 8)) WHERE referral_code IS NULL;

-- Function to auto-generate referral code on new profile
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := UPPER(SUBSTR(MD5(RANDOM()::text || NEW.user_id::text), 1, 8));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_generate_referral
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_referral_code();

-- Balance transactions table
CREATE TABLE public.balance_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  type text NOT NULL DEFAULT 'credit',
  description text,
  reference_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.balance_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
  ON public.balance_transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert transactions"
  ON public.balance_transactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- Referrals table
CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL,
  referred_id uuid NOT NULL,
  bonus_amount numeric NOT NULL DEFAULT 2,
  status text NOT NULL DEFAULT 'completed',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(referred_id)
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own referrals"
  ON public.referrals FOR SELECT
  TO authenticated
  USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

CREATE POLICY "System can insert referrals"
  ON public.referrals FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Function to process referral and add balance
CREATE OR REPLACE FUNCTION public.process_referral(_referral_code text, _new_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _referrer_id uuid;
  _bonus numeric := 2;
BEGIN
  -- Find referrer
  SELECT user_id INTO _referrer_id FROM public.profiles WHERE referral_code = _referral_code;
  IF _referrer_id IS NULL OR _referrer_id = _new_user_id THEN
    RETURN false;
  END IF;

  -- Check if already referred
  IF EXISTS (SELECT 1 FROM public.referrals WHERE referred_id = _new_user_id) THEN
    RETURN false;
  END IF;

  -- Create referral record
  INSERT INTO public.referrals (referrer_id, referred_id, bonus_amount) VALUES (_referrer_id, _new_user_id, _bonus);

  -- Add balance to referrer
  UPDATE public.profiles SET balance = balance + _bonus WHERE user_id = _referrer_id;
  INSERT INTO public.balance_transactions (user_id, amount, type, description)
  VALUES (_referrer_id, _bonus, 'credit', 'Referal bonusu');

  -- Add balance to referred user
  UPDATE public.profiles SET balance = balance + 1 WHERE user_id = _new_user_id;
  INSERT INTO public.balance_transactions (user_id, amount, type, description)
  VALUES (_new_user_id, 1, 'credit', 'Qeydiyyat bonusu');

  -- Update referred_by
  UPDATE public.profiles SET referred_by = _referrer_id WHERE user_id = _new_user_id;

  RETURN true;
END;
$$;

-- Function to spend balance
CREATE OR REPLACE FUNCTION public.spend_balance(_user_id uuid, _amount numeric, _description text, _reference_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _current_balance numeric;
BEGIN
  SELECT balance INTO _current_balance FROM public.profiles WHERE user_id = _user_id FOR UPDATE;
  IF _current_balance IS NULL OR _current_balance < _amount THEN
    RETURN false;
  END IF;

  UPDATE public.profiles SET balance = balance - _amount WHERE user_id = _user_id;
  INSERT INTO public.balance_transactions (user_id, amount, type, description, reference_id)
  VALUES (_user_id, -_amount, 'debit', _description, _reference_id);

  RETURN true;
END;
$$;
