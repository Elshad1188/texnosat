
-- Create user_followers table for following users directly (not just stores)
CREATE TABLE public.user_followers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL,
  followed_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(follower_id, followed_id)
);

ALTER TABLE public.user_followers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view user followers" ON public.user_followers FOR SELECT USING (true);
CREATE POLICY "Users can follow others" ON public.user_followers FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id AND follower_id <> followed_id);
CREATE POLICY "Users can unfollow" ON public.user_followers FOR DELETE TO authenticated USING (auth.uid() = follower_id);
