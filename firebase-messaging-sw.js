/* global firebase */
importScripts('https://www.gstatic.com/firebasejs/12.19.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.19.0/firebase-messaging-compat.js');
importScripts('./firebase-config.js');

firebase.initializeApp(globalThis.FAMILY_CHAT_CONFIG.firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  // For notification messages, Chrome already displays the notification.
  // Only manually show for data-only payloads to avoid duplicate alerts.
  if (payload.notification) return;
  const title = payload.notification?.title || 'KidsChat';
  const body = payload.notification?.body || 'New message received';
  self.registration.showNotification(title, {
    body,
    icon: '/favicon.svg',
    badge: '/favicon.svg',
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) return client.focus();
        }
        if (clients.openWindow) return clients.openWindow('./');
      })
  );
});

// Retire the previous cache-first shell so old access-control code cannot persist.
self.addEventListener('install', event => { event.waitUntil(self.skipWaiting()); });
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('kidschat-shell-')).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
