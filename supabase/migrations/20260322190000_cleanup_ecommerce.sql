
-- Cleanup e-commerce features
DROP TABLE IF EXISTS public.orders;
ALTER TABLE public.listings DROP COLUMN IF EXISTS is_sellable;
ALTER TABLE public.listings DROP COLUMN IF EXISTS stock;
DELETE FROM public.site_settings WHERE key = 'ecommerce_settings';

-- Drop custom types if they exist
DROP TYPE IF EXISTS public.order_status;
DROP TYPE IF EXISTS public.payment_status;
DROP TYPE IF EXISTS public.payment_method;
