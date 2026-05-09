INSERT INTO public.translations (key, az, ru) VALUES
('deal.sale','Alqı-satqı','Купля-продажа'),
('deal.rent','Kirayə','Аренда'),
('deal.daily','Günlük','Посуточно'),
('deal.business','Hazır biznes','Готовый бизнес')
ON CONFLICT (key) DO UPDATE SET ru=EXCLUDED.ru, az=EXCLUDED.az;