ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';
UPDATE public.stores SET status = 'approved' WHERE status = 'pending';