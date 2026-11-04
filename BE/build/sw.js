// Service Worker for LocalEsport Native Push Notifications
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Real-Time Background Push Event Listener (wakes device up from sleep/background)
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'LocalEsport Alert', body: event.data.text() };
    }
  }

  const title = data.title || '⚡ LocalEsport Match Alert';
  const options = {
    body: data.body || 'Your tournament match has an update. Tap to view room credentials.',
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/icon-192.png',
    tag: data.tag || `localesport-notif-${Date.now()}`,
    data: data.data || { url: data.url || '/yourmatches' },
    requireInteraction: true,
    vibrate: [250, 100, 250, 100, 250],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click handler: opens or focuses the match dashboard
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/yourmatches';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});
