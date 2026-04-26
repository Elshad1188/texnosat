ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

CREATE INDEX IF NOT EXISTS idx_listings_lat_lng
  ON public.listings (latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;