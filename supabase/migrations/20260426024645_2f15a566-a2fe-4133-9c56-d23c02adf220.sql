
-- 1) Bütün köhnə məlumatları təmizlə
DELETE FROM public.inventory_movements;
DELETE FROM public.reel_views;
DELETE FROM public.reel_likes;
DELETE FROM public.reel_comments;
DELETE FROM public.favorites;
DELETE FROM public.orders;
DELETE FROM public.messages;
DELETE FROM public.call_ice_candidates;
DELETE FROM public.calls;
DELETE FROM public.conversations;
DELETE FROM public.reports WHERE target_type = 'listing';
DELETE FROM public.reviews WHERE listing_id IS NOT NULL;
DELETE FROM public.listings;

-- 2) Köhnə kateqoriyaları və sahələri sil
DELETE FROM public.category_fields;
DELETE FROM public.categories;

-- 3) Yeni daşınmaz əmlak kateqoriyaları (bina.az tərzində)
INSERT INTO public.categories (name, slug, icon, parent_id, sort_order, is_active) VALUES
('Mənzillər', 'menziller', 'Building2', NULL, 1, true),
('Həyət evi / Bağ evi', 'heyet-evi', 'Home', NULL, 2, true),
('Ofislər', 'ofisler', 'Briefcase', NULL, 3, true),
('Qarajlar', 'qarajlar', 'Warehouse', NULL, 4, true),
('Torpaq sahələri', 'torpaq', 'TreePine', NULL, 5, true),
('Obyektlər', 'obyektler', 'Store', NULL, 6, true),
('Qeyri-yaşayış sahələri', 'qeyri-yasayis', 'Factory', NULL, 7, true);

-- 4) Alt kateqoriyalar
WITH parents AS (
  SELECT id, slug FROM public.categories WHERE parent_id IS NULL
)
INSERT INTO public.categories (name, slug, icon, parent_id, sort_order, is_active)
SELECT v.name, v.slug, v.icon, p.id, v.sort_order, true
FROM (VALUES
  ('Yeni tikili', 'menziller-yeni-tikili', 'Building', 'menziller', 1),
  ('Köhnə tikili', 'menziller-kohne-tikili', 'Building2', 'menziller', 2),
  ('Villa', 'heyet-evi-villa', 'Home', 'heyet-evi', 1),
  ('Bağ evi', 'heyet-evi-bag', 'Trees', 'heyet-evi', 2),
  ('Həyət evi', 'heyet-evi-heyet', 'Home', 'heyet-evi', 3),
  ('Ofis', 'ofisler-ofis', 'Briefcase', 'ofisler', 1),
  ('Co-working', 'ofisler-coworking', 'Users', 'ofisler', 2),
  ('Qaraj', 'qarajlar-qaraj', 'Warehouse', 'qarajlar', 1),
  ('Parkinq yeri', 'qarajlar-parkinq', 'ParkingCircle', 'qarajlar', 2),
  ('Torpaq (yaşayış)', 'torpaq-yasayis', 'TreePine', 'torpaq', 1),
  ('Torpaq (kommersiya)', 'torpaq-kommersiya', 'TreePine', 'torpaq', 2),
  ('Torpaq (kənd təsərrüfatı)', 'torpaq-kt', 'Sprout', 'torpaq', 3),
  ('Mağaza', 'obyektler-magaza', 'Store', 'obyektler', 1),
  ('Restoran / Kafe', 'obyektler-restoran', 'UtensilsCrossed', 'obyektler', 2),
  ('Hotel / Otel', 'obyektler-hotel', 'Hotel', 'obyektler', 3),
  ('Salon / Studio', 'obyektler-salon', 'Scissors', 'obyektler', 4),
  ('Anbar', 'qeyri-yasayis-anbar', 'Warehouse', 'qeyri-yasayis', 1),
  ('İstehsalat', 'qeyri-yasayis-istehsalat', 'Factory', 'qeyri-yasayis', 2),
  ('Soyuducu kamera', 'qeyri-yasayis-soyuducu', 'Snowflake', 'qeyri-yasayis', 3)
) AS v(name, slug, icon, parent_slug, sort_order)
JOIN parents p ON p.slug = v.parent_slug;

-- 5) Bina.az tərzində əlavə sahələr — bütün əsas əmlak kateqoriyaları üçün
-- Hər root kateqoriya üçün eyni sahə dəstini əlavə edirik
DO $$
DECLARE
  cat_slug text;
  slugs text[] := ARRAY[
    'menziller', 'menziller-yeni-tikili', 'menziller-kohne-tikili',
    'heyet-evi', 'heyet-evi-villa', 'heyet-evi-bag', 'heyet-evi-heyet',
    'ofisler', 'ofisler-ofis', 'ofisler-coworking',
    'qarajlar', 'qarajlar-qaraj', 'qarajlar-parkinq',
    'torpaq', 'torpaq-yasayis', 'torpaq-kommersiya', 'torpaq-kt',
    'obyektler', 'obyektler-magaza', 'obyektler-restoran', 'obyektler-hotel', 'obyektler-salon',
    'qeyri-yasayis', 'qeyri-yasayis-anbar', 'qeyri-yasayis-istehsalat', 'qeyri-yasayis-soyuducu'
  ];
BEGIN
  FOREACH cat_slug IN ARRAY slugs LOOP
    -- Əməliyyat tipi (hamı üçün)
    INSERT INTO public.category_fields (category_slug, field_name, field_label, field_type, options, is_required, sort_order, is_active)
    VALUES (cat_slug, 'deal_type', 'Əməliyyat növü', 'select',
      '["Satılır","Kirayə (aylıq)","Kirayə (günlük)"]'::jsonb, true, 1, true);

    -- Sahə (m²) — bütün əmlak növləri üçün
    INSERT INTO public.category_fields (category_slug, field_name, field_label, field_type, is_required, sort_order, is_active)
    VALUES (cat_slug, 'area_m2', 'Sahə (m²)', 'number', true, 2, true);

    -- Sənəd (çıxarış) — torpaq və qaraj daxil
    INSERT INTO public.category_fields (category_slug, field_name, field_label, field_type, options, is_required, sort_order, is_active)
    VALUES (cat_slug, 'document', 'Sənəd', 'select',
      '["Çıxarış","Kupça","Müqavilə","Sənədsiz"]'::jsonb, false, 20, true);

    -- Metro
    INSERT INTO public.category_fields (category_slug, field_name, field_label, field_type, is_required, sort_order, is_active)
    VALUES (cat_slug, 'metro', 'Yaxın metro', 'text', false, 30, true);

    -- Qəsəbə / Rayon
    INSERT INTO public.category_fields (category_slug, field_name, field_label, field_type, is_required, sort_order, is_active)
    VALUES (cat_slug, 'settlement', 'Qəsəbə', 'text', false, 31, true);
  END LOOP;
END $$;

-- 6) Yalnız mənzil və ev tipli kateqoriyalar üçün əlavə sahələr
DO $$
DECLARE
  cat_slug text;
  slugs text[] := ARRAY[
    'menziller', 'menziller-yeni-tikili', 'menziller-kohne-tikili',
    'heyet-evi', 'heyet-evi-villa', 'heyet-evi-bag', 'heyet-evi-heyet'
  ];
BEGIN
  FOREACH cat_slug IN ARRAY slugs LOOP
    INSERT INTO public.category_fields (category_slug, field_name, field_label, field_type, options, is_required, sort_order, is_active)
    VALUES (cat_slug, 'rooms', 'Otaq sayı', 'select',
      '["1","2","3","4","5","6","7+"]'::jsonb, true, 3, true);

    INSERT INTO public.category_fields (category_slug, field_name, field_label, field_type, is_required, sort_order, is_active)
    VALUES (cat_slug, 'floor', 'Mərtəbə', 'number', false, 4, true);

    INSERT INTO public.category_fields (category_slug, field_name, field_label, field_type, is_required, sort_order, is_active)
    VALUES (cat_slug, 'total_floors', 'Mərtəbə sayı (binada)', 'number', false, 5, true);

    INSERT INTO public.category_fields (category_slug, field_name, field_label, field_type, options, is_required, sort_order, is_active)
    VALUES (cat_slug, 'repair', 'Təmir vəziyyəti', 'select',
      '["Təmirli","Əla təmirli","Orta təmirli","Təmirsiz","Yeni təmirli"]'::jsonb, false, 6, true);

    INSERT INTO public.category_fields (category_slug, field_name, field_label, field_type, options, is_required, sort_order, is_active)
    VALUES (cat_slug, 'building_type', 'Tikili növü', 'select',
      '["Daş","Monolit","Panel","Kərpic","Kombi"]'::jsonb, false, 7, true);

    INSERT INTO public.category_fields (category_slug, field_name, field_label, field_type, options, is_required, sort_order, is_active)
    VALUES (cat_slug, 'mortgage', 'İpoteka', 'select',
      '["Var","Yoxdur"]'::jsonb, false, 8, true);

    INSERT INTO public.category_fields (category_slug, field_name, field_label, field_type, options, is_required, sort_order, is_active)
    VALUES (cat_slug, 'furnished', 'Əşyalı', 'select',
      '["Bəli","Xeyr","Qismən"]'::jsonb, false, 9, true);

    INSERT INTO public.category_fields (category_slug, field_name, field_label, field_type, options, is_required, sort_order, is_active)
    VALUES (cat_slug, 'balcony', 'Eyvan', 'select',
      '["Var","Yoxdur","Şüşəbənd"]'::jsonb, false, 10, true);
  END LOOP;
END $$;

-- 7) Ofis üçün spesifik sahələr
DO $$
DECLARE
  slugs text[] := ARRAY['ofisler', 'ofisler-ofis', 'ofisler-coworking'];
  cat_slug text;
BEGIN
  FOREACH cat_slug IN ARRAY slugs LOOP
    INSERT INTO public.category_fields (category_slug, field_name, field_label, field_type, is_required, sort_order, is_active)
    VALUES (cat_slug, 'rooms', 'Otaq sayı', 'number', false, 3, true);

    INSERT INTO public.category_fields (category_slug, field_name, field_label, field_type, is_required, sort_order, is_active)
    VALUES (cat_slug, 'floor', 'Mərtəbə', 'number', false, 4, true);

    INSERT INTO public.category_fields (category_slug, field_name, field_label, field_type, options, is_required, sort_order, is_active)
    VALUES (cat_slug, 'repair', 'Təmir vəziyyəti', 'select',
      '["Təmirli","Əla təmirli","Orta təmirli","Təmirsiz"]'::jsonb, false, 6, true);
  END LOOP;
END $$;

-- 8) Torpaq üçün spesifik sahələr
DO $$
DECLARE
  slugs text[] := ARRAY['torpaq', 'torpaq-yasayis', 'torpaq-kommersiya', 'torpaq-kt'];
  cat_slug text;
BEGIN
  FOREACH cat_slug IN ARRAY slugs LOOP
    INSERT INTO public.category_fields (category_slug, field_name, field_label, field_type, is_required, sort_order, is_active)
    VALUES (cat_slug, 'area_sot', 'Sahə (sot)', 'number', true, 3, true);
  END LOOP;
END $$;
