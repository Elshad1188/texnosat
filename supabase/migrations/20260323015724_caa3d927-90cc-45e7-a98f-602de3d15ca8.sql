
-- Shipping methods table (seller-defined)
CREATE TABLE public.shipping_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  price numeric NOT NULL DEFAULT 0,
  estimated_days text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.shipping_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active shipping methods" ON public.shipping_methods
  FOR SELECT USING (is_active = true);

CREATE POLICY "Store owners can manage shipping methods" ON public.shipping_methods
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.user_id = auth.uid()));

-- Orders table
CREATE TYPE public.order_status AS ENUM ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'refunded');

CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE DEFAULT 'ORD-' || UPPER(SUBSTR(MD5(RANDOM()::text), 1, 8)),
  buyer_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  store_id uuid REFERENCES public.stores(id),
  listing_id uuid REFERENCES public.listings(id),
  status public.order_status NOT NULL DEFAULT 'pending',
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL,
  shipping_price numeric NOT NULL DEFAULT 0,
  commission_rate numeric NOT NULL DEFAULT 0,
  commission_amount numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL,
  payment_method text NOT NULL DEFAULT 'balance',
  shipping_method_id uuid REFERENCES public.shipping_methods(id),
  shipping_address text,
  tracking_number text,
  tracking_url text,
  buyer_note text,
  seller_note text,
  paid_at timestamptz,
  shipped_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers can view own orders" ON public.orders
  FOR SELECT TO authenticated USING (auth.uid() = buyer_id);

CREATE POLICY "Sellers can view orders for their listings" ON public.orders
  FOR SELECT TO authenticated USING (auth.uid() = seller_id);

CREATE POLICY "Admins can view all orders" ON public.orders
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can create orders" ON public.orders
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Sellers can update their orders" ON public.orders
  FOR UPDATE TO authenticated USING (auth.uid() = seller_id);

CREATE POLICY "Admins can update any order" ON public.orders
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Payout requests table
CREATE TYPE public.payout_status AS ENUM ('pending', 'approved', 'rejected', 'completed');

CREATE TABLE public.payout_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL,
  store_id uuid REFERENCES public.stores(id),
  amount numeric NOT NULL,
  status public.payout_status NOT NULL DEFAULT 'pending',
  bank_name text,
  bank_account text,
  card_number text,
  admin_note text,
  processed_by uuid,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers can view own payouts" ON public.payout_requests
  FOR SELECT TO authenticated USING (auth.uid() = seller_id);

CREATE POLICY "Sellers can create payout requests" ON public.payout_requests
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Admins can view all payouts" ON public.payout_requests
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update payouts" ON public.payout_requests
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Add is_buyable and stock to listings
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS is_buyable boolean NOT NULL DEFAULT false;
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS stock integer NOT NULL DEFAULT 0;

-- Enable realtime for orders
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
