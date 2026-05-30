
-- 1. Fix chat_media storage INSERT policy
DROP POLICY IF EXISTS "Authenticated users can upload chat media" ON storage.objects;
CREATE POLICY "Authenticated users can upload chat media"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'chat_media'
    AND auth.role() = 'authenticated'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );

-- 2. Restrict profiles SELECT
DROP POLICY IF EXISTS "Authenticated can view profiles" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins and moderators can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'moderator'::public.app_role)
  );

CREATE OR REPLACE VIEW public.profiles_public AS
SELECT
  user_id,
  full_name,
  avatar_url,
  phone,
  city,
  presence_state,
  last_seen,
  created_at
FROM public.profiles;

ALTER VIEW public.profiles_public SET (security_invoker = false);
GRANT SELECT ON public.profiles_public TO anon, authenticated;

-- 3. Hide contest_participants.amount_paid
REVOKE SELECT (amount_paid) ON public.contest_participants FROM anon;
REVOKE SELECT (amount_paid) ON public.contest_participants FROM authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_contest_participants(_contest_id uuid)
RETURNS TABLE (
  user_id uuid,
  invites_count integer,
  entries_count integer,
  amount_paid numeric,
  full_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin'::public.app_role)
          OR public.has_role(auth.uid(), 'moderator'::public.app_role)) THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  RETURN QUERY
  SELECT cp.user_id, cp.invites_count, cp.entries_count, cp.amount_paid,
         COALESCE(p.full_name, 'Adsız') AS full_name
  FROM public.contest_participants cp
  LEFT JOIN public.profiles p ON p.user_id = cp.user_id
  WHERE cp.contest_id = _contest_id
  ORDER BY cp.invites_count DESC, cp.created_at ASC;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_list_contest_participants(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_contest_participants(uuid) TO authenticated, service_role;
