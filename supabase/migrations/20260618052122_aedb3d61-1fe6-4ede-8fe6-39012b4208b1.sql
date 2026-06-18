
-- 1) cj_settings: singleton (id=1)
CREATE TABLE public.cj_settings (
  id integer PRIMARY KEY DEFAULT 1,
  commission_pct numeric NOT NULL DEFAULT 30,
  commission_fixed_azn numeric NOT NULL DEFAULT 2,
  usd_to_azn numeric NOT NULL DEFAULT 1.70,
  default_category text,
  default_store_id uuid,
  trend_auto_import boolean NOT NULL DEFAULT false,
  trend_import_limit integer NOT NULL DEFAULT 20,
  access_token text,
  token_expires_at timestamptz,
  last_sync_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cj_settings_singleton CHECK (id = 1)
);
GRANT SELECT, INSERT, UPDATE ON public.cj_settings TO authenticated;
GRANT ALL ON public.cj_settings TO service_role;
ALTER TABLE public.cj_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage cj_settings" ON public.cj_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

INSERT INTO public.cj_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

CREATE TRIGGER update_cj_settings_updated_at
BEFORE UPDATE ON public.cj_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) cj_products
CREATE TABLE public.cj_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cj_pid text NOT NULL UNIQUE,
  cj_product_sku text,
  name text NOT NULL,
  description text,
  images jsonb NOT NULL DEFAULT '[]'::jsonb,
  variants jsonb NOT NULL DEFAULT '[]'::jsonb,
  category_path text,
  source_price_usd numeric NOT NULL DEFAULT 0,
  final_price_azn numeric NOT NULL DEFAULT 0,
  listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'imported',
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cj_products TO authenticated;
GRANT ALL ON public.cj_products TO service_role;
ALTER TABLE public.cj_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage cj_products" ON public.cj_products
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER update_cj_products_updated_at
BEFORE UPDATE ON public.cj_products
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) cj_import_jobs
CREATE TABLE public.cj_import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type text NOT NULL DEFAULT 'search',
  keyword text,
  cj_category text,
  status text NOT NULL DEFAULT 'pending',
  total_found integer NOT NULL DEFAULT 0,
  total_imported integer NOT NULL DEFAULT 0,
  error_message text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cj_import_jobs TO authenticated;
GRANT ALL ON public.cj_import_jobs TO service_role;
ALTER TABLE public.cj_import_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage cj_import_jobs" ON public.cj_import_jobs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 4) cj_orders
CREATE TABLE public.cj_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  cj_product_id uuid REFERENCES public.cj_products(id) ON DELETE SET NULL,
  cj_variant_id text,
  quantity integer NOT NULL DEFAULT 1,
  cj_order_id text,
  cj_order_num text,
  tracking_number text,
  logistic_name text,
  status text NOT NULL DEFAULT 'awaiting_admin',
  cost_usd numeric,
  shipping_cost_usd numeric,
  customer_revenue_azn numeric,
  last_synced_at timestamptz,
  error_message text,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cj_orders TO authenticated;
GRANT ALL ON public.cj_orders TO service_role;
ALTER TABLE public.cj_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage cj_orders" ON public.cj_orders
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER update_cj_orders_updated_at
BEFORE UPDATE ON public.cj_orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX cj_orders_status_idx ON public.cj_orders(status);
CREATE INDEX cj_orders_order_id_idx ON public.cj_orders(order_id);
CREATE INDEX cj_products_status_idx ON public.cj_products(status);
