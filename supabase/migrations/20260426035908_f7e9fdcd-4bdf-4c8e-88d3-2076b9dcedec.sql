-- 1) Add type column to regions
ALTER TABLE public.regions ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'region';
UPDATE public.regions SET type = 'region' WHERE type IS NULL OR type = '';
CREATE INDEX IF NOT EXISTS idx_regions_type ON public.regions(type);

-- 2) Seed Bakı metro stations (latest list, 2024-2026)
DO $$
DECLARE
  metro_names text[] := ARRAY[
    -- Qırmızı xətt
    'İçərişəhər','Sahil','28 May','Gənclik','Nəriman Nərimanov','Bakmil','Ulduz','Koroğlu','Qara Qarayev','Neftçilər','Xalqlar Dostluğu','Əhmədli','Həzi Aslanov',
    -- Yaşıl xətt
    'Cəfər Cabbarlı','Nizami','Memar Əcəmi','20 Yanvar','İnşaatçılar','Elmlər Akademiyası','Nəsimi','Azadlıq prospekti','Dərnəgül','Avtovağzal',
    -- Bənövşəyi xətt (8 Noyabr)
    '8 Noyabr','Xocəsən',
    -- Layihələnən / yeni
    'Xətai','Şah İsmayıl Xətai','Bənövşəyi'
  ];
  metro_name text;
  idx int := 0;
BEGIN
  FOREACH metro_name IN ARRAY metro_names LOOP
    idx := idx + 1;
    INSERT INTO public.regions (name, parent_id, type, sort_order, is_active)
    SELECT metro_name, NULL, 'metro', idx, true
    WHERE NOT EXISTS (
      SELECT 1 FROM public.regions WHERE type = 'metro' AND name = metro_name
    );
  END LOOP;
END $$;

-- 3) Convert metro custom field to select with options sourced from regions(type=metro)
UPDATE public.category_fields
SET field_type = 'select',
    options = (
      SELECT to_jsonb(array_agg(name ORDER BY sort_order, name))
      FROM public.regions WHERE type = 'metro' AND is_active = true
    )
WHERE field_name = 'metro';
