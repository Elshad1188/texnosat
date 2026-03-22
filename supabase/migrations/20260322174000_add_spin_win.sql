
-- Create spin_prizes table
CREATE TABLE public.spin_prizes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  chance integer NOT NULL DEFAULT 1,
  color text NOT NULL DEFAULT '#primary',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create spin_history table
CREATE TABLE public.spin_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prize_id uuid NOT NULL REFERENCES public.spin_prizes(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add last_spin_at to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_spin_at timestamptz;

-- Enable RLS
ALTER TABLE public.spin_prizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spin_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for spin_prizes
CREATE POLICY "Everyone can view active prizes"
  ON public.spin_prizes FOR SELECT
  USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage prizes"
  ON public.spin_prizes FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for spin_history
CREATE POLICY "Users can view own spin history"
  ON public.spin_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all spin history"
  ON public.spin_history FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RPC to process spin win
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
BEGIN
  -- Validate user
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check cooldown (24 hours)
  SELECT last_spin_at INTO _last_spin FROM public.profiles WHERE user_id = _user_id;
  IF _last_spin IS NOT NULL AND _last_spin > now() - interval '24 hours' THEN
    RETURN json_build_object('success', false, 'error', 'Hər 24 saatda bir dəfə fırlada bilərsiniz');
  END IF;

  -- Get prize info
  SELECT * INTO _prize FROM public.spin_prizes WHERE id = _prize_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Hədiyyə tapılmadı və ya aktiv deyil');
  END IF;

  -- Only update cooldown if user won something > 0
  IF _prize.amount > 0 THEN
    UPDATE public.profiles SET last_spin_at = now() WHERE user_id = _user_id;
    UPDATE public.profiles SET balance = balance + _prize.amount WHERE user_id = _user_id;
    INSERT INTO public.balance_transactions (user_id, amount, type, description)
    VALUES (_user_id, _prize.amount, 'credit', 'Hədiyyə çarxı udulmuş məbləğ: ' || _prize.label);
    
    -- Record spin history only for wins
    INSERT INTO public.spin_history (user_id, prize_id, amount)
    VALUES (_user_id, _prize.id, _prize.amount);
  END IF;

  RETURN json_build_object(
    'success', true, 
    'can_spin_again', (_prize.amount = 0),
    'prize', json_build_object(
      'id', _prize.id,
      'label', _prize.label,
      'amount', _prize.amount
    )
  );
END;
$$;

-- Insert some default prizes
INSERT INTO public.spin_prizes (label, amount, chance, color) VALUES
('0.10 AZN', 0.1, 50, '#f97316'),
('0.20 AZN', 0.2, 30, '#8b5cf6'),
('0.50 AZN', 0.5, 10, '#ec4899'),
('1.00 AZN', 1.0, 5, '#10b981'),
('Yenidən cəhd et', 0, 70, '#94a3b8');
