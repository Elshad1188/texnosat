
-- Add email_notifications column to profiles for user preference
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_notifications boolean NOT NULL DEFAULT true;
