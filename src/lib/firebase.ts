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

function buildFirebaseServiceWorkerUrl(config: FirebaseClientConfig) {
  const url = new URL("/firebase-messaging-sw.js", window.location.origin);
  url.searchParams.set("apiKey", config.apiKey);
  url.searchParams.set("authDomain", config.authDomain);
  url.searchParams.set("projectId", config.projectId);
  url.searchParams.set("storageBucket", config.storageBucket);
  url.searchParams.set("messagingSenderId", config.messagingSenderId);
  url.searchParams.set("appId", config.appId);
  return url.toString();
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
    const config = await getFirebaseConfig();
    if (!config) return null;

    // Dynamically import Firebase
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

      // Listen for foreground messages
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
      const registration = await navigator.serviceWorker.register(
        buildFirebaseServiceWorkerUrl(config),
        { scope: "/" }
      );
      await registration.update().catch(() => undefined);
      const serviceWorkerRegistration = await navigator.serviceWorker.ready;

      const fcmToken = await getToken(messaging, {
        vapidKey: config.vapidKey,
        serviceWorkerRegistration,
      });

      return fcmToken || null;
    }
  } catch (err) {
    console.error("Firebase messaging init error:", err);
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
