
-- 1. Enable RLS on telegram_media_buffer
ALTER TABLE public.telegram_media_buffer ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage telegram media buffer" ON public.telegram_media_buffer;
CREATE POLICY "Admins manage telegram media buffer"
  ON public.telegram_media_buffer FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 2. Tighten site_settings public exposure
DROP POLICY IF EXISTS "Public can view non-sensitive site settings" ON public.site_settings;
DROP POLICY IF EXISTS "Anyone can view site settings" ON public.site_settings;
CREATE POLICY "Public can view non-sensitive site settings"
  ON public.site_settings FOR SELECT TO public
  USING (
    (
      key NOT IN ('smtp', 'email_templates', 'telegram_bot', 'integrations')
      AND key NOT LIKE 'topup_%'
    )
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- 3. Profiles: require authentication to view, drop fully public access
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
CREATE POLICY "Authenticated can view profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (true);
REVOKE SELECT ON public.profiles FROM anon;

-- 4. Stores: only approved stores visible to public; owners/admins/mods see all of theirs
DROP POLICY IF EXISTS "Anyone can view stores" ON public.stores;
CREATE POLICY "Public can view approved stores"
  ON public.stores FOR SELECT TO public
  USING (
    COALESCE(status, 'approved') = 'approved'
    OR auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'moderator'::public.app_role)
  );

-- 5. Scraper schedules: owner can view own
DROP POLICY IF EXISTS "Users can view own scraper schedules" ON public.scraper_schedules;
CREATE POLICY "Users can view own scraper schedules"
  ON public.scraper_schedules FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- 6. Storage: listing-videos folder ownership on insert + update policy
DROP POLICY IF EXISTS "Auth users can upload listing videos" ON storage.objects;
CREATE POLICY "Auth users can upload listing videos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'listing-videos'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );
DROP POLICY IF EXISTS "Users can update own listing videos" ON storage.objects;
CREATE POLICY "Users can update own listing videos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'listing-videos'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'listing-videos'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

-- 7. Revoke EXECUTE from anon on all SECURITY DEFINER functions in public schema
REVOKE EXECUTE ON FUNCTION public.admin_get_user_email(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.delete_conversation_for_user(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.delete_own_message(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.process_referral(text, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.process_spin_win(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.reset_user_spin_cooldown(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.spend_balance(uuid, numeric, text, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.increment_listing_views(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.notify_admins(text, text, text, text) FROM anon, authenticated, public;
