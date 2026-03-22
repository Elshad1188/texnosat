
-- Phase 1: Orders and Payments Infrastructure

-- 1. Create Order Enums
DO $$ BEGIN
    CREATE TYPE public.order_status AS ENUM ('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.payment_method AS ENUM ('card', 'balance', 'cash_on_delivery');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id uuid NOT NULL REFERENCES auth.users(id),
    store_id uuid NOT NULL REFERENCES public.stores(id),
    listing_id uuid NOT NULL REFERENCES public.listings(id),
    unit_price numeric NOT NULL,
    quantity integer NOT NULL DEFAULT 1,
    total_price numeric NOT NULL,
    commission_rate numeric NOT NULL DEFAULT 0,
    commission_amount numeric NOT NULL DEFAULT 0,
    status public.order_status NOT NULL DEFAULT 'pending',
    payment_status public.payment_status NOT NULL DEFAULT 'pending',
    payment_method public.payment_method NOT NULL DEFAULT 'card',
    shipping_address text,
    contact_phone text,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
CREATE POLICY "Users can view their own orders"
    ON public.orders FOR SELECT
    TO authenticated
    USING (auth.uid() = buyer_id);

CREATE POLICY "Store owners can view orders for their store"
    ON public.orders FOR SELECT
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.stores 
        WHERE id = store_id AND user_id = auth.uid()
    ));

CREATE POLICY "Users can create orders"
    ON public.orders FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Admins can view all orders"
    ON public.orders FOR SELECT
    TO authenticated
    USING (has_role(auth.uid(), 'admin'));

-- 5. Trigger for updated_at
CREATE TRIGGER update_orders_updated_at 
    BEFORE UPDATE ON public.orders 
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Add commission setting to site_settings
INSERT INTO public.site_settings (key, value)
VALUES ('ecommerce_settings', '{"commission_percentage": 5, "min_withdrawal": 20}'::jsonb)
ON CONFLICT (key) DO NOTHING;
