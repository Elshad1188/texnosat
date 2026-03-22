
-- Update reel_comments delete policy to include moderators
DROP POLICY IF EXISTS "Admins can delete any comment" ON public.reel_comments;
CREATE POLICY "Admins and moderators can delete any comment" ON public.reel_comments 
FOR DELETE USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'moderator'));

-- Update reviews delete policy to include moderators
DROP POLICY IF EXISTS "Admins can delete any review" ON public.reviews;
CREATE POLICY "Admins and moderators can delete any review" ON public.reviews 
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'moderator'::app_role));
