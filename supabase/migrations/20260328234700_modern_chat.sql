-- Alter messages table for modern features
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS is_delivered BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS audio_url TEXT;

-- Alter profiles table for last seen
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT now();

-- Create chat_media bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat_media', 'chat_media', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for chat_media
CREATE POLICY "Public chat media access" ON storage.objects FOR SELECT USING (bucket_id = 'chat_media');
CREATE POLICY "Authenticated users can upload chat media" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'chat_media' AND auth.role() = 'authenticated');
CREATE POLICY "Users can update own chat media" ON storage.objects FOR UPDATE USING (bucket_id = 'chat_media' AND auth.uid() = owner);
CREATE POLICY "Users can delete own chat media" ON storage.objects FOR DELETE USING (bucket_id = 'chat_media' AND auth.uid() = owner);
