# Tətbiq üçün baza sənədi (schema + qaydalar)

Tətbiqi yazan agent 5 sual verib: profil yaranması, elan yaratmaq, seçilmişlər, mesajlaşma, mağazalar. Cavabları bazadan yoxladım. Onları bir sənəd şəklində layihəyə yazıram ki, siz sadəcə kopyalayıb agentə göndərəsiniz.

## Nə hazırlanacaq

Yeni fayl: `docs/app-backend-spec.md` — tətbiq tərəfinə göndərmək üçün tam təlimat:

1. **Bağlantı** — backend URL, anon açar, auth/storage/functions ünvanları.
2. **Profil** — qeydiyyatdan sonra profil avtomatik yaranır (baza trigger-i ilə). Tətbiq `profiles`-a əlavə insert ETMƏMƏLİDİR, yalnız `user_id`-ə görə oxuyub/yeniləyir.
3. **Yeni elan** — `listings` cədvəlinin bütün sütunları, hansı sütunlar məcburidir (`user_id`, `title`, `price`, `category`, `location`), status həmişə `pending` olaraq düşür və admin təsdiqləyir (tətbiq `approved` göndərə bilməz), `is_active` standart `false`.
4. **Şəkillər** — hansı storage qovluqlarına yüklənir: `listing-images`, `listing-videos`, `chat_media`, `store-logos` (hamısı public oxunur, yükləmə üçün giriş tələb olunur) + fayl adının təhlükəsiz formatı (boşluq/AZ hərfləri olmadan, yoxsa "Invalid key" xətası).
5. **Seçilmişlər** — `favorites (user_id, listing_id)` insert/delete, qayda `auth.uid() = user_id`.
6. **Mesajlaşma** — `conversations` (buyer_id, seller_id, listing_id) və `messages` (conversation_id, sender_id, content, image_url, audio_url) insert qaydaları; söhbəti silmək üçün `delete_conversation_for_user` funksiyası; mesajı silmək üçün `delete_own_message`.
7. **Mağazalar və rəylər** — `stores` insert (status `pending`), `reviews` (rating 1-5, öz elanına rəy yazmaq qadağa).
8. **Realtime** — hansı cədvəllərə canlı abunə olmaq (listings, messages, notifications).
9. **Vacib xəbərdarlıqlar** — cədvəlləri yenidən qurmaq YOX; sayt bu cədvəllərə bağlıdır, tətbiq eyni cədvəllərdən oxuyub yazmalıdır. Balans, ödəniş, yarışma və push bildirişləri birbaşa yazılmır — server funksiyaları ilə işləyir.

## Texniki qeydlər

- Sənəd yalnız oxunaqlı markdown olacaq; kodda və bazada dəyişiklik edilməyəcək.
- Bütün RLS ifadələri real bazadan alınmış vəziyyətə uyğun yazılacaq (`pg_policies` yoxlanıldı).
- Əgər tətbiqin bəzi əməliyyatları hazırda RLS ilə bağlıdırsa, sənəddə açıq göstəriləcək və lazım gələrsə ayrıca icazə əlavə etməyi sizinlə razılaşdıracağam.
