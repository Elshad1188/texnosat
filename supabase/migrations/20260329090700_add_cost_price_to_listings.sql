-- Add cost_price to listings table
ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS cost_price NUMERIC DEFAULT 0;
