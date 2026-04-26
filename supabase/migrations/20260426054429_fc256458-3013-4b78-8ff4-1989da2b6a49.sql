-- 1) Add agency-specific fields to stores
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS license_number text,
  ADD COLUMN IF NOT EXISTS agent_count integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS specialization text,
  ADD COLUMN IF NOT EXISTS established_year integer,
  ADD COLUMN IF NOT EXISTS website_url text;

-- 2) Real estate custom fields for "menziller" and "heyet-evi" categories
INSERT INTO public.category_fields (category_slug, field_name, field_label, field_type, options, is_required, sort_order, is_active) VALUES
('menziller', 'deal_type', 'Əməliyyat növü', 'select', '["Satılır","Kirayə (aylıq)","Kirayə (günlük)","İpoteka"]'::jsonb, true, 1, true),
('menziller', 'rooms', 'Otaq sayı', 'select', '["1","2","3","4","5+"]'::jsonb, true, 2, true),
('menziller', 'area_m2', 'Sahə (m²)', 'number', null, false, 3, true),
('menziller', 'floor', 'Mərtəbə', 'number', null, false, 4, true),
('menziller', 'total_floors', 'Mərtəbə (binada)', 'number', null, false, 5, true),
('menziller', 'building_type', 'Tikili növü', 'select', '["Yeni tikili","Köhnə tikili"]'::jsonb, false, 6, true),
('menziller', 'repair', 'Təmir', 'select', '["Əla təmirli","Orta təmirli","Təmirsiz","Tələb olunur"]'::jsonb, false, 7, true),
('menziller', 'has_document', 'Çıxarış (kupça)', 'select', '["Var","Yoxdur"]'::jsonb, false, 8, true),
('menziller', 'mortgage_eligible', 'İpotekaya yararlı', 'select', '["Bəli","Xeyr"]'::jsonb, false, 9, true),
('menziller', 'metro', 'Metro yaxınlığı', 'select', '["İçərişəhər","Sahil","28 May","Gənclik","Nərimanov","Bakmil","Ulduz","Koroğlu","Qara Qarayev","Neftçilər","Xalqlar Dostluğu","Əhmədli","Həzi Aslanov","Memar Əcəmi","Nəsimi","Azadlıq prospekti","Dərnəgül","Cəfər Cabbarlı","Nizami","Elmlər Akademiyası","İnşaatçılar","20 Yanvar","Xətai","Avtovağzal","8 Noyabr","Yox"]'::jsonb, false, 10, true)
ON CONFLICT DO NOTHING;

INSERT INTO public.category_fields (category_slug, field_name, field_label, field_type, options, is_required, sort_order, is_active) VALUES
('heyet-evi', 'deal_type', 'Əməliyyat növü', 'select', '["Satılır","Kirayə (aylıq)","Kirayə (günlük)","İpoteka"]'::jsonb, true, 1, true),
('heyet-evi', 'rooms', 'Otaq sayı', 'select', '["1","2","3","4","5+"]'::jsonb, true, 2, true),
('heyet-evi', 'area_m2', 'Sahə (m²)', 'number', null, false, 3, true),
('heyet-evi', 'land_sot', 'Torpaq sahəsi (sot)', 'number', null, false, 4, true),
('heyet-evi', 'floors', 'Mərtəbə sayı', 'number', null, false, 5, true),
('heyet-evi', 'repair', 'Təmir', 'select', '["Əla təmirli","Orta təmirli","Təmirsiz"]'::jsonb, false, 6, true),
('heyet-evi', 'has_document', 'Çıxarış (kupça)', 'select', '["Var","Yoxdur"]'::jsonb, false, 7, true),
('heyet-evi', 'mortgage_eligible', 'İpotekaya yararlı', 'select', '["Bəli","Xeyr"]'::jsonb, false, 8, true)
ON CONFLICT DO NOTHING;