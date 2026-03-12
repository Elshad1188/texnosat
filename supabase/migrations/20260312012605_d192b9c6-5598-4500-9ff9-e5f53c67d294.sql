
-- Function to notify all admins about site activities
CREATE OR REPLACE FUNCTION public.notify_admins(
  _event_type text,
  _title text,
  _message text,
  _link text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _settings jsonb;
  _admin_id uuid;
BEGIN
  -- Check if this notification type is enabled in settings
  SELECT value INTO _settings FROM public.site_settings WHERE key = 'admin_notifications';
  
  -- If no settings exist, default to all enabled
  IF _settings IS NULL THEN
    _settings := '{}'::jsonb;
  END IF;
  
  -- Check if the event type is disabled (default is enabled)
  IF (_settings->>_event_type) = 'false' THEN
    RETURN;
  END IF;
  
  -- Insert notification for each admin
  INSERT INTO public.notifications (user_id, title, message, type, link)
  SELECT ur.user_id, _title, _message, 'admin', _link
  FROM public.user_roles ur
  WHERE ur.role = 'admin';
END;
$$;

-- Trigger: New listing created
CREATE OR REPLACE FUNCTION public.on_new_listing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM notify_admins(
    'new_listing',
    'Yeni elan yaradıldı',
    NEW.title || ' - ' || NEW.price || ' ' || NEW.currency,
    '/product/' || NEW.id::text
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_admin_new_listing
  AFTER INSERT ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.on_new_listing();

-- Trigger: New store created
CREATE OR REPLACE FUNCTION public.on_new_store()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM notify_admins(
    'new_store',
    'Yeni mağaza yaradıldı',
    NEW.name,
    '/store/' || NEW.id::text
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_admin_new_store
  AFTER INSERT ON public.stores
  FOR EACH ROW EXECUTE FUNCTION public.on_new_store();

-- Trigger: New report submitted
CREATE OR REPLACE FUNCTION public.on_new_report()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM notify_admins(
    'new_report',
    'Yeni şikayət daxil oldu',
    NEW.reason || COALESCE(' - ' || NEW.description, ''),
    NULL
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_admin_new_report
  AFTER INSERT ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.on_new_report();

-- Trigger: New review
CREATE OR REPLACE FUNCTION public.on_new_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM notify_admins(
    'new_review',
    'Yeni rəy yazıldı',
    NEW.rating || ' ulduz' || COALESCE(' - ' || NEW.comment, ''),
    NULL
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_admin_new_review
  AFTER INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.on_new_review();

-- Trigger: New user registered (profile created)
CREATE OR REPLACE FUNCTION public.on_new_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM notify_admins(
    'new_user',
    'Yeni istifadəçi qeydiyyatdan keçdi',
    COALESCE(NEW.full_name, 'Adsız istifadəçi'),
    NULL
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_admin_new_user
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.on_new_user_profile();

-- Trigger: New message sent
CREATE OR REPLACE FUNCTION public.on_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM notify_admins(
    'new_message',
    'Yeni mesaj göndərildi',
    LEFT(NEW.content, 100),
    NULL
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_admin_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.on_new_message();

-- Trigger: New favorite added
CREATE OR REPLACE FUNCTION public.on_new_favorite()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM notify_admins(
    'new_favorite',
    'Elan seçilmişlərə əlavə edildi',
    NEW.listing_id::text,
    '/product/' || NEW.listing_id::text
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_admin_new_favorite
  AFTER INSERT ON public.favorites
  FOR EACH ROW EXECUTE FUNCTION public.on_new_favorite();
