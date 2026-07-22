-- Add site_type column to categories so admin can classify each category
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS site_type text NOT NULL DEFAULT 'real_estate';

-- Constrain values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'categories_site_type_check'
  ) THEN
    ALTER TABLE public.categories
      ADD CONSTRAINT categories_site_type_check
      CHECK (site_type IN ('real_estate','general','both'));
  END IF;
END $$;

-- Index for fast filtering
CREATE INDEX IF NOT EXISTS categories_site_type_idx ON public.categories (site_type);

-- Store site type in site_settings if missing (default: real_estate to preserve current behavior)
INSERT INTO public.site_settings (key, value)
VALUES ('site_type', jsonb_build_object('type','real_estate'))
ON CONFLICT (key) DO NOTHING;