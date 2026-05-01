CREATE OR REPLACE FUNCTION public.process_referral(_referral_code text, _new_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _referrer_id uuid;
  _settings jsonb;
  _referrer_bonus numeric := 2;
  _referred_bonus numeric := 1;
  _enabled boolean := true;
  _user_created timestamptz;
  _has_activity boolean;
BEGIN
  -- Yalnız özünə aid hesab üçün kod tətbiq edə bilər
  IF auth.uid() IS NULL OR auth.uid() <> _new_user_id THEN
    RETURN false;
  END IF;

  -- Admin tənzimləmələrini oxu
  SELECT value INTO _settings FROM public.site_settings WHERE key = 'referral';
  IF _settings IS NOT NULL THEN
    IF (_settings ->> 'referral_enabled') = 'false' THEN
      _enabled := false;
    END IF;
    IF _settings ? 'referrer_bonus' THEN
      _referrer_bonus := COALESCE((_settings ->> 'referrer_bonus')::numeric, 2);
    END IF;
    IF _settings ? 'referred_bonus' THEN
      _referred_bonus := COALESCE((_settings ->> 'referred_bonus')::numeric, 1);
    END IF;
  END IF;

  IF NOT _enabled THEN
    RETURN false;
  END IF;

  -- Dəvət edəni tap
  SELECT user_id INTO _referrer_id FROM public.profiles WHERE referral_code = upper(trim(_referral_code));
  IF _referrer_id IS NULL OR _referrer_id = _new_user_id THEN
    RETURN false;
  END IF;

  -- Artıq referal olunubsa imtina
  IF EXISTS (SELECT 1 FROM public.referrals WHERE referred_id = _new_user_id) THEN
    RETURN false;
  END IF;

  -- Profil-də referred_by artıq varsa imtina
  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = _new_user_id AND referred_by IS NOT NULL) THEN
    RETURN false;
  END IF;

  -- Sui istifadəyə qarşı: hesab 24 saatdan köhnədirsə qadağa
  SELECT created_at INTO _user_created FROM public.profiles WHERE user_id = _new_user_id;
  IF _user_created IS NULL OR _user_created < now() - interval '24 hours' THEN
    RETURN false;
  END IF;

  -- Sui istifadəyə qarşı: hesabda fəaliyyət varsa (elan/sifariş/əməliyyat) imtina
  SELECT EXISTS (
    SELECT 1 FROM public.listings WHERE user_id = _new_user_id
    UNION ALL
    SELECT 1 FROM public.orders WHERE buyer_id = _new_user_id
    UNION ALL
    SELECT 1 FROM public.balance_transactions WHERE user_id = _new_user_id AND type = 'debit'
  ) INTO _has_activity;
  IF _has_activity THEN
    RETURN false;
  END IF;

  -- Sui istifadəyə qarşı: eyni referrer son 24 saatda 10-dan çox dəvət edə bilməz
  IF (SELECT COUNT(*) FROM public.referrals WHERE referrer_id = _referrer_id AND created_at > now() - interval '24 hours') >= 10 THEN
    RETURN false;
  END IF;

  -- Referal qeydini yarat
  INSERT INTO public.referrals (referrer_id, referred_id, bonus_amount)
  VALUES (_referrer_id, _new_user_id, _referrer_bonus);

  -- Dəvət edənə bonus
  IF _referrer_bonus > 0 THEN
    UPDATE public.profiles SET balance = balance + _referrer_bonus WHERE user_id = _referrer_id;
    INSERT INTO public.balance_transactions (user_id, amount, type, description)
    VALUES (_referrer_id, _referrer_bonus, 'credit', 'Referal bonusu');
  END IF;

  -- Dəvət olunana bonus
  IF _referred_bonus > 0 THEN
    UPDATE public.profiles SET balance = balance + _referred_bonus WHERE user_id = _new_user_id;
    INSERT INTO public.balance_transactions (user_id, amount, type, description)
    VALUES (_new_user_id, _referred_bonus, 'credit', 'Qeydiyyat bonusu');
  END IF;

  -- referred_by yenilə
  UPDATE public.profiles SET referred_by = _referrer_id WHERE user_id = _new_user_id;

  RETURN true;
END;
$function$;