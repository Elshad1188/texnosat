-- Update notification functions with detailed messages

CREATE OR REPLACE FUNCTION public.on_new_listing()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _user_name text;
BEGIN
  SELECT COALESCE(full_name, 'Adsız istifadəçi') INTO _user_name FROM public.profiles WHERE user_id = NEW.user_id;
  PERFORM notify_admins(
    'new_listing',
    'Yeni elan yaradıldı',
    _user_name || ' tərəfindən "' || NEW.title || '" adlı elan yaradıldı. Qiymət: ' || NEW.price || ' ' || NEW.currency || '. Kateqoriya: ' || NEW.category || '. Bölgə: ' || NEW.location,
    '/product/' || NEW.id::text
  );
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.on_new_store()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _user_name text;
BEGIN
  SELECT COALESCE(full_name, 'Adsız istifadəçi') INTO _user_name FROM public.profiles WHERE user_id = NEW.user_id;
  PERFORM notify_admins(
    'new_store',
    'Yeni mağaza yaradıldı',
    _user_name || ' tərəfindən "' || NEW.name || '" adlı mağaza yaradıldı.' || COALESCE(' Şəhər: ' || NEW.city, ''),
    '/store/' || NEW.id::text
  );
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.on_new_report()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _reporter_name text;
BEGIN
  SELECT COALESCE(full_name, 'Adsız istifadəçi') INTO _reporter_name FROM public.profiles WHERE user_id = NEW.reporter_id;
  PERFORM notify_admins(
    'new_report',
    'Yeni şikayət daxil oldu',
    _reporter_name || ' tərəfindən şikayət: ' || NEW.reason || COALESCE('. Açıqlama: ' || NEW.description, '') || '. Hədəf: ' || NEW.target_type,
    NULL
  );
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.on_new_review()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _reviewer_name text;
  _reviewed_name text;
BEGIN
  SELECT COALESCE(full_name, 'Adsız istifadəçi') INTO _reviewer_name FROM public.profiles WHERE user_id = NEW.reviewer_id;
  SELECT COALESCE(full_name, 'Adsız istifadəçi') INTO _reviewed_name FROM public.profiles WHERE user_id = NEW.reviewed_user_id;
  PERFORM notify_admins(
    'new_review',
    'Yeni rəy yazıldı',
    _reviewer_name || ' tərəfindən ' || _reviewed_name || ' üçün ' || NEW.rating || ' ulduzlu rəy yazıldı' || COALESCE('. Şərh: ' || NEW.comment, ''),
    NULL
  );
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.on_new_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _sender_name text;
BEGIN
  SELECT COALESCE(full_name, 'Adsız istifadəçi') INTO _sender_name FROM public.profiles WHERE user_id = NEW.sender_id;
  PERFORM notify_admins(
    'new_message',
    'Yeni mesaj göndərildi',
    _sender_name || ' tərəfindən mesaj: ' || LEFT(NEW.content, 150),
    NULL
  );
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.on_new_favorite()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _user_name text;
  _listing_title text;
BEGIN
  SELECT COALESCE(full_name, 'Adsız istifadəçi') INTO _user_name FROM public.profiles WHERE user_id = NEW.user_id;
  SELECT title INTO _listing_title FROM public.listings WHERE id = NEW.listing_id;
  PERFORM notify_admins(
    'new_favorite',
    'Elan seçilmişlərə əlavə edildi',
    _user_name || ' tərəfindən "' || COALESCE(_listing_title, 'Naməlum elan') || '" seçilmişlərə əlavə edildi',
    '/product/' || NEW.listing_id::text
  );
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.on_new_user_profile()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM notify_admins(
    'new_user',
    'Yeni istifadəçi qeydiyyatdan keçdi',
    COALESCE(NEW.full_name, 'Adsız istifadəçi') || ' qeydiyyatdan keçdi.' || COALESCE(' Şəhər: ' || NEW.city, ''),
    NULL
  );
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_store_followers_on_listing()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.store_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    SELECT
      sf.user_id,
      s.name || ' yeni elan paylaşdı',
      '"' || NEW.title || '" adlı elan yerləşdirildi. Qiymət: ' || NEW.price || ' ' || NEW.currency,
      'info',
      '/product/' || NEW.id::text
    FROM public.store_followers sf
    JOIN public.stores s ON s.id = NEW.store_id
    WHERE sf.store_id = NEW.store_id
      AND sf.user_id <> NEW.user_id;
  END IF;
  RETURN NEW;
END;
$function$;