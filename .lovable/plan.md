## Məqsəd

Saytda yaranan bütün bildirişləri (notifications) avtomatik olaraq push notification kimi telefona göndərmək. Admin paneldən hər bildiriş növü üçün ayrıca push aç/söndür imkanı. **Tətbiq açıq olduqda push göndərilməsin** — yalnız offline və ya arxa fonda olan istifadəçilər push alsın.

---

## Necə işləyəcək (axın)

```text
Trigger (yeni elan/mesaj/sifariş…)
   ↓
notifications cədvəlinə INSERT (DB-də saxlanılır → zəng/badge üçün)
   ↓
on_notification_push trigger işə düşür
   ↓
yeni yoxlama: 
   1) Admin paneldə bu növ üçün "push" açıqdırmı?
   2) İstifadəçi hazırda online deyilmi (last_seen > 30s öncə)?
   ↓ hər ikisi true → send-user-push edge function
   ↓
FCM v1 → telefonda bildiriş
```

Tətbiq açıq olduqda göndərməmək üçün iki qat qoruma:
- **Server tərəf:** `profiles.last_seen` son 30 saniyə içindədirsə push atılmır (DB triggeri yoxlayır).
- **Client tərəf:** `firebase-messaging-sw.js` `clients.matchAll()` ilə pəncərələrə baxır — əgər hər hansı tab açıq və `visibilityState === "visible"` isə system bildirişini göstərmir (yalnız in-app toast).

---

## Dəyişikliklər

### 1. DB migrasiyası

**`site_settings.admin_notifications`** strukturunu genişləndirmək. İndi belədir:
```json
{ "new_listing": "true", "new_message": "true", ... }
```
Yenidən belə olacaq (hər növ üçün 2 açar):
```json
{
  "new_listing": { "inapp": true, "push": true },
  "new_message": { "inapp": true, "push": true },
  "new_store":   { "inapp": true, "push": false },
  ...
}
```
+ Geriyə uyğunluq: köhnə `"true"/"false"` dəyərləri `inapp` kimi oxunacaq, `push` default = `true`.

**`profiles`-ə yeni sütun:** `presence_state text default 'offline'` (`active` | `background` | `offline`) — heartbeat üçün last_seen ilə birgə.

**`on_notification_push` trigger-ni yenilə:**
- Bildirişin tipinə uyğun `push` aç/söndür açarını yoxlasın.
- `last_seen > now() - interval '30 seconds'` AND `presence_state = 'active'` → push atma.

### 2. Admin panel

**`AdminNotificationSettings.tsx`** — hər kateqoriya üçün 2 switch:
- "Daxili bildiriş" (in-app: zəng/badge)  
- "Push bildirişi" (telefona göndər)

| Kateqoriya | İn-app | Push |
|---|---|---|
| Yeni elan | [✓] | [✓] |
| Yeni mesaj | [✓] | [✓] |
| … | … | … |

### 3. Client – online/visible aşkarlama

- **`AuthContext` / yeni `usePresence` hook:**
  - Hər 20 saniyədə `profiles.last_seen` + `presence_state` yenilə (`active` əgər `document.visibilityState === "visible"`, əks halda `background`).
  - `visibilitychange` və `beforeunload` hadisələrində `presence_state = 'offline'`.

- **`firebase-messaging-sw.js`:**
  - `onBackgroundMessage` daxilində `clients.matchAll({ type: 'window' })` — əgər açıq və `focused` pəncərə varsa `self.registration.showNotification` çağırma; əvəzinə `client.postMessage({ type: 'inapp-notif', payload })` göndər.
  - Client tərəfdə bu mesajı dinləyib mövcud toast/zəng sistemi ilə göstər.

### 4. Edge function – `send-user-push`

- Çağırışdan əvvəl son qoruma: yenidən `profiles.last_seen / presence_state` yoxlanışı (DB trigger artıq yoxlayır, bu ikinci xətt).
- `notification_type` parametri əlavə et ki, log-larda hansı növ olduğu görünsün.

### 5. Manual göndərmə (admin → istifadəçilər)

`AdminNotificationSender.tsx` (mövcuddur) — bu axın "manual broadcast" sayılır və admin tənzimləməsindən asılı olmayaraq həmişə işləyir (admin özü göndərir).

---

## Texniki qeydlər

- DB tərəfdə "online" həddi: **30 saniyə** (heartbeat 20s, tolerans 10s).
- iOS Safari: yalnız PWA standalone rejimdə işləyir (artıq həll olunub).
- Mövcud `email_notifications` (offline > 2 dəqiqə) məntiqi qalır, sadəcə push üçün ayrıca daha qısa hədd istifadə olunur.
- Migrasiya geriyə uyğun — köhnə settings format-ı pozulmayacaq.

---

## Fayllar

**Yenilənəcək:**
- `supabase/migrations/...` (yeni) — `profiles.presence_state`, `on_notification_push` yenilənməsi
- `src/components/admin/AdminNotificationSettings.tsx` — 2 switch struktur
- `src/contexts/AuthContext.tsx` və ya yeni `src/hooks/usePresence.ts`
- `public/firebase-messaging-sw.js` — açıq pəncərə yoxlaması
- `src/components/FirebaseInit.tsx` — SW-dən gələn `inapp-notif` mesajını dinlə
- `supabase/functions/send-user-push/index.ts` — son qat presence yoxlaması

Təsdiq verin, dərhal implementasiyaya başlayım.