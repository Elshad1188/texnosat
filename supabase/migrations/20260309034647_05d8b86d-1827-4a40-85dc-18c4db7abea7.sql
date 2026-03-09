
-- Fix overly permissive notifications insert policy
DROP POLICY "Admins can insert notifications" ON public.notifications;

-- System/admin can insert notifications, and users can insert for themselves  
CREATE POLICY "System can insert notifications" ON public.notifications 
  FOR INSERT TO authenticated 
  WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));
