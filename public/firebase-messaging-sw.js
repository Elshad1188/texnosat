/* eslint-disable no-undef */
// Firebase Messaging Service Worker for background push notifications

importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

// Firebase config will be injected via message from the main app
let firebaseConfig = null;

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "FIREBASE_CONFIG") {
    firebaseConfig = event.data.config;
    firebase.initializeApp(firebaseConfig);
    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
      console.log("[firebase-messaging-sw] Background message:", payload);
      const { title, body, icon } = payload.notification || {};
      self.registration.showNotification(title || "Texnosat", {
        body: body || "",
        icon: icon || "/pwa-192.png",
        badge: "/pwa-192.png",
        data: payload.data,
      });
    });
  }
});

// Handle notification click
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.link || "/";
  event.waitUntil(clients.openWindow(url));
});
