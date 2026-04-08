
CREATE OR REPLACE FUNCTION public.check_low_stock_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _store_owner_id uuid;
  _store_name text;
  _min_stock integer := 3;
BEGIN
  -- Only check if stock decreased and is now at or below threshold
  IF NEW.stock <= _min_stock AND (OLD.stock IS NULL OR OLD.stock > _min_stock) AND NEW.store_id IS NOT NULL THEN
    SELECT s.user_id, s.name INTO _store_owner_id, _store_name
    FROM public.stores s WHERE s.id = NEW.store_id;

    IF _store_owner_id IS NOT NULL THEN
      -- Check if we already sent a notification for this listing recently (within 24h)
      IF NOT EXISTS (
        SELECT 1 FROM public.notifications
        WHERE user_id = _store_owner_id
          AND type = 'stock_alert'
          AND link = '/store-dashboard?id=' || NEW.store_id
          AND title LIKE '%' || LEFT(NEW.title, 30) || '%'
          AND created_at > now() - interval '24 hours'
      ) THEN
        INSERT INTO public.notifications (user_id, title, message, type, link)
        VALUES (
          _store_owner_id,
          '⚠️ Aşağı stok: ' || NEW.title,
          '"' || NEW.title || '" məhsulunun stoku ' || NEW.stock || ' ədədə düşdü. Anbarı yoxlayın.',
          'stock_alert',
          '/store-dashboard?id=' || NEW.store_id
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_listing_stock_low
  AFTER UPDATE OF stock ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION public.check_low_stock_notification();
