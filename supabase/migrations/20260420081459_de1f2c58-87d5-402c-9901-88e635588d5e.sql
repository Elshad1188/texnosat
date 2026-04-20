-- Saved searches table
CREATE TABLE public.saved_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  query text,
  category text,
  subcategory text,
  region text,
  condition text,
  price_min numeric,
  price_max numeric,
  is_active boolean NOT NULL DEFAULT true,
  last_notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_saved_searches_user ON public.saved_searches(user_id);
CREATE INDEX idx_saved_searches_active ON public.saved_searches(is_active) WHERE is_active = true;

ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own saved searches"
ON public.saved_searches FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users insert own saved searches"
ON public.saved_searches FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own saved searches"
ON public.saved_searches FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users delete own saved searches"
ON public.saved_searches FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Trigger: notify subscribers when matching new listing is created (and approved/active)
CREATE OR REPLACE FUNCTION public.notify_saved_search_subscribers()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _sub record;
  _q text;
BEGIN
  -- Only notify when listing becomes active (visible)
  IF NEW.is_active IS NOT TRUE THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.is_active IS TRUE THEN RETURN NEW; END IF;

  FOR _sub IN
    SELECT * FROM public.saved_searches
    WHERE is_active = true AND user_id <> NEW.user_id
  LOOP
    -- Match logic
    IF _sub.category IS NOT NULL AND _sub.category <> '' AND _sub.category <> NEW.category THEN CONTINUE; END IF;
    IF _sub.region IS NOT NULL AND _sub.region <> '' AND _sub.region <> NEW.location THEN CONTINUE; END IF;
    IF _sub.condition IS NOT NULL AND _sub.condition <> '' AND _sub.condition <> 'Hamısı' AND _sub.condition <> NEW.condition THEN CONTINUE; END IF;
    IF _sub.price_min IS NOT NULL AND NEW.price < _sub.price_min THEN CONTINUE; END IF;
    IF _sub.price_max IS NOT NULL AND NEW.price > _sub.price_max THEN CONTINUE; END IF;
    IF _sub.query IS NOT NULL AND _sub.query <> '' THEN
      _q := lower(_sub.query);
      IF position(_q in lower(NEW.title)) = 0
         AND position(_q in lower(COALESCE(NEW.description,''))) = 0 THEN
        CONTINUE;
      END IF;
    END IF;

    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      _sub.user_id,
      '🔔 Axtarışınıza uyğun yeni elan',
      '"' || NEW.title || '" — ' || NEW.price || ' ' || NEW.currency || ', ' || NEW.location,
      'saved_search',
      '/product/' || NEW.id::text
    );

    UPDATE public.saved_searches SET last_notified_at = now() WHERE id = _sub.id;
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_saved_search_on_insert
AFTER INSERT ON public.listings
FOR EACH ROW EXECUTE FUNCTION public.notify_saved_search_subscribers();

CREATE TRIGGER trg_notify_saved_search_on_activate
AFTER UPDATE OF is_active ON public.listings
FOR EACH ROW
WHEN (NEW.is_active IS TRUE AND (OLD.is_active IS DISTINCT FROM NEW.is_active))
EXECUTE FUNCTION public.notify_saved_search_subscribers();