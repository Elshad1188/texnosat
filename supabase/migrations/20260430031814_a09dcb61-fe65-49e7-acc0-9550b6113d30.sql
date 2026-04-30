
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS name_ru text;
ALTER TABLE public.category_fields ADD COLUMN IF NOT EXISTS field_label_ru text;
ALTER TABLE public.category_fields ADD COLUMN IF NOT EXISTS options_ru jsonb;
