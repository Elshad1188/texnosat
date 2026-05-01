CREATE OR REPLACE FUNCTION public.increment_listing_views(_listing_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.listings SET views_count = COALESCE(views_count, 0) + 1 WHERE id = _listing_id;
$$;

GRANT EXECUTE ON FUNCTION public.increment_listing_views(uuid) TO anon, authenticated;