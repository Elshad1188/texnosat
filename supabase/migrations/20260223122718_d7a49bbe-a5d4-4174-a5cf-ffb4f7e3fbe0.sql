
-- ===== 1. FIX ALL RLS POLICIES (RESTRICTIVE -> PERMISSIVE) =====

-- LISTINGS: Drop all restrictive policies
DROP POLICY IF EXISTS "Anyone can view active listings" ON public.listings;
DROP POLICY IF EXISTS "Users can view their own listings" ON public.listings;
DROP POLICY IF EXISTS "Admins can view all listings" ON public.listings;
DROP POLICY IF EXISTS "Users can create listings" ON public.listings;
DROP POLICY IF EXISTS "Users can update their own listings" ON public.listings;
DROP POLICY IF EXISTS "Users can delete their own listings" ON public.listings;
DROP POLICY IF EXISTS "Admins can update any listing" ON public.listings;
DROP POLICY IF EXISTS "Admins can delete any listing" ON public.listings;

-- Recreate as PERMISSIVE (default)
CREATE POLICY "Anyone can view active listings" ON public.listings FOR SELECT USING (is_active = true);
CREATE POLICY "Users can view own listings" ON public.listings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all listings" ON public.listings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can create listings" ON public.listings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own listings" ON public.listings FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own listings" ON public.listings FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can update any listing" ON public.listings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete any listing" ON public.listings FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- PROFILES: Drop and recreate
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;

CREATE POLICY "Anyone can view profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can update any profile" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- STORES: Drop and recreate
DROP POLICY IF EXISTS "Anyone can view stores" ON public.stores;
DROP POLICY IF EXISTS "Users can create their own store" ON public.stores;
DROP POLICY IF EXISTS "Users can update their own store" ON public.stores;
DROP POLICY IF EXISTS "Users can delete their own store" ON public.stores;
DROP POLICY IF EXISTS "Admins can update any store" ON public.stores;
DROP POLICY IF EXISTS "Admins can delete any store" ON public.stores;

CREATE POLICY "Anyone can view stores" ON public.stores FOR SELECT USING (true);
CREATE POLICY "Users can create own store" ON public.stores FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own store" ON public.stores FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own store" ON public.stores FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can update any store" ON public.stores FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete any store" ON public.stores FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- USER_ROLES: Drop and recreate
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ===== 2. CATEGORIES TABLE =====
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  icon text DEFAULT 'CircuitBoard',
  parent_id uuid REFERENCES public.categories(id) ON DELETE CASCADE,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Admins can insert categories" ON public.categories FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update categories" ON public.categories FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete categories" ON public.categories FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ===== 3. REGIONS TABLE =====
CREATE TABLE public.regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  parent_id uuid REFERENCES public.regions(id) ON DELETE CASCADE,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view regions" ON public.regions FOR SELECT USING (true);
CREATE POLICY "Admins can insert regions" ON public.regions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update regions" ON public.regions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete regions" ON public.regions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ===== 4. REVIEWS TABLE =====
CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_id uuid NOT NULL,
  reviewed_user_id uuid NOT NULL,
  listing_id uuid REFERENCES public.listings(id) ON DELETE CASCADE,
  rating integer NOT NULL,
  comment text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Validation trigger for rating (1-5)
CREATE OR REPLACE FUNCTION public.validate_review_rating()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.rating < 1 OR NEW.rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5';
  END IF;
  IF NEW.reviewer_id = NEW.reviewed_user_id THEN
    RAISE EXCEPTION 'Cannot review yourself';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_review_before_insert
  BEFORE INSERT OR UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.validate_review_rating();

CREATE TRIGGER update_reviews_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view reviews" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Auth users can create reviews" ON public.reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = reviewer_id);
CREATE POLICY "Users can update own reviews" ON public.reviews FOR UPDATE TO authenticated USING (auth.uid() = reviewer_id);
CREATE POLICY "Users can delete own reviews" ON public.reviews FOR DELETE TO authenticated USING (auth.uid() = reviewer_id);
CREATE POLICY "Admins can delete any review" ON public.reviews FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ===== 5. STORE COVER =====
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS cover_url text;

-- ===== 6. SEED CATEGORIES =====
INSERT INTO public.categories (name, slug, icon, sort_order) VALUES
  ('Telefonlar', 'telefonlar', 'Smartphone', 1),
  ('Noutbuklar', 'noutbuklar', 'Laptop', 2),
  ('Planşetlər', 'plansetler', 'Tablet', 3),
  ('Qulaqlıqlar', 'qulaqliqlar', 'Headphones', 4),
  ('Televizorlar', 'televizorlar', 'Monitor', 5),
  ('Oyun konsolları', 'oyun-konsollari', 'Gamepad2', 6),
  ('Kameralar', 'kameralar', 'Camera', 7),
  ('Aksesuarlar', 'aksesuarlar', 'Watch', 8),
  ('Kompüter hissələri', 'komputer-hisseleri', 'Cpu', 9),
  ('Printer & Skaner', 'printer-skaner', 'Printer', 10),
  ('Smart ev', 'smart-ev', 'Wifi', 11),
  ('Digər', 'diger', 'CircuitBoard', 12);

-- ===== 7. SEED REGIONS =====
INSERT INTO public.regions (name, sort_order) VALUES
  ('Bakı', 1), ('Sumqayıt', 2), ('Gəncə', 3), ('Mingəçevir', 4),
  ('Lənkəran', 5), ('Şəki', 6), ('Şirvan', 7), ('Naxçıvan', 8),
  ('Abşeron', 9), ('Digər', 10);
