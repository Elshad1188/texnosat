
# Həftəlik Dəvət Yarışması ("Elan24 Çempionatı")

## Konsept

İstifadəçi 1 AZN ödəyib həftəlik yarışmaya qoşulur. Ona unikal dəvət linki verilir. Həftə ərzində ən çox **yeni qeydiyyatlı** dostu dəvət edən qalib olur və **toplanmış fondun 70%-ni** Epoint vasitəsilə birbaşa kartına köçürülür. Hər həftə qalibin video reportajı saytda və sosial şəbəkələrdə paylaşılır → viral effekt.

## Niyə viral işləyəcək

- **Hər iştirakçı = pulsuz marketinq agenti** (qazanmaq üçün özü saytı yayır)
- **1 AZN psixoloji baryer aşağıdır** — "niyə də yox" effekti
- **Canlı liderlər cədvəli** — rəqabət hissi, davamlı qayıdış
- **Həftəlik qalib hekayəsi** — yeni emosional kontent hər 7 gündən bir
- **Real pul mükafatı** — şəkillərdə pul dəstəsi tutmuş qalib = ən güclü sosial sübut

## Fond bölgüsü (şəffaflıq)

Toplanan məbləğ məsələn 1000 AZN olarsa:
- **70% (700 AZN)** → həftənin qalibinə (Epoint köçürmə)
- **15% (150 AZN)** → 2-ci və 3-cü yerə (75 AZN hər biri)
- **10% (100 AZN)** → növbəti həftənin "starter fonduna" (yığım azalmasın)
- **5% (50 AZN)** → platforma komissiyası (Epoint xərcini örtür)

Bu nisbətlər admin paneldən tənzimlənən olacaq.

## Hüquqi forma (qumar olmamaq üçün)

1 AZN **"iştirak haqqı"** kimi yox, **"VIP iştirakçı statusu" satışı** kimi rəsmiləşdirilir:
- İstifadəçi 1 AZN ödəyir → balansına **1 AZN bonus** + **VIP iştirakçı nişanı** alır
- Yarışmaya avtomatik qoşulması — bu xidmətin **bonusudur**
- Qalibin mükafatı **"reklam kompensasiyası / influencer ödənişi"** kimi qeydə alınır (qalib həftə ərzində saytı tanıdıb)
- Bu, Azərbaycan qanunvericiliyinə görə qumar deyil, **promo kampaniyadır**

## İstifadəçi axını

```
1. Ana səhifədə banner: "Bu həftə fond: 1,247 AZN — qoşul"
2. /contest səhifəsi: izah + "1 AZN ilə qoşul" düyməsi
3. Epoint ödənişi → balansa 1 AZN + VIP nişan
4. Unikal link verilir: elan24.az/r/USERCODE
5. Şəxsi panel: "Sənin dəvətlərin: 7 | Reytinqdə yerin: 23"
6. Liderlər cədvəli (canlı, top 50)
7. Bazar günü 23:59 — qalib elan olunur
8. Bazar ertəsi: video reportaj + ödəniş sübutu
9. Yeni həftə başlayır
```

## Texniki struktur

### Yeni database cədvəlləri

- **`contests`** — həftəlik yarışmalar (id, week_start, week_end, total_pool, winner_id, status)
- **`contest_participants`** — iştirakçılar (id, contest_id, user_id, referral_code, invites_count, paid_at, rank)
- **`contest_invites`** — uğurlu dəvətlər (id, contest_id, inviter_user_id, invited_user_id, created_at)
- **`contest_settings`** — admin parametrləri (entry_fee, winner_pct, second_pct, third_pct, rollover_pct, commission_pct)

### Frontend səhifələri

- **`/contest`** — əsas yarışma səhifəsi (fond, geri sayım, qoşulma düyməsi, liderlər cədvəli, qaydalar)
- **`/contest/me`** — şəxsi panel (mənim linkim, dəvətlərim, reytinq, paylaş düymələri WhatsApp/Telegram/Instagram)
- **`/contest/winners`** — keçmiş qaliblər (foto + video + məbləğ)
- **`/r/:code`** — referral landing (qeydiyyat formuna yönləndirir, code-u sessionStorage-də saxlayır)

### Ana səhifə inteqrasiyası

- **HeroSection altında**: parlaq qızıl/yaşıl banner — "🏆 Bu həftə fond: X AZN | Qaliblərə qədər: 3 gün 14 saat"
- **MobileBottomNav**: yeni "Yarışma" ikonu (qızıl trofey, pulse animasiya)
- **Header**: balans yanında kiçik "🏆" nişanı (yarışmadasansa)

### Edge funksiyalar

- **`contest-join`** — Epoint ödəniş başladır, callback-də iştirakçı yaradır
- **`contest-track-invite`** — yeni qeydiyyat zamanı referral code yoxlanır, uğurludursa contest_invites-ə yazılır
- **`contest-finalize-week`** — pg_cron ilə hər bazar 23:59-da işə düşür: qalibləri seçir, balanslara mükafat yazır, payout_request yaradır, bildiriş göndərir

### Admin panel (yeni tab)

- Cari həftə statistikası (iştirakçı sayı, fond, top 10)
- Keçmiş həftələr siyahısı
- Parametrlər (giriş haqqı, faizlər)
- Qalibə video reportaj yükləmə (cover_url + video_url)
- Manual finalize düyməsi (test üçün)

### Viral mexanikalar

- **Paylaşma düymələri**: WhatsApp/Telegram/Instagram/Facebook — hazır mətnlə ("Mən Elan24 yarışmasındayam, qoşul: link")
- **Push bildiriş**: hər səhər "Reytinqdə X yerdəsən, daha 2 dəvət ilə top 10-a düşə bilərsən"
- **Email**: həftə sonu xatırlatma, qalib elanı
- **Story-friendly qrafika**: şəxsi panel-də "Story-yə paylaş" düyməsi → istifadəçinin reytinqi və linki ilə avtomatik şəkil generasiya (canvas)

## Mərhələlər (4 mərhələ)

### Mərhələ 1 — Backbone (database + admin)
- 4 cədvəli yarat (RLS ilə)
- Admin paneldə "Yarışma" tab — parametrlər + cari həftə görüntüsü
- `contest-finalize-week` edge function (cron olmadan, manual test)

### Mərhələ 2 — İstifadəçi axını
- `/contest` səhifəsi (qoşulma + canlı fond + geri sayım + liderlər)
- `/contest/me` şəxsi panel (link + paylaşma düymələri)
- `/r/:code` landing + Auth.tsx-də referral code emalı
- `contest-join` Epoint inteqrasiyası
- `contest-track-invite` yeni qeydiyyatda

### Mərhələ 3 — Avtomatlaşdırma + bildirişlər
- pg_cron həftəlik finalize
- Push/email bildirişlər (qoşulma, reytinq dəyişikliyi, qalib elanı)
- Ana səhifə banneri + MobileBottomNav ikonu
- `/contest/winners` keçmiş qaliblər səhifəsi

### Mərhələ 4 — Viral təkmilləşdirmələr
- Story üçün avtomatik şəkil generasiyası
- Header-də 🏆 nişanı
- Admin video reportaj yükləmə
- Statistika dashboard (admin üçün)

## İlk addım təklifi

Mərhələ 1-dən başlayaq: database strukturu + admin parametrlər. Bu, qalan hər şeyin əsası olacaq və 1-2 saat içində hazır olar. Sonra Mərhələ 2 ilə canlı istifadəçi axını qurarıq.

## Açıq qalan suallar (sonra qərar verə bilərik)

- **Minimum dəvət şərti** — qalib olmaq üçün ən azı neçə dəvət lazımdır? (təklif: 3, ki "1 dəvət ilə uddum" hadisəsi olmasın)
- **Eyni IP/cihazdan saxta dəvət** — necə qarşısını alaq? (təklif: yalnız Epoint-də ödəniş etmiş referral hesablanır → fırıldaq qeyri-mümkün)
- **Yenidən qoşulma** — eyni həftədə 2-ci dəfə 1 AZN ödəyib şansını ikiqat artıra bilər? (təklif: bəli, fond böyüsün)
