
-- First delete all existing categories
DELETE FROM categories;

-- Insert main categories with subcategories for a general classified ads platform (Elan24)

-- 1. Elektronika
INSERT INTO categories (name, slug, icon, parent_id, sort_order, is_active) VALUES
('Elektronika', 'elektronika', 'Smartphone', null, 1, true);

INSERT INTO categories (name, slug, icon, parent_id, sort_order, is_active) VALUES
('Telefonlar', 'telefonlar', 'Smartphone', (SELECT id FROM categories WHERE slug='elektronika'), 1, true),
('Noutbuklar', 'noutbuklar', 'Laptop', (SELECT id FROM categories WHERE slug='elektronika'), 2, true),
('Planşetlər', 'plansetler', 'Tablet', (SELECT id FROM categories WHERE slug='elektronika'), 3, true),
('Kompüter aksesuarları', 'komputer-aksesuarlari', 'Mouse', (SELECT id FROM categories WHERE slug='elektronika'), 4, true),
('TV və Audio', 'tv-audio', 'Tv', (SELECT id FROM categories WHERE slug='elektronika'), 5, true),
('Fotoaparatlar', 'fotoaparatlar', 'Camera', (SELECT id FROM categories WHERE slug='elektronika'), 6, true),
('Oyun konsolları', 'oyun-konsollari', 'Gamepad2', (SELECT id FROM categories WHERE slug='elektronika'), 7, true),
('Ağıllı saatlar', 'agilli-saatlar', 'Watch', (SELECT id FROM categories WHERE slug='elektronika'), 8, true);

-- 2. Nəqliyyat
INSERT INTO categories (name, slug, icon, parent_id, sort_order, is_active) VALUES
('Nəqliyyat', 'neqliyyat', 'Car', null, 2, true);

INSERT INTO categories (name, slug, icon, parent_id, sort_order, is_active) VALUES
('Avtomobillər', 'avtomobiller', 'Car', (SELECT id FROM categories WHERE slug='neqliyyat'), 1, true),
('Motosikletlər', 'motosikletler', 'Bike', (SELECT id FROM categories WHERE slug='neqliyyat'), 2, true),
('Ehtiyat hissələri', 'ehtiyat-hisseleri', 'Cog', (SELECT id FROM categories WHERE slug='neqliyyat'), 3, true),
('Yük maşınları', 'yuk-masinlari', 'Truck', (SELECT id FROM categories WHERE slug='neqliyyat'), 4, true),
('Su nəqliyyatı', 'su-neqliyyati', 'Ship', (SELECT id FROM categories WHERE slug='neqliyyat'), 5, true),
('Velosipedlər', 'velosipedler', 'Bike', (SELECT id FROM categories WHERE slug='neqliyyat'), 6, true);

-- 3. Daşınmaz əmlak
INSERT INTO categories (name, slug, icon, parent_id, sort_order, is_active) VALUES
('Daşınmaz əmlak', 'dasinmaz-emlak', 'Building', null, 3, true);

INSERT INTO categories (name, slug, icon, parent_id, sort_order, is_active) VALUES
('Mənzillər', 'menziller', 'Building2', (SELECT id FROM categories WHERE slug='dasinmaz-emlak'), 1, true),
('Evlər / Villalar', 'evler-villalar', 'Home', (SELECT id FROM categories WHERE slug='dasinmaz-emlak'), 2, true),
('Torpaq sahələri', 'torpaq-saheleri', 'MapPin', (SELECT id FROM categories WHERE slug='dasinmaz-emlak'), 3, true),
('Kommersiya əmlakı', 'kommersiya-emlaki', 'Warehouse', (SELECT id FROM categories WHERE slug='dasinmaz-emlak'), 4, true),
('Qarajlar', 'qarajlar', 'Building', (SELECT id FROM categories WHERE slug='dasinmaz-emlak'), 5, true),
('Günlük kirayə', 'gunluk-kiraye', 'Home', (SELECT id FROM categories WHERE slug='dasinmaz-emlak'), 6, true);

-- 4. Ev və bağ
INSERT INTO categories (name, slug, icon, parent_id, sort_order, is_active) VALUES
('Ev və bağ', 'ev-ve-bag', 'Home', null, 4, true);

INSERT INTO categories (name, slug, icon, parent_id, sort_order, is_active) VALUES
('Mebel', 'mebel', 'Sofa', (SELECT id FROM categories WHERE slug='ev-ve-bag'), 1, true),
('Məişət texnikası', 'meiset-texnikasi', 'Zap', (SELECT id FROM categories WHERE slug='ev-ve-bag'), 2, true),
('Mətbəx avadanlığı', 'metbex-avadanliqi', 'Coffee', (SELECT id FROM categories WHERE slug='ev-ve-bag'), 3, true),
('Bağ və təmir', 'bag-ve-temir', 'Hammer', (SELECT id FROM categories WHERE slug='ev-ve-bag'), 4, true),
('İşıqlandırma', 'isiqlandirma', 'Lamp', (SELECT id FROM categories WHERE slug='ev-ve-bag'), 5, true),
('Yataq dəstləri', 'yataq-destleri', 'Bed', (SELECT id FROM categories WHERE slug='ev-ve-bag'), 6, true);

-- 5. Geyim və aksesuar
INSERT INTO categories (name, slug, icon, parent_id, sort_order, is_active) VALUES
('Geyim və aksesuar', 'geyim-aksesuar', 'Shirt', null, 5, true);

INSERT INTO categories (name, slug, icon, parent_id, sort_order, is_active) VALUES
('Kişi geyimləri', 'kisi-geyimleri', 'Shirt', (SELECT id FROM categories WHERE slug='geyim-aksesuar'), 1, true),
('Qadın geyimləri', 'qadin-geyimleri', 'ShoppingBag', (SELECT id FROM categories WHERE slug='geyim-aksesuar'), 2, true),
('Uşaq geyimləri', 'usaq-geyimleri', 'Baby', (SELECT id FROM categories WHERE slug='geyim-aksesuar'), 3, true),
('Ayaqqabılar', 'ayaqqabilar', 'ShoppingBag', (SELECT id FROM categories WHERE slug='geyim-aksesuar'), 4, true),
('Aksesuarlar', 'aksesuarlar', 'Crown', (SELECT id FROM categories WHERE slug='geyim-aksesuar'), 5, true),
('Saatlar və zinət', 'saatlar-zinet', 'Gem', (SELECT id FROM categories WHERE slug='geyim-aksesuar'), 6, true);

-- 6. İş və xidmətlər
INSERT INTO categories (name, slug, icon, parent_id, sort_order, is_active) VALUES
('İş və xidmətlər', 'is-ve-xidmetler', 'Briefcase', null, 6, true);

INSERT INTO categories (name, slug, icon, parent_id, sort_order, is_active) VALUES
('Vakansiyalar', 'vakansiyalar', 'Briefcase', (SELECT id FROM categories WHERE slug='is-ve-xidmetler'), 1, true),
('İş axtarıram', 'is-axtariram', 'User', (SELECT id FROM categories WHERE slug='is-ve-xidmetler'), 2, true),
('Təmir xidmətləri', 'temir-xidmetleri', 'Wrench', (SELECT id FROM categories WHERE slug='is-ve-xidmetler'), 3, true),
('Təhsil / Kurslar', 'tehsil-kurslar', 'GraduationCap', (SELECT id FROM categories WHERE slug='is-ve-xidmetler'), 4, true),
('Gözəllik xidmətləri', 'gozellik-xidmetleri', 'Scissors', (SELECT id FROM categories WHERE slug='is-ve-xidmetler'), 5, true),
('Nəqliyyat xidmətləri', 'neqliyyat-xidmetleri', 'Truck', (SELECT id FROM categories WHERE slug='is-ve-xidmetler'), 6, true);

-- 7. Hobbi və idman
INSERT INTO categories (name, slug, icon, parent_id, sort_order, is_active) VALUES
('Hobbi və idman', 'hobbi-idman', 'Trophy', null, 7, true);

INSERT INTO categories (name, slug, icon, parent_id, sort_order, is_active) VALUES
('İdman avadanlığı', 'idman-avadanliqi', 'Trophy', (SELECT id FROM categories WHERE slug='hobbi-idman'), 1, true),
('Velosipedlər', 'hobbi-velosipedler', 'Bike', (SELECT id FROM categories WHERE slug='hobbi-idman'), 2, true),
('Musiqi alətləri', 'musiqi-aletleri', 'Music', (SELECT id FROM categories WHERE slug='hobbi-idman'), 3, true),
('Kitablar', 'kitablar', 'BookOpen', (SELECT id FROM categories WHERE slug='hobbi-idman'), 4, true),
('Ovçuluq və balıqçılıq', 'ovculuq-baliqciliq', 'Target', (SELECT id FROM categories WHERE slug='hobbi-idman'), 5, true),
('Turizm avadanlığı', 'turizm-avadanliqi', 'Tent', (SELECT id FROM categories WHERE slug='hobbi-idman'), 6, true);

-- 8. Heyvanlar
INSERT INTO categories (name, slug, icon, parent_id, sort_order, is_active) VALUES
('Heyvanlar', 'heyvanlar', 'Heart', null, 8, true);

INSERT INTO categories (name, slug, icon, parent_id, sort_order, is_active) VALUES
('İtlər', 'itler', 'Heart', (SELECT id FROM categories WHERE slug='heyvanlar'), 1, true),
('Pişiklər', 'pisikler', 'Heart', (SELECT id FROM categories WHERE slug='heyvanlar'), 2, true),
('Quşlar', 'quslar', 'Heart', (SELECT id FROM categories WHERE slug='heyvanlar'), 3, true),
('Akvariumlar', 'akvariumlar', 'Heart', (SELECT id FROM categories WHERE slug='heyvanlar'), 4, true),
('Heyvan aksesuarları', 'heyvan-aksesuarlari', 'ShoppingBag', (SELECT id FROM categories WHERE slug='heyvanlar'), 5, true);

-- 9. Uşaq dünyası
INSERT INTO categories (name, slug, icon, parent_id, sort_order, is_active) VALUES
('Uşaq dünyası', 'usaq-dunyasi', 'Baby', null, 9, true);

INSERT INTO categories (name, slug, icon, parent_id, sort_order, is_active) VALUES
('Uşaq geyimləri', 'usaq-dunyasi-geyim', 'Baby', (SELECT id FROM categories WHERE slug='usaq-dunyasi'), 1, true),
('Oyuncaqlar', 'oyuncaqlar', 'Gamepad', (SELECT id FROM categories WHERE slug='usaq-dunyasi'), 2, true),
('Uşaq arabaları', 'usaq-arabalari', 'Baby', (SELECT id FROM categories WHERE slug='usaq-dunyasi'), 3, true),
('Uşaq mebeli', 'usaq-mebeli', 'Sofa', (SELECT id FROM categories WHERE slug='usaq-dunyasi'), 4, true);

-- 10. Biznes və sənaye
INSERT INTO categories (name, slug, icon, parent_id, sort_order, is_active) VALUES
('Biznes və sənaye', 'biznes-senaye', 'Building2', null, 10, true);

INSERT INTO categories (name, slug, icon, parent_id, sort_order, is_active) VALUES
('Biznes avadanlığı', 'biznes-avadanliqi', 'Printer', (SELECT id FROM categories WHERE slug='biznes-senaye'), 1, true),
('Tikinti materialları', 'tikinti-materiallari', 'Hammer', (SELECT id FROM categories WHERE slug='biznes-senaye'), 2, true),
('Kənd təsərrüfatı', 'kend-teserrufati', 'Leaf', (SELECT id FROM categories WHERE slug='biznes-senaye'), 3, true),
('Sənaye avadanlığı', 'senaye-avadanliqi', 'Cog', (SELECT id FROM categories WHERE slug='biznes-senaye'), 4, true);

-- 11. Sağlamlıq və gözəllik
INSERT INTO categories (name, slug, icon, parent_id, sort_order, is_active) VALUES
('Sağlamlıq və gözəllik', 'saglamliq-gozellik', 'Heart', null, 11, true);

INSERT INTO categories (name, slug, icon, parent_id, sort_order, is_active) VALUES
('Tibbi avadanlıq', 'tibbi-avadanliq', 'Pill', (SELECT id FROM categories WHERE slug='saglamliq-gozellik'), 1, true),
('Kosmetika', 'kosmetika', 'Star', (SELECT id FROM categories WHERE slug='saglamliq-gozellik'), 2, true),
('Parfümeriya', 'parfumeriya', 'Star', (SELECT id FROM categories WHERE slug='saglamliq-gozellik'), 3, true),
('Əczaçılıq', 'eczaciliq', 'Pill', (SELECT id FROM categories WHERE slug='saglamliq-gozellik'), 4, true);

-- 12. Əyləncə və tədbirlər
INSERT INTO categories (name, slug, icon, parent_id, sort_order, is_active) VALUES
('Əyləncə və tədbirlər', 'eylence-tedbirler', 'Ticket', null, 12, true);

INSERT INTO categories (name, slug, icon, parent_id, sort_order, is_active) VALUES
('Biletlər', 'biletler', 'Ticket', (SELECT id FROM categories WHERE slug='eylence-tedbirler'), 1, true),
('Tədbir xidmətləri', 'tedbir-xidmetleri', 'Music', (SELECT id FROM categories WHERE slug='eylence-tedbirler'), 2, true),
('Foto / Video xidmətləri', 'foto-video-xidmetleri', 'Film', (SELECT id FROM categories WHERE slug='eylence-tedbirler'), 3, true);

-- 13. Qida və içki
INSERT INTO categories (name, slug, icon, parent_id, sort_order, is_active) VALUES
('Qida və içki', 'qida-icki', 'Apple', null, 13, true);

INSERT INTO categories (name, slug, icon, parent_id, sort_order, is_active) VALUES
('Ev yeməkləri', 'ev-yemekleri', 'Pizza', (SELECT id FROM categories WHERE slug='qida-icki'), 1, true),
('İçkilər', 'ickiler', 'Coffee', (SELECT id FROM categories WHERE slug='qida-icki'), 2, true),
('Tort və şirniyyat', 'tort-sirniyyat', 'Apple', (SELECT id FROM categories WHERE slug='qida-icki'), 3, true);

-- 14. Digər
INSERT INTO categories (name, slug, icon, parent_id, sort_order, is_active) VALUES
('Digər', 'diger', 'Package', null, 14, true);
