
-- Add barcode column to listings
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS barcode text;
CREATE INDEX IF NOT EXISTS idx_listings_barcode ON public.listings(barcode) WHERE barcode IS NOT NULL;

-- Create inventory_movements table
CREATE TABLE public.inventory_movements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  movement_type text NOT NULL DEFAULT 'in', -- in, out, adjustment
  quantity integer NOT NULL DEFAULT 0,
  previous_stock integer NOT NULL DEFAULT 0,
  new_stock integer NOT NULL DEFAULT 0,
  note text,
  barcode text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Store owners can manage inventory movements"
  ON public.inventory_movements FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = inventory_movements.store_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = inventory_movements.store_id AND s.user_id = auth.uid()));

CREATE POLICY "Admins can view all inventory movements"
  ON public.inventory_movements FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
