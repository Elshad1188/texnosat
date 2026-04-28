import { supabase } from "@/integrations/supabase/client";

interface FirebaseClientConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  vapidKey: string;
}

let messaging: any = null;
let initialized = false;

const SW_VERSION = "v3";

function buildFirebaseServiceWorkerUrl(config: FirebaseClientConfig) {
  const url = new URL("/firebase-messaging-sw.js", window.location.origin);
  url.searchParams.set("v", SW_VERSION);
  url.searchParams.set("apiKey", config.apiKey);
  url.searchParams.set("authDomain", config.authDomain);
  url.searchParams.set("projectId", config.projectId);
  url.searchParams.set("storageBucket", config.storageBucket);
  url.searchParams.set("messagingSenderId", config.messagingSenderId);
  url.searchParams.set("appId", config.appId);
  return url.toString();
}

export function isPushSupported(): boolean {
  if (typeof window === "undefined") return false;
  if (!("serviceWorker" in navigator)) return false;
  if (!("Notification" in window)) return false;
  if (!("PushManager" in window)) return false;
  return true;
}

export function isInPreviewOrIframe(): boolean {
  try {
    if (window.self !== window.top) return true;
  } catch {
    return true;
  }
  const host = window.location.hostname;
  return host.includes("lovableproject.com") || host.includes("id-preview--");
}

export async function getFirebaseConfig(): Promise<FirebaseClientConfig | null> {
  const { data } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "integrations")
    .maybeSingle();

  const val = data?.value as any;
  if (!val?.firebase_config?.apiKey) return null;
  return val.firebase_config;
}

export async function initFirebaseMessaging(): Promise<string | null> {
  try {
    if (!isPushSupported()) {
      console.log("[Firebase] Push not supported on this browser");
      return null;
    }
    if (isInPreviewOrIframe()) {
      console.log("[Firebase] Skipping push registration in preview/iframe");
      return null;
    }

    const config = await getFirebaseConfig();
    if (!config) {
      console.warn("[Firebase] No Firebase config found in site_settings");
      return null;
    }

    const { initializeApp, getApp, getApps } = await import("firebase/app");
    const { getMessaging, getToken, onMessage } = await import("firebase/messaging");

    if (!initialized) {
      const app = getApps().length
        ? getApp()
        : initializeApp({
            apiKey: config.apiKey,
            authDomain: config.authDomain,
            projectId: config.projectId,
            storageBucket: config.storageBucket,
            messagingSenderId: config.messagingSenderId,
            appId: config.appId,
          });

      messaging = getMessaging(app);
      initialized = true;

      onMessage(messaging, (payload: any) => {
        console.log("[Firebase] Foreground message:", payload);
        const { title, body, icon } = payload.notification || {};
        if (Notification.permission === "granted") {
          new Notification(title || "Elan24", {
            body: body || "",
            icon: icon || "/pwa-192.png",
          });
        }
      });
    }

    if ("serviceWorker" in navigator && messaging) {
      const swUrl = buildFirebaseServiceWorkerUrl(config);
      const registration = await navigator.serviceWorker.register(swUrl, { scope: "/" });
      await registration.update().catch(() => undefined);
      const serviceWorkerRegistration = await navigator.serviceWorker.ready;

      // Push fresh config to the SW (in case it was registered without URL params)
      const target = serviceWorkerRegistration.active || serviceWorkerRegistration.waiting || serviceWorkerRegistration.installing;
      target?.postMessage({ type: "FIREBASE_CONFIG", config });

      const fcmToken = await getToken(messaging, {
        vapidKey: config.vapidKey,
        serviceWorkerRegistration,
      });

      return fcmToken || null;
    }
  } catch (err) {
    console.error("[Firebase] messaging init error:", err);
  }
  return null;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;

  const permission = await Notification.requestPermission();
  return permission === "granted";
}

/**
 * Full enable flow — call from a user gesture (button click).
 * Required by iOS Safari and recommended on Android Chrome.
 */
export async function enablePushNotifications(userId: string): Promise<{ ok: boolean; reason?: string; token?: string }> {
  if (!isPushSupported()) return { ok: false, reason: "unsupported" };
  if (isInPreviewOrIframe()) return { ok: false, reason: "preview" };

  const granted = await requestNotificationPermission();
  if (!granted) return { ok: false, reason: "denied" };

  const token = await initFirebaseMessaging();
  if (!token) return { ok: false, reason: "no-token" };

  const { error } = await supabase
    .from("fcm_tokens")
    .upsert(
      { user_id: userId, token, updated_at: new Date().toISOString(), last_seen_at: new Date().toISOString() },
      { onConflict: "user_id,token" }
    );

  if (error) {
    console.error("[Firebase] Failed to save token:", error);
    return { ok: false, reason: "db-error", token };
  }
  return { ok: true, token };
}
