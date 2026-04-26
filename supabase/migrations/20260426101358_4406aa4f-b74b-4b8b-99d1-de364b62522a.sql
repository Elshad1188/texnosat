-- Add deal_type column to listings for real estate deal categorization
ALTER TABLE public.listings
ADD COLUMN IF NOT EXISTS deal_type text NOT NULL DEFAULT 'sale';

-- Allowed values: sale (Alqı-satqı), rent (Kirayə), daily (Günlük), roommate (Otaq yoldaşı)
-- Use validation trigger instead of CHECK for flexibility
CREATE OR REPLACE FUNCTION public.validate_listing_deal_type()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.deal_type NOT IN ('sale', 'rent', 'daily', 'roommate') THEN
    RAISE EXCEPTION 'Invalid deal_type: %. Allowed: sale, rent, daily, roommate', NEW.deal_type;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_listings_deal_type ON public.listings;
CREATE TRIGGER validate_listings_deal_type
BEFORE INSERT OR UPDATE OF deal_type ON public.listings
FOR EACH ROW
EXECUTE FUNCTION public.validate_listing_deal_type();

CREATE INDEX IF NOT EXISTS idx_listings_deal_type ON public.listings (deal_type) WHERE is_active = true;