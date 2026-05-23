/* Minimal service worker for reliable OS-level notification delivery. No caching. */

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Focus an existing app window if one is open, otherwise open a new one.
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
