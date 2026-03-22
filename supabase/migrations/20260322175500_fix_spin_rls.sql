
-- Simplify RLS policies for spin_prizes to ensure admins can always manage them
DROP POLICY IF EXISTS "Admins can manage prizes" ON public.spin_prizes;

CREATE POLICY "Admins can manage prizes"
  ON public.spin_prizes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'::public.app_role
    )
  );

-- Also ensure spin_history is manageable by admins
DROP POLICY IF EXISTS "Admins can view all spin history" ON public.spin_history;

CREATE POLICY "Admins can view all spin history"
  ON public.spin_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin'::public.app_role
    )
  );
