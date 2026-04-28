/* eslint-disable no-undef */
// Firebase Messaging Service Worker for background push notifications
// Version: 3 (Elan24)

importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

const SW_VERSION = "elan24-v3";
let firebaseMessaging = null;
let firebaseReady = false;

// Activate immediately on update so devices pick up new SW without page reload
self.addEventListener("install", (event) => {
  self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

function startBackgroundNotifications() {
  if (!firebaseMessaging) return;

  firebaseMessaging.onBackgroundMessage((payload) => {
    console.log("[firebase-messaging-sw] Background message:", payload);
    const { title, body, icon } = payload.notification || {};
    const link = payload?.data?.link || "/";

    self.registration.showNotification(title || "Elan24", {
      body: body || "",
      icon: icon || "/pwa-192.png",
      badge: "/pwa-192.png",
      data: { ...(payload.data || {}), link },
    });
  });
}

function initFirebase(config) {
  if (firebaseReady || !config?.apiKey || !config?.projectId) return;

  firebase.initializeApp(config);
  firebaseMessaging = firebase.messaging();
  firebaseReady = true;
  startBackgroundNotifications();
}

// Initial config from URL params (kept for backwards compatibility)
const searchParams = new URL(self.location.href).searchParams;
if (searchParams.get("apiKey")) {
  initFirebase({
    apiKey: searchParams.get("apiKey") || "",
    authDomain: searchParams.get("authDomain") || "",
    projectId: searchParams.get("projectId") || "",
    storageBucket: searchParams.get("storageBucket") || "",
    messagingSenderId: searchParams.get("messagingSenderId") || "",
    appId: searchParams.get("appId") || "",
  });
}

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "FIREBASE_CONFIG") {
    initFirebase(event.data.config);
  }
});

// Handle notification click — focus existing tab or open new one
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const link = event.notification.data?.link || "/";

  event.waitUntil(
    (async () => {
      const allClients = await clients.matchAll({ type: "window", includeUncontrolled: true });
      const targetUrl = new URL(link, self.location.origin).href;

      for (const client of allClients) {
        try {
          const clientUrl = new URL(client.url);
          if (clientUrl.origin === self.location.origin) {
            await client.focus();
            client.postMessage({ type: "NOTIFICATION_NAVIGATE", link });
            return;
          }
        } catch (_) {
          // ignore
        }
      }

      if (clients.openWindow) {
        await clients.openWindow(targetUrl);
      }
    })()
  );
});
