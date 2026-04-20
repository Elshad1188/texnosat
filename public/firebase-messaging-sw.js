/* eslint-disable no-undef */
// Firebase Messaging Service Worker for background push notifications

importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

// Firebase config will be injected via message from the main app
let firebaseConfig = null;
let firebaseMessaging = null;
let firebaseReady = false;

function startBackgroundNotifications() {
  if (!firebaseMessaging) return;

  firebaseMessaging.onBackgroundMessage((payload) => {
    console.log("[firebase-messaging-sw] Background message:", payload);
    const { title, body, icon } = payload.notification || {};
    const link = payload?.data?.link || "/";

    self.registration.showNotification(title || "Texnosat", {
      body: body || "",
      icon: icon || "/pwa-192.png",
      badge: "/pwa-192.png",
      data: { ...(payload.data || {}), link },
    });
  });
}

function initFirebase(config) {
  if (firebaseReady || !config?.apiKey || !config?.projectId) return;

  firebaseConfig = config;
  firebase.initializeApp(firebaseConfig);
  firebaseMessaging = firebase.messaging();
  firebaseReady = true;
  startBackgroundNotifications();
}

const searchParams = new URL(self.location.href).searchParams;
initFirebase({
  apiKey: searchParams.get("apiKey") || "",
  authDomain: searchParams.get("authDomain") || "",
  projectId: searchParams.get("projectId") || "",
  storageBucket: searchParams.get("storageBucket") || "",
  messagingSenderId: searchParams.get("messagingSenderId") || "",
  appId: searchParams.get("appId") || "",
});

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

      // Try to find an already-open tab on our origin
      for (const client of allClients) {
        try {
          const clientUrl = new URL(client.url);
          if (clientUrl.origin === self.location.origin) {
            await client.focus();
            // Ask the page to navigate to the link (SPA-friendly)
            client.postMessage({ type: "NOTIFICATION_NAVIGATE", link });
            return;
          }
        } catch (_) {
          // ignore parse errors
        }
      }

      // No matching tab — open a new window directly to the link
      if (clients.openWindow) {
        await clients.openWindow(targetUrl);
      }
    })()
  );
});
