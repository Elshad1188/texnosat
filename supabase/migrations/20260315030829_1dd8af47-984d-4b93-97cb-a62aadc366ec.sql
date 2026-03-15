
-- Table for category-specific custom fields managed by admin
CREATE TABLE public.category_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_slug text NOT NULL,
  field_name text NOT NULL,
  field_label text NOT NULL,
  field_type text NOT NULL DEFAULT 'text',
  options jsonb DEFAULT NULL,
  is_required boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.category_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view category fields" ON public.category_fields FOR SELECT TO public USING (true);
CREATE POLICY "Admins can manage category fields" ON public.category_fields FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add custom_fields JSON column to listings
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS custom_fields jsonb DEFAULT NULL;
