# FCM Push Notifications — Investigation Findings

## Summary

Notifications are accepted by FCM (you see them in Firebase logs) but never reach devices. After reviewing the code, manifest, service worker, token storage, and Firebase config, I found **5 concrete issues**, in order of likely impact.

---

## Findings

### 1. ❗ No web app manifest — installable PWA broken
- `index.html` has no `<link rel="manifest" ...>` and there is no `public/manifest.json` / `manifest.webmanifest`.
- Without a valid manifest with `display: "standalone"`, `name`, `start_url`, and proper icons:
  - **iOS Safari (16.4+) will NOT deliver web push at all** — push only works for sites added to the home screen as a PWA, which requires the manifest.
  - On Android Chrome, push still works in the browser, but "installed app" push (the most reliable mode) is disabled.
- This is almost certainly the main reason iOS users get nothing.

### 2. ❗ `send-push` (broadcast) sends to a topic, but no client ever subscribes to it
- `supabase/functions/send-push/index.ts` line 134 sends to `topic: topic || "all"`.
- Searching the client code, **nothing ever calls `messaging.subscribeToTopic` / FCM REST `iid` subscribe**. Web FCM does not auto-join topics.
- Result: FCM accepts the message ("logged in Firebase") and silently drops it because zero tokens are subscribed to `all`.
- `send-user-push` (per-user, by token) is fine — that one targets stored tokens directly.

### 3. ❗ Service worker caching prevents config updates from reaching devices
- `firebase-messaging-sw.js` is registered with config baked into the **URL query string** (`?apiKey=...&projectId=...`). Browsers cache the SW by URL+content. Once a device registered the SW with old/wrong config (e.g. when the project was still "texnosat"), the cached SW keeps running.
- The `notification.title` fallback in the SW is hard-coded to `"Texnosat"` (line 22) — a tell that an older config may be live on devices.
- Combined with `registration.update()` being best-effort, devices that registered weeks ago may never refresh.

### 4. ⚠ Token storage upsert may be silently failing
- `FirebaseInit.tsx` upserts with `onConflict: "user_id,token"`. This requires a **unique constraint on `(user_id, token)`** in `fcm_tokens`. If only `token` is unique (or no composite unique), upserts fail with a 409 and tokens never persist for re-permission flows.
- 12 tokens / 6 users suggests it's mostly working, but worth verifying — failed upserts are silent because the result isn't checked (no `.select()` / error log).
- Also, no `last_seen` refresh: stale tokens that were never cleaned (FCM rotates them) keep failing in `send-user-push`. Only `UNREGISTERED` / `INVALID_ARGUMENT` are cleaned — `NOT_FOUND` and `SENDER_ID_MISMATCH` aren't.

### 5. ⚠ Lovable preview / iframe registers the SW
- `FirebaseInit` runs unconditionally. When the app loads inside the Lovable preview iframe (`id-preview--*.lovable.app`), it tries to register the SW and request notification permission. This pollutes browser state and confuses real-device testing.
- Per Lovable PWA guidance, push/SW should only run on the **published origin** (e.g. `elan24.az`), not preview/iframe.

### 6. ℹ Platform-specific gotchas (informational)
- **iOS Safari**: web push works only **16.4+**, only **after the user installs the PWA to home screen**, only over **HTTPS**, and notification permission must be requested **from a user gesture** (button click), not automatically on page load. Current code calls `requestNotificationPermission()` 3 s after login — iOS will reject this silently.
- **Android Chrome**: works in-browser, but battery-saver / data-saver / "Site notifications blocked by default" in Android settings will drop pushes without errors.
- **Brave / Firefox / WebView**: FCM web push is unsupported or restricted.

---

## Recommended fixes (no code changes yet)

| # | Fix | Effort | Impact |
|---|-----|--------|--------|
| A | Add `public/manifest.json` (name, short_name, icons 192/512, start_url `/`, display `standalone`, theme_color) and link it from `index.html`. | S | Unblocks iOS push + proper install. |
| B | Make `send-push` (broadcast) loop over all rows in `fcm_tokens` and send per-token (like `send-user-push`) instead of using topics — OR explicitly subscribe each new token to topic `all` server-side via FCM IID REST when it's stored. | M | Restores broadcast push delivery. |
| C | Add a versioned SW filename (e.g. `firebase-messaging-sw.js?v=2`) **and** stop putting config in the URL — instead postMessage the config from the page after registration (the SW already supports `FIREBASE_CONFIG` messages). Also fix the hard-coded `"Texnosat"` fallback → `"Elan24"`. | S | Forces stale SWs to update; fixes config drift. |
| D | Verify the unique index: `CREATE UNIQUE INDEX IF NOT EXISTS fcm_tokens_user_token_uniq ON public.fcm_tokens(user_id, token);`. Log upsert errors in `FirebaseInit`. Add a `last_seen_at` column updated on every login. Expand stale-token cleanup to also catch `NOT_FOUND` and `SENDER_ID_MISMATCH`. | S | Prevents silent token loss. |
| E | Guard `FirebaseInit` so it only runs when **not in iframe** and **not on a `lovableproject.com` / `id-preview--` host**. | XS | Stops preview pollution. |
| F | Move `requestNotificationPermission()` behind a user-visible "Bildirişləri aç" button (e.g. in Profile or Header), not automatic-on-login. Required for iOS, recommended for Chrome's quiet-UI heuristics. | S | Higher grant rate, iOS compatibility. |
| G | (Optional) Add an admin "Send test push to me" button that calls `send-user-push` with the current user's id, and surfaces FCM's per-token response in the UI for live debugging. | S | Faster diagnosis going forward. |

---

## Testing protocol (after fixes)
1. Test from the **published URL** `https://elan24.az`, never from `id-preview--…lovable.app` or inside the editor iframe.
2. Android Chrome: install via "Add to Home Screen", grant permission via the new button, then trigger a push. Should appear even with the tab closed.
3. iOS 16.4+ Safari: install via Share → Add to Home Screen, **open the installed icon** (not Safari), tap the permission button, then trigger a push.
4. Check server response in `send-user-push` — `{ sent: N, failed: 0 }` confirms FCM accepted; if device still doesn't see it, the issue is on-device (battery/notification settings).

---

## Technical notes
- Files involved: `public/firebase-messaging-sw.js`, `src/lib/firebase.ts`, `src/components/FirebaseInit.tsx`, `supabase/functions/send-push/index.ts`, `supabase/functions/send-user-push/index.ts`, `index.html`.
- DB: `fcm_tokens` table currently holds 12 tokens for 6 users.
- Firebase project in use: `texnosat-6d11c` (apiKey + vapidKey present in `site_settings.integrations.firebase_config`).

Approve this plan and I'll implement the fixes in priority order (A → C → E → F → B → D → G).
