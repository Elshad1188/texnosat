
-- 1. Fix SECURITY DEFINER view (profiles_public) - switch to security_invoker
DROP VIEW IF EXISTS public.profiles_public CASCADE;
CREATE VIEW public.profiles_public WITH (security_invoker=true) AS
SELECT user_id, full_name, avatar_url, phone, city, presence_state, last_seen, created_at
FROM public.profiles;
GRANT SELECT ON public.profiles_public TO anon, authenticated;

-- 2. contest_participants: revoke referral_code from anon (sharable codes shouldn't be harvestable anonymously)
REVOKE SELECT (referral_code) ON public.contest_participants FROM anon;

-- 3. payout_requests: protect card_number / bank_account from being read by clients.
--    Admins and the owning seller no longer get these columns via PostgREST; admin reads via RPC.
REVOKE SELECT (card_number, bank_account) ON public.payout_requests FROM authenticated, anon;
GRANT SELECT (card_number, bank_account) ON public.payout_requests TO service_role;

CREATE OR REPLACE FUNCTION public.admin_get_payout_details(_payout_id uuid)
RETURNS TABLE(card_number text, bank_account text, bank_name text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;
  RETURN QUERY
    SELECT p.card_number, p.bank_account, p.bank_name
    FROM public.payout_requests p WHERE p.id = _payout_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_get_payout_details(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.admin_get_payout_details(uuid) TO authenticated;

-- Validate card number format on insert/update (digits only, 12-19 long)
CREATE OR REPLACE FUNCTION public.validate_payout_card()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.card_number IS NOT NULL THEN
    NEW.card_number := regexp_replace(NEW.card_number, '\s+', '', 'g');
    IF NEW.card_number !~ '^[0-9]{12,19}$' THEN
      RAISE EXCEPTION 'Invalid card number format';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS validate_payout_card_trigger ON public.payout_requests;
CREATE TRIGGER validate_payout_card_trigger
  BEFORE INSERT OR UPDATE ON public.payout_requests
  FOR EACH ROW EXECUTE FUNCTION public.validate_payout_card();

-- 4. scraper_schedules: restrict reads to admins only (this is an admin-only tool)
DROP POLICY IF EXISTS "Users can view own scraper schedules" ON public.scraper_schedules;

-- 5. spin_history: add owner + admin SELECT policies
GRANT SELECT ON public.spin_history TO authenticated;
DROP POLICY IF EXISTS "Users can view own spin history" ON public.spin_history;
CREATE POLICY "Users can view own spin history" ON public.spin_history
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins can view all spin history" ON public.spin_history;
CREATE POLICY "Admins can view all spin history" ON public.spin_history
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
