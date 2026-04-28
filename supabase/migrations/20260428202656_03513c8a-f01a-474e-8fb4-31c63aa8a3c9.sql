
-- 1) Migrate existing 'roommate' listings to 'sale' so trigger update doesn't fail
UPDATE public.listings SET deal_type = 'sale' WHERE deal_type = 'roommate';

-- 2) Update validation trigger function
CREATE OR REPLACE FUNCTION public.validate_listing_deal_type()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.deal_type NOT IN ('sale', 'rent', 'daily', 'business') THEN
    RAISE EXCEPTION 'Invalid deal_type: %. Allowed: sale, rent, daily, business', NEW.deal_type;
  END IF;
  RETURN NEW;
END;
$function$;

-- 3) Insert category fields for hazir-biznes
DELETE FROM public.category_fields WHERE category_slug = 'hazir-biznes';

INSERT INTO public.category_fields (category_slug, field_name, field_label, field_type, options, is_required, sort_order, is_active) VALUES
('hazir-biznes', 'deal_type', 'Əməliyyat növü', 'select', '["Satılır","Kirayəyə verilir","Pay satılır"]'::jsonb, true, 1, true),
('hazir-biznes', 'business_area_m2', 'Sahə (m²)', 'number', NULL, false, 2, true),
('hazir-biznes', 'monthly_revenue', 'Aylıq dövriyyə (AZN)', 'number', NULL, false, 3, true),
('hazir-biznes', 'monthly_profit', 'Aylıq xalis gəlir (AZN)', 'number', NULL, false, 4, true),
('hazir-biznes', 'staff_count', 'İşçi sayı', 'number', NULL, false, 5, true),
('hazir-biznes', 'operating_years', 'Neçə ildir fəaliyyətdədir', 'number', NULL, false, 6, true),
('hazir-biznes', 'rent_included', 'İcarə daxildir', 'select', '["Bəli","Xeyr","Əmlak özümüzdür"]'::jsonb, false, 7, true),
('hazir-biznes', 'equipment_included', 'Avadanlıq daxildir', 'select', '["Bəli","Xeyr","Qismən"]'::jsonb, false, 8, true),
('hazir-biznes', 'license_status', 'Lisenziya / icazə', 'select', '["Var","Yoxdur","Tələb olunmur"]'::jsonb, false, 9, true),
('hazir-biznes', 'reason_for_sale', 'Satış səbəbi', 'text', NULL, false, 10, true);
