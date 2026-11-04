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
  const actions = data.actions || [];

  // If actions not explicitly specified but roomId exists, generate 1-tap copy action buttons
  if (actions.length === 0 && data.roomId) {
    actions.push({ action: 'copy-id', title: `📋 Copy Room: ${data.roomId}` });
    if (data.roomPassword) {
      actions.push({ action: 'copy-pass', title: `🔑 Copy Pass: ${data.roomPassword}` });
    }
  }

  const options = {
    body: data.body || 'Your tournament match has an update. Tap to view room credentials.',
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/icon-192.png',
    tag: data.tag || `localesport-notif-${Date.now()}`,
    data: data.data || {
      url: data.url || '/yourmatches',
      roomId: data.roomId,
      roomPassword: data.roomPassword,
    },
    requireInteraction: true,
    vibrate: [250, 100, 250, 100, 250],
    actions: actions,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click handler: opens match dashboard or automatically copies ID/Pass
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const notifData = event.notification.data || {};
  let targetUrl = notifData.url || '/yourmatches';

  if (event.action === 'copy-id' && notifData.roomId) {
    targetUrl = `/yourmatches?copied=id&val=${encodeURIComponent(notifData.roomId)}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(notifData.roomId).catch(() => {});
    }
  } else if (event.action === 'copy-pass' && notifData.roomPassword) {
    targetUrl = `/yourmatches?copied=pass&val=${encodeURIComponent(notifData.roomPassword)}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(notifData.roomPassword).catch(() => {});
    }
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
