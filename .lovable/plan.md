
# CJdropshipping inteqrasiyası

Elan24-ə CJ Dropshipping inteqrasiyası əlavə olunur: məhsullar avtomatik çəkilir, üzərinə admin komissiyası (faiz + sabit AZN) əlavə edilir, müştəri ödəyəndə admin paneldə təsdiq düyməsi ilə CJ-də avtomatik sifariş yaradılır.

## 1. Hazırlıq (sizin tərəfdən)

Siz [developers.cjdropshipping.com](https://developers.cjdropshipping.com) saytında:
1. Qeydiyyatdan keçin (CJ hesabınız varsa eyni email)
2. **API Key** alın (Profile → Authorization → API Keys)
3. CJ balansınızı doldurun (sifarişlər oradan ödəniləcək)
4. Açarı hazır olduqda mənə deyin — `add_secret` ilə təhlükəsiz saxlayacam: `CJ_API_EMAIL`, `CJ_API_KEY`

## 2. Verilənlər bazası

Yeni cədvəllər:
- **`cj_settings`** — komissiya faizi, sabit əlavə (AZN), USD→AZN məzənnə, avtomatik import on/off, default kateqoriya
- **`cj_products`** — CJ-dən çəkilən məhsullar (pid, variantlar, original_price USD, son satış qiyməti AZN, listing_id bağlantısı, status: pending/imported/disabled)
- **`cj_import_jobs`** — manual axtarış (açar söz/kateqoriya) və trend importları (status, nəticə sayı)
- **`cj_orders`** — Elan24 order ↔ CJ order ID bağlantısı (status: awaiting_admin, placed, shipped, delivered, failed; tracking_number)

RLS: hamısı yalnız admin üçün (`has_role admin`).

## 3. Edge Functions

| Funksiya | İş |
|---|---|
| `cj-search` | Admin axtarış sorğusu → CJ Product List API → nəticələri qaytarır (preview) |
| `cj-import` | Seçilmiş məhsulları `cj_products`-a yazır, qiyməti hesablayır, `listings` cədvəlinə avto-yerləşdirir (admin user altında, store_id = "CJ Store") |
| `cj-trending` | Gündəlik cron (pg_cron) — CJ bestseller API-dən top məhsulları çəkir, avtomatik import edir |
| `cj-place-order` | Admin "Təsdiqlə" düyməsi ilə çağırılır — CJ Create Order API, ünvan + variant ötürür, tracking number alır |
| `cj-sync-tracking` | Hər 6 saatdan bir — açıq sifarişlər üçün CJ-dən status/tracking yeniləyir, müştəriyə bildiriş göndərir |

Bütün funksiyalar CJ-nin Bearer token-i alır (`POST /authentication/getAccessToken`, 15 gün yaşayır → cache `cj_settings.access_token`).

## 4. Qiymət hesablanması

```text
final_price_AZN = (CJ_price_USD × USD_AZN_rate × (1 + komissiya_pct/100)) + sabit_əlavə_AZN
```

Misal: CJ-də 10 USD, məzənnə 1.70, komissiya 30%, sabit 2 AZN
→ `10 × 1.70 × 1.30 + 2 = 24.10 AZN`

Komissiya dəyişəndə admin "Bütün CJ məhsullarının qiymətini yenilə" düyməsini basanda toplu UPDATE işləyir.

## 5. Sifariş axını (yarı-avtomatik)

```text
1. Müştəri CJ məhsulunu alır (mövcud Epoint checkout)
2. Ödəniş uğurlu → cj_orders qeydi yaranır (status: awaiting_admin)
3. Admin panelə bildiriş gəlir + admin email
4. Admin "CJ sifarişləri" tabında görür: müştəri ünvanı, məhsul, qazanc
5. "CJ-də sifariş ver" düyməsi → cj-place-order çağırılır
   - CJ balansından çıxır, tracking number gəlir
6. Müştəriyə bildiriş: "Sifarişiniz göndərilir, tracking: XXX"
7. cj-sync-tracking arxa fonda status izləyir
```

## 6. Admin paneli (yeni tab: "CJdropshipping")

- **Parametrlər**: komissiya %, sabit AZN, USD məzənnə, default kateqoriya, trend auto-import on/off
- **Axtarış & İdxal**: açar söz / CJ kateqoriya seçimi → preview cədvəli → checkbox ilə bulk import
- **İdxal olunmuş məhsullar**: siyahı, qiymət yenilə, deaktiv et, sil
- **CJ Sifarişləri**: gözləyən / verilmiş / çatdırılmış tablar, "Təsdiqlə və CJ-də sifariş ver" düyməsi
- **Statistika**: ümumi gəlir, CJ-yə ödənilən, xalis qazanc

## 7. Frontend

CJ məhsulları normal `listings` cədvəlinə yazıldığı üçün **heç bir front dəyişiklik lazım deyil** — mövcud kart, axtarış, kateqoriya, Buy Now hər şey avtomatik işləyəcək. Sadəcə məhsulun `custom_fields.source = "cj"` flag-i olacaq (idarəetmə üçün).

## 8. İcra mərhələləri

| # | Mərhələ | Vaxt |
|---|---|---|
| 1 | DB cədvəlləri + admin tab UI skeleti + parametrlər | indi |
| 2 | `cj-search` + `cj-import` + admin axtarış UI | API açar gəldikdən sonra |
| 3 | `cj-trending` + pg_cron | mərhələ 2-dən sonra |
| 4 | `cj-place-order` + sifariş tab + bildirişlər | mərhələ 2-dən sonra |
| 5 | `cj-sync-tracking` cron + müştəri bildirişləri | son |

## Texniki qeydlər

- CJ API: `https://developers.cjdropshipping.com/api2.0/v1/...`
- Rate limit: 1 req/sec — funksiyada queue/delay
- Sifariş üçün CJ-nin tələb etdiyi: `shippingZip`, `shippingCountryCode` (AZ), `shippingProvince`, `shippingCity`, `shippingAddress`, `shippingCustomerName`, `shippingPhone`, `email`, `quantity`, `vid` (variant ID), `logisticName` (default: "CJPacket")
- Çatdırılma haqqı CJ-dən ayrıca gəlir — checkout-da müştəriyə öncədən əlavə etmək üçün `cj-quote-freight` köməkçi funksiyası (mərhələ 4)
- Şəkillər CJ CDN-də qalır (heç bir storage yükü)

## İndi başlayaq?

**Mərhələ 1-i** indi qura bilərəm (DB + admin UI + parametrlər) — API açar gəlmədən də işləyəcək. Siz açarı aldıqda mərhələ 2-yə keçərik. Başlayım?
