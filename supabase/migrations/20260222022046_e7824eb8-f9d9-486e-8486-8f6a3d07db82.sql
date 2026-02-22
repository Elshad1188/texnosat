
-- Stores table
CREATE TABLE public.stores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  logo_url TEXT,
  description TEXT,
  address TEXT,
  city TEXT DEFAULT 'Bakı',
  phone TEXT,
  working_hours TEXT,
  is_premium BOOLEAN NOT NULL DEFAULT false,
  premium_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view stores" ON public.stores FOR SELECT USING (true);
CREATE POLICY "Users can create their own store" ON public.stores FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own store" ON public.stores FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own store" ON public.stores FOR DELETE USING (auth.uid() = user_id);

-- Listings table
CREATE TABLE public.listings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT '₼',
  category TEXT NOT NULL,
  condition TEXT NOT NULL DEFAULT 'Yeni',
  location TEXT NOT NULL DEFAULT 'Bakı',
  image_urls TEXT[] DEFAULT '{}',
  is_premium BOOLEAN NOT NULL DEFAULT false,
  is_urgent BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  views_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active listings" ON public.listings FOR SELECT USING (is_active = true);
CREATE POLICY "Users can view their own listings" ON public.listings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create listings" ON public.listings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own listings" ON public.listings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own listings" ON public.listings FOR DELETE USING (auth.uid() = user_id);

-- Storage bucket for listing images
INSERT INTO storage.buckets (id, name, public) VALUES ('listing-images', 'listing-images', true);

CREATE POLICY "Anyone can view listing images" ON storage.objects FOR SELECT USING (bucket_id = 'listing-images');
CREATE POLICY "Authenticated users can upload listing images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'listing-images' AND auth.role() = 'authenticated');
CREATE POLICY "Users can update their own listing images" ON storage.objects FOR UPDATE USING (bucket_id = 'listing-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their own listing images" ON storage.objects FOR DELETE USING (bucket_id = 'listing-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Store logos bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('store-logos', 'store-logos', true);

CREATE POLICY "Anyone can view store logos" ON storage.objects FOR SELECT USING (bucket_id = 'store-logos');
CREATE POLICY "Authenticated users can upload store logos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'store-logos' AND auth.role() = 'authenticated');
CREATE POLICY "Users can update their own store logos" ON storage.objects FOR UPDATE USING (bucket_id = 'store-logos' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their own store logos" ON storage.objects FOR DELETE USING (bucket_id = 'store-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Triggers for updated_at
CREATE TRIGGER update_stores_updated_at BEFORE UPDATE ON public.stores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_listings_updated_at BEFORE UPDATE ON public.listings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
