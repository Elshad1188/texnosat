# Elan24 — Backend spesifikasiyası (mobil tətbiq üçün)

Bu sənəd tətbiqin saytla **eyni bazaya** bağlanması üçündür. Yeni cədvəl qurmaq LAZIM DEYİL — sayt aşağıdaki cədvəllərə bağlıdır, tətbiq də onlardan oxuyub onlara yazmalıdır.

Backend: Supabase (Postgres + Auth + Storage + Realtime + Edge Functions).

---

## 1. Bağlantı

| Nə | Dəyər |
|---|---|
| Backend URL (REST + Realtime) | `https://qkeymzkgymmceclilaot.supabase.co` |
| Anon (publishable) açar | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrZXltemtneW1tY2VjbGlsYW90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2MzI4NjIsImV4cCI6MjA4NzIwODg2Mn0.ZcgU8AK0TLlNP4t8VrD2bNba_QEXEgaZl0a3X-CJ2nQ` |
| Auth | `https://qkeymzkgymmceclilaot.supabase.co/auth/v1` |
| Storage | `https://qkeymzkgymmceclilaot.supabase.co/storage/v1` |
| REST | `https://qkeymzkgymmceclilaot.supabase.co/rest/v1` |
| Edge Functions | `https://qkeymzkgymmceclilaot.supabase.co/functions/v1/<ad>` |

Yalnız **anon** açar tətbiqdə saxlanılır. Service role açarı tətbiqə QOYULMUR.

Auth üsulları: Email/parol, Telefon (SMS), Google, Apple, Microsoft, SAML SSO.
Giriş sonrası alınan JWT hər sorğuda `Authorization: Bearer <token>` ilə göndərilir — bütün icazələr (RLS) həmin tokenə görə işləyir.

---

## 2. Bütün cədvəllər (tam siyahı və izah)

### Elanlar
| Cədvəl | İzah |
|---|---|
| `listings` | Bütün elanlar (əsas cədvəl) |
| `categories` | Kateqoriyalar, iyerarxik (`parent_id`), `site_type` ilə filtr |
| `category_fields` | Kateqoriyaya xas əlavə sahələr (dinamik form sahələri) |
| `regions` | Bölgə/şəhər/rayon iyerarxiyası |
| `favorites` | İstifadəçinin seçilmiş elanları |
| `saved_searches` | Yadda saxlanmış axtarışlar + yeni uyğun elanda bildiriş |
| `reviews` | İstifadəçi/satıcı haqqında rəy və ulduz (1–5) |
| `reports` | Elan/istifadəçi/mağaza barədə şikayətlər |

### İstifadəçi
| Cədvəl | İzah |
|---|---|
| `profiles` | İstifadəçi profili (ad, telefon, avatar, şəhər, balans, referal kodu) |
| `user_roles` | Rollar: `admin`, `moderator`, `user` (profil cədvəlində SAXLANILMIR) |
| `user_followers` | İstifadəçi izləmələri |
| `referrals` | Referal (dəvət) qeydləri və bonus |
| `balance_transactions` | Balans hərəkətləri (mədaxil/məxaric tarixçəsi) |
| `fcm_tokens` | Push bildiriş üçün cihaz tokenləri |

### Mesajlaşma və zənglər
| Cədvəl | İzah |
|---|---|
| `conversations` | Alıcı–satıcı söhbəti (elana bağlı ola bilər) |
| `messages` | Mesajlar (mətn, şəkil, səs) |
| `calls` | WebRTC audio/video zəng qeydləri (offer/answer) |
| `call_ice_candidates` | Zəng üçün ICE nəticələri |

### Mağaza və satış
| Cədvəl | İzah |
|---|---|
| `stores` | Mağazalar (status: `pending`/`approved`) |
| `store_followers` | Mağaza izləyiciləri |
| `store_change_requests` | Mağaza məlumatının dəyişməsi üçün admin sorğusu |
| `orders` | Sifarişlər (status enum: pending/confirmed/shipped/delivered/cancelled/refunded) |
| `shipping_methods` | Mağazanın çatdırılma üsulları |
| `inventory_movements` | Anbar hərəkətləri (stok giriş/çıxış) |
| `payout_requests` | Satıcının pul çıxarma sorğuları |

### Reels (video elanlar)
| Cədvəl | İzah |
|---|---|
| `reel_likes` | Bəyənmələr |
| `reel_comments` | Şərhlər (cavab üçün `parent_id`) |
| `reel_views` | Baxış sayı |

### Bloq
| Cədvəl | İzah |
|---|---|
| `blog_posts` | Bloq yazıları |
| `blog_categories` | Bloq kateqoriyaları |
| `blog_tags`, `blog_post_tags` | Teqlər və əlaqə cədvəli |
| `blog_comments`, `blog_likes` | Şərhlər və bəyənmələr |

### Yarışma və hədiyyə
| Cədvəl | İzah |
|---|---|
| `contests` | Həftəlik yarışmalar və qaliblər |
| `contest_participants` | İştirakçılar (referal kodu, dəvət sayı, ödəniş) |
| `contest_invites` | Dəvətlər |
| `contest_settings` | Yarışma parametrləri (giriş haqqı, faizlər) |
| `spin_prizes`, `spin_history` | Hədiyyə çarxı mükafatları və tarixçə |

### Sistem / admin
| Cədvəl | İzah |
|---|---|
| `site_settings` | Sayt ayarları (key/value JSON: tema, inteqrasiyalar, limitlər) |
| `banners` | Reklam bannerləri (mövqe, tarix aralığı) |
| `pages` | Statik səhifələr (qaydalar, haqqımızda) |
| `translations` | AZ/RU tərcümələr |
| `notifications` | İstifadəçi bildirişləri |
| `tickets`, `ticket_messages` | Dəstək müraciətləri |
| `email_send_log`, `email_send_state`, `email_unsubscribe_tokens`, `suppressed_emails` | Email sistemi |
| `sms_campaigns`, `sms_logs`, `sms_settings` | SMS sistemi |
| `telegram_bot_settings`, `telegram_bot_state`, `telegram_link_tokens`, `telegram_media_buffer` | Telegram bot inteqrasiyası |
| `scraper_schedules` | Avtomatik elan yükləmə cədvəli |

---

## 3. Əsas cədvəllərin sütunları

### `listings`
| Sütun | Tip | Məcburi | Standart |
|---|---|---|---|
| id | uuid | avtomatik | gen_random_uuid() |
| user_id | uuid | **bəli** | — (auth.uid()) |
| store_id | uuid | xeyr | null (mağaza adından elan) |
| title | text | **bəli** | — |
| description | text | xeyr | — |
| price | numeric | **bəli** | — |
| currency | text | bəli | `₼` |
| category | text | **bəli** | — (kateqoriya slug) |
| condition | text | bəli | `Yeni` |
| location | text | bəli | `Bakı` |
| image_urls | text[] | xeyr | `{}` (public URL siyahısı) |
| video_url | text | xeyr | — |
| custom_fields | jsonb | xeyr | — (kateqoriyaya xas sahələr) |
| deal_type | text | bəli | `sale` (`sale` / `rent`) |
| status | text | bəli | **`pending`** |
| is_active | boolean | bəli | **`false`** |
| is_premium / is_urgent | boolean | bəli | false |
| premium_until | timestamptz | xeyr | — |
| is_buyable / stock / cost_price / barcode | — | — | onlayn satış üçün |
| latitude / longitude | double | xeyr | xəritə üçün |
| views_count | integer | bəli | 0 |
| created_at / updated_at | timestamptz | avtomatik | now() |

**Vacib:** tətbiq elan yaradarkən `status` və `is_active` GÖNDƏRMİR — standart olaraq `pending` + `is_active=false` düşür və admin təsdiqləyəndən sonra görünür.

### `profiles`
`id`, `user_id` (auth istifadəçisi), `full_name`, `phone`, `avatar_url`, `city` (standart `Bakı`), `referral_code` (avtomatik yaranır), `referred_by`, `balance` (numeric, 0), `email_notifications` (true), `last_spin_at`, `last_seen`, `presence_state` (`offline`/`active`), `created_at`, `updated_at`.

Qeydiyyatdan sonra profil **avtomatik yaranır** (baza trigger-i `handle_new_user`). Tətbiq `profiles`-a insert ETMİR — yalnız `user_id`-ə görə oxuyur və öz sətrini update edir.

### `stores`
`id`, `user_id`, `name`, `logo_url`, `cover_url`, `description`, `address`, `city`, `phone`, `working_hours`, `instagram_url`, `website_url`, `license_number`, `specialization`, `agent_count`, `established_year`, `is_premium`, `premium_until`, `status` (standart **`pending`**), `created_at`, `updated_at`.

### `conversations`
`id`, `listing_id` (ola bilər null), `buyer_id` (**auth.uid() olmalıdır**), `seller_id`, `last_message_at`, `created_at`.

### `messages`
`id`, `conversation_id`, `sender_id` (**auth.uid()**), `content` (məcburi), `image_url`, `audio_url`, `sender_store_id` (mağaza adından yazanda), `is_read`, `is_delivered`, `created_at`.

### `favorites`
`id`, `user_id` (**auth.uid()**), `listing_id`, `created_at`.

### `reviews`
`id`, `reviewer_id`, `reviewed_user_id`, `listing_id`, `rating` (1–5, trigger yoxlayır), `comment`, `created_at`, `updated_at`.

### `categories`
`id`, `name`, `name_ru`, `slug`, `icon` (lucide ikon adı), `parent_id`, `sort_order`, `is_active`, `site_type` (`real_estate` / `general` / `both`).

### `regions`
`id`, `name`, `parent_id`, `type` (`region`/`city`/`district`), `sort_order`, `is_active`.

### `notifications`
`id`, `user_id`, `type` (standart `info`), `title`, `message`, `link`, `is_read`, `created_at`.

### `orders`
`id`, `order_number` (avtomatik `ORD-XXXXXXXX`), `buyer_id`, `seller_id`, `store_id`, `listing_id`, `status` (enum, standart `pending`), `quantity`, `unit_price`, `shipping_price`, `commission_rate`, `commission_amount`, `total_amount`, `payment_method` (standart `balance`), `shipping_method_id`, `shipping_address`, `tracking_number`, `tracking_url`, `buyer_note`, `seller_note`, tarix sütunları.

### `user_roles`
`id`, `user_id`, `role` (`admin`|`moderator`|`user`). Rol yoxlaması: `has_role(auth.uid(), 'admin')`.

---

## 4. Giriş qaydaları (RLS) — kim nə edə bilər

**listings**
- Oxumaq: hər kəs (girişsiz də) `is_active = true` olan elanları görür. Sahibi öz elanlarını (statusdan asılı olmayaraq) görür. Admin/moderator hamısını görür.
- Yaratmaq: giriş etmiş istifadəçi, `user_id = auth.uid()` olmalıdır.
- Dəyişmək/silmək: yalnız sahibi (və admin/moderator).

**profiles** — hər kəs əsas profil məlumatını oxuya bilir (public view vasitəsilə); yalnız sahibi öz profilini update edir. Silmək qadağadır.

**favorites** — yalnız `auth.uid() = user_id` olan sətirləri görür, əlavə və silir. Update yoxdur (əlavə et / sil).

**conversations** — görmək: `auth.uid()` buyer və ya seller olmalıdır. Yaratmaq: `buyer_id = auth.uid()`. Silmək: iştirakçı. Söhbəti hər iki tərəf üçün düzgün silmək üçün RPC: `delete_conversation_for_user(_conversation_id)`.

**messages** — görmək/göndərmək: yalnız öz söhbətində, `sender_id = auth.uid()`. Oxunmuş işarələmək: qarşı tərəf. Öz mesajını silmək üçün RPC: `delete_own_message(_message_id)`.

**stores** — hər kəs təsdiqlənmiş mağazaları görür; istifadəçi öz mağazasını yaradır (`user_id = auth.uid()`, status `pending` düşür); dəyişiklik üçün `store_change_requests`.

**reviews** — hər kəs oxuyur; `reviewer_id = auth.uid()` ilə yazılır; rating 1–5 (trigger).

**notifications** — yalnız öz bildirişlərini görür və oxunmuş işarələyir. Bildirişlər əsasən baza trigger-ləri ilə avtomatik yaranır.

**reports, tickets, saved_searches, reel_likes/comments** — hamısı `auth.uid() = user_id` prinsipi ilə.

---

## 5. Fayl yükləmə (Storage)

Mövcud bucket-lər (hamısı **public oxunur**, yükləmə üçün giriş tələb olunur):

| Bucket | Nə üçün |
|---|---|
| `listing-images` | Elan şəkilləri |
| `listing-videos` | Elan videoları (reels) |
| `chat_media` | Mesajdaki şəkil/səs (istifadəçi öz qovluğuna: `<user_id>/fayl`) |
| `store-logos` | Mağaza loqo/cover |
| `banners` | Admin bannerləri |
| `blog-images` | Bloq şəkilləri |

Qaydalar:
1. Fayl adı yalnız latın hərfi, rəqəm, `-`, `_`, `.` olmalıdır. Boşluq və AZ hərfləri (ə, ö, ü, ş, ç, ğ, ı) **"Invalid key"** xətası verir — adı əvvəlcə təmizləyin və random prefiks əlavə edin, məsələn: `1712345678-a83f2.jpg`.
2. Yüklədikdən sonra public URL alın və `listings.image_urls` massivinə yazın:
   `https://qkeymzkgymmceclilaot.supabase.co/storage/v1/object/public/listing-images/<yol>`
3. `chat_media`-da fayl mütləq istifadəçinin öz `user_id` qovluğunda olmalıdır.

---

## 6. Server funksiyaları (birbaşa yazılmır)

Bu əməliyyatlar cədvələ birbaşa insert ilə DEYİL, RPC / Edge Function çağırışı ilə edilir:

| Funksiya | Nə edir |
|---|---|
| `spend_balance(_user_id, _amount, _description, _reference_id)` | Balansdan çıxarır (atomik) |
| `process_referral(_referral_code, _new_user_id)` | Referal bonusu verir |
| `process_spin_win(_prize_id)` | Hədiyyə çarxı uduşu |
| `register_contest_invite(_referral_code)` | Yarışma dəvəti qeyd edir |
| `process_contest_join` / `process_contest_free_join` | Yarışmaya qoşulma |
| `increment_listing_views(_listing_id)` | Baxış sayını artırır |
| `delete_conversation_for_user`, `delete_own_message` | Söhbət/mesaj silmə |
| `has_role(_user_id, _role)` | Rol yoxlaması |

Edge Functions: `epoint-payment`, `epoint-callback` (ödəniş), `send-user-push` (push), `visual-search`, `ai-listing-autofill`, `listing-share`, `chatbot`.

Çağırış nümunəsi (REST):
`POST /rest/v1/rpc/increment_listing_views` — body: `{"_listing_id":"<uuid>"}`, header-lərdə `apikey` + `Authorization`.

---

## 7. Realtime (canlı yenilənmə)

`postgres_changes` kanalı, schema `public`:

| Cədvəl | Hadisə | Nə üçün |
|---|---|---|
| `listings` | INSERT/UPDATE | yeni elanlar dərhal görünsün |
| `messages` | INSERT | canlı çat |
| `notifications` | INSERT | bildiriş zəngi |
| `calls` | INSERT/UPDATE | gələn zəng |

---

## 8. Vacib qaydalar

1. **Yeni cədvəl qurulmur.** Sayt bu strukturla işləyir; tətbiq eyni cədvəllərə bağlanır.
2. Sütun adları bura yazıldığı kimi olmalıdır (`listing_id`, `user_id` — `ad_id` YOX).
3. Elan həmişə `pending` düşür; tətbiq `approved` göndərə bilməz (RLS icazə vermir).
4. Balans, ödəniş, yarışma, push — yalnız server funksiyaları ilə.
5. Şəkil adları latın hərfləri ilə (bax bölmə 5).
6. Sayt AZ və RU dillərini dəstəkləyir: `categories.name_ru`, `translations` cədvəli.
