
CREATE OR REPLACE FUNCTION public.notify_store_followers_on_listing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.store_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    SELECT
      sf.user_id,
      s.name || ' yeni elan paylaşdı',
      NEW.title,
      'info',
      '/products/' || NEW.id::text
    FROM public.store_followers sf
    JOIN public.stores s ON s.id = NEW.store_id
    WHERE sf.store_id = NEW.store_id
      AND sf.user_id <> NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_store_listing_created
  AFTER INSERT ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_store_followers_on_listing();
