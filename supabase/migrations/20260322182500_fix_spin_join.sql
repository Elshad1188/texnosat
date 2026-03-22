
-- Add foreign key from spin_history to profiles to allow easier joining
ALTER TABLE public.spin_history 
  ADD CONSTRAINT spin_history_user_id_profiles_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(user_id)
  ON DELETE CASCADE;
