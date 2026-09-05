/* Nurvan shell SW — cache UI only, never the 10k catalog. */
const CACHE = 'nurvan-shell-v37-coach';
const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.png',
  './favicon.png',
  './nurvan_logo.png',
  './muscle-male-front.png',
  './muscle-male-back.png',
  './muscle-female-front.png',
  './muscle-female-back.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (/program-catalog|xlsx\.full/i.test(url.pathname)) return;
  const isAsset = /\.(png|jpe?g|gif|webp|svg|ico|woff2?|css|js|json|webmanifest)$/i.test(url.pathname);

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req).then((hit) => {
        if (hit) return hit;
        if (isAsset) return undefined;
        return caches.match('./index.html');
      }))
  );
});

self.addEventListener('push', (event) => {
  let payload = { title: 'Nurvan', body: '', data: {} };
  try {
    if (event.data) payload = Object.assign(payload, event.data.json());
  } catch (_) {
    try {
      if (event.data) payload.body = event.data.text();
    } catch (__) {}
  }
  const title = payload.title || 'Nurvan';
  const options = {
    body: payload.body || '',
    data: payload.data || {},
    icon: './icon-192.png',
    badge: './icon-192.png'
  };
  const badgeN = (payload.data && typeof payload.data.badge === 'number')
    ? payload.data.badge
    : (typeof payload.badge === 'number' ? payload.badge : null);
  event.waitUntil(
    Promise.resolve().then(function () {
      if (badgeN != null && self.navigator && self.navigator.setAppBadge) {
        return self.navigator.setAppBadge(badgeN).catch(function () {});
      }
      if (badgeN === 0 && self.navigator && self.navigator.clearAppBadge) {
        return self.navigator.clearAppBadge().catch(function () {});
      }
    }).then(function () {
      return self.registration.showNotification(title, options);
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const route = data.route || data;
  let openPath = data.path || '/';
  if (data.inviteToken && String(openPath).indexOf('/c/') !== 0) {
    openPath = '/c/' + encodeURIComponent(data.inviteToken);
  }
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (let i = 0; i < list.length; i++) {
        const client = list[i];
        if (client.url && client.url.indexOf(self.location.origin) === 0 && 'focus' in client) {
          try { client.postMessage({ type: 'NURVAN_NOTIFY_ROUTE', route: route }); } catch (_) {}
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(openPath);
      }
    })
  );
});
