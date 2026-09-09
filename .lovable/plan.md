# AI Studio üçün baza sənədi (bütün cədvəllər + qaydalar)

Tətbiqi yazan agentə vermək üçün bazanın tam təsvirini hazırlayıram: bütün cədvəllər, sütunlar, izahlar, giriş qaydaları və storage.

## Nə hazırlanacaq

Yeni fayl: `docs/app-backend-spec.md` — kopyalayıb AI Studio-ya göndərmək üçün tam sənəd:

### 1. Bağlantı
Backend URL, anon açar, auth / storage / edge function ünvanları. Service role açarının tətbiqə qoyulmaması xəbərdarlığı.

### 2. Bütün cədvəllər (tam siyahı, hər biri bir cümlə izahla)
Bazadan çıxarılacaq real siyahı, mövzulara bölünmüş:

- **Elanlar:** listings, categories, category_fields, regions, favorites, saved_searches, reviews, reports
- **İstifadəçi:** profiles, user_roles, user_followers, referrals, balance_transactions, fcm_tokens
- **Mesajlaşma və zənglər:** conversations, messages, calls, call_ice_candidates
- **Mağaza / satış:** stores, store_followers, store_change_requests, orders, shipping_methods, inventory_movements, payout_requests
- **Reels:** reel_likes, reel_comments, reel_views
- **Bloq:** blog_posts, blog_categories, blog_tags, blog_post_tags, blog_comments, blog_likes
- **Yarışma və hədiyyə:** contests, contest_participants, contest_invites, contest_settings, spin_prizes, spin_history
- **Sistem / admin:** site_settings, banners, pages, translations, notifications, tickets, ticket_messages, email və sms cədvəlləri, telegram cədvəlləri, scraper_schedules

Hər əsas cədvəl üçün (listings, profiles, stores, conversations, messages, favorites, reviews, categories, regions, orders, notifications) tam sütun cədvəli: sütun adı, tip, məcburidir/yox, standart dəyər, izah.

### 3. Giriş qaydaları (kim nə edə bilər)
- Elanlar: hər kəs aktiv elanları görür; yalnız sahibi öz elanını yaradır/dəyişir/silir; admin və moderator hamısını idarə edir.
- Yeni elan həmişə `pending` statusu ilə düşür, `is_active` standart olaraq bağlıdır — admin təsdiqindən sonra görünür. Tətbiq özbaşına `approved` göndərə bilməz.
- Profil qeydiyyatdan sonra avtomatik yaranır (baza trigger-i) — tətbiq əlavə insert etməməlidir.
- Seçilmişlər, mesajlar, söhbətlər: yalnız öz məlumatına giriş.
- Mağaza müraciəti `pending` statusu ilə yaranır.

### 4. Fayl yükləmə (storage)
Mövcud qovluqlar: `listing-images`, `listing-videos`, `chat_media`, `store-logos`, `banners`, `blog-images` — hamısı açıq oxunur, yükləmə üçün giriş tələb olunur. Fayl adı latın hərfləri/rəqəm olmalı (boşluq və AZ hərfləri "Invalid key" xətası verir).

### 5. Xüsusi funksiyalar (birbaşa yazılmır)
Balans, ödəniş, yarışmaya qoşulma, hədiyyə çarxı, referal bonusu, söhbət silmə — server funksiyaları (RPC / edge function) ilə çağırılır. Hər biri üçün ad və parametrlər sənəddə göstəriləcək.

### 6. Realtime
Canlı yenilənmə üçün abunə olunacaq cədvəllər: listings, messages, notifications, calls.

### 7. Xəbərdarlıq
Tətbiq yeni cədvəl qurmamalı — sayt bu cədvəllərə bağlıdır, tətbiq eyni cədvəllərdən oxuyub yazmalıdır.

## Texniki qeydlər

- Sənəd sırf markdown olacaq; kodda və bazada heç bir dəyişiklik edilməyəcək.
- Sütun və qayda məlumatları birbaşa bazadan (information_schema, pg_policies, storage.buckets) oxunub yazılacaq.
