
-- Storage bucket for listing videos
INSERT INTO storage.buckets (id, name, public) VALUES ('listing-videos', 'listing-videos', true);

-- Storage RLS for listing-videos
CREATE POLICY "Anyone can view listing videos" ON storage.objects FOR SELECT USING (bucket_id = 'listing-videos');
CREATE POLICY "Auth users can upload listing videos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'listing-videos' AND auth.role() = 'authenticated');
CREATE POLICY "Users can delete own listing videos" ON storage.objects FOR DELETE USING (bucket_id = 'listing-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add video_url column to listings
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS video_url text DEFAULT NULL;

-- Reels likes table
CREATE TABLE public.reel_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(listing_id, user_id)
);
ALTER TABLE public.reel_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view reel likes" ON public.reel_likes FOR SELECT USING (true);
CREATE POLICY "Auth users can like" ON public.reel_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike" ON public.reel_likes FOR DELETE USING (auth.uid() = user_id);

-- Reels comments table
CREATE TABLE public.reel_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.reel_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view reel comments" ON public.reel_comments FOR SELECT USING (true);
CREATE POLICY "Auth users can comment" ON public.reel_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON public.reel_comments FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can delete any comment" ON public.reel_comments FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- Reels views table
CREATE TABLE public.reel_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.reel_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view reel views" ON public.reel_views FOR SELECT USING (true);
CREATE POLICY "Anyone can insert reel views" ON public.reel_views FOR INSERT WITH CHECK (true);

-- Enable realtime for reel_comments
ALTER PUBLICATION supabase_realtime ADD TABLE public.reel_comments;
