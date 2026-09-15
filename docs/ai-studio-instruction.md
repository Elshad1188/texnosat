# AI Studio agentinə göndərilməli mətn (kopyala–yapışdır)

STOP — heç bir `CREATE TABLE` işə salma. Baza artıq hazırdır və sayt onunla işləyir.
Sənin təklif etdiyin `users`, `ads`, `favorites(ad_id)`, `conversations(ad_id)` cədvəlləri
YARADILMAMALIDIR. Onları yaratsan tətbiq saytın elanlarını görməyəcək.

## Ad uyğunluğu (səhv → düzgün)

| Sənin adın | Düzgün ad |
|---|---|
| `users` | `profiles` (`user_id` sütunu auth istifadəçisidir, `id` deyil) |
| `ads` | `listings` |
| `ad_id` | `listing_id` |
| `stores.owner_id` | `stores.user_id` |
| `ads.views` | `listings.views_count` |
| `ads.is_vip` | `listings.is_urgent` |
| `ads.has_delivery` | `listings.is_buyable` |
| `status = 'Gözləmədə'` | `status = 'pending'` (ingilis dilində) |

## Qaydalar

1. Yalnız mövcud cədvəllərdən oxu/yaz. Migration, schema dəyişikliyi, trigger YOX.
2. Profil qeydiyyatdan sonra baza trigger-i ilə avtomatik yaranır — `profiles`-a INSERT etmə,
   yalnız `user_id = auth.uid()` ilə oxu və update et.
3. Elan yaradarkən `status` və `is_active` GÖNDƏRMƏ — avtomatik `pending` / `false` düşür,
   admin təsdiqindən sonra görünür. `approved` göndərmək RLS tərəfindən bloklanır.
4. Bütün icazələr RLS ilə tokenə görə işləyir: hər sorğuda `Authorization: Bearer <jwt>`.
5. Balans, ödəniş, yarışma, baxış sayı, mesaj/söhbət silmə — birbaşa INSERT/UPDATE ilə deyil,
   RPC funksiyaları ilə (bax spesifikasiyanın 6-cı bölməsi).
6. Fayl adları yalnız latın hərfi/rəqəm olmalı, əks halda "Invalid key" xətası verir.

## Elanların oxunması (nümunə)

```
GET /rest/v1/listings?select=*&is_active=eq.true&status=eq.approved&order=created_at.desc
```

Kateqoriya: `listings.category` = `categories.slug`. Şəkillər: `listings.image_urls` (public URL massivi).

## Tam struktur

Sütunlar, standart dəyərlər, RLS qaydaları, storage bucket-ləri, RPC-lər və realtime
`docs/app-backend-spec.md` faylındadır — ondan çıxma.
