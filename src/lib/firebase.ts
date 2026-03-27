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
  if (initialized) return null;

  try {
    const config = await getFirebaseConfig();
    if (!config) return null;

    // Dynamically import Firebase
    const { initializeApp } = await import("firebase/app");
    const { getMessaging, getToken, onMessage } = await import("firebase/messaging");

    const app = initializeApp({
      apiKey: config.apiKey,
      authDomain: config.authDomain,
      projectId: config.projectId,
      storageBucket: config.storageBucket,
      messagingSenderId: config.messagingSenderId,
      appId: config.appId,
    });

    messaging = getMessaging(app);
    initialized = true;

    // Pass config to service worker
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
      registration.active?.postMessage({
        type: "FIREBASE_CONFIG",
        config: {
          apiKey: config.apiKey,
          authDomain: config.authDomain,
          projectId: config.projectId,
          storageBucket: config.storageBucket,
          messagingSenderId: config.messagingSenderId,
          appId: config.appId,
        },
      });

      // Get FCM token
      const fcmToken = await getToken(messaging, {
        vapidKey: config.vapidKey,
        serviceWorkerRegistration: registration,
      });

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

      return fcmToken;
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
