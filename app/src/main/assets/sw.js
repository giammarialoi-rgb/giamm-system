/* Nurvan shell SW — cache UI only, never the 10k catalog. */
importScripts('./release-meta.js');
// The web build is part of the name too: a web-only release (same Android
// version code) used to keep the old cache, and the old page with it.
const CACHE = 'nurvan-shell-v' + String((self.NURVAN_RELEASE && self.NURVAN_RELEASE.androidVersionCode) || 'dev') +
  '-' + String((self.NURVAN_RELEASE && self.NURVAN_RELEASE.webBuild) || 'web') + '-userLoadFirst2';
const PRECACHE = [
  './release-meta.js',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.png',
  './favicon.png',
  './nurvan_logo.png',
  './muscle-male-front.png',
  './muscle-male-back.png',
  './muscle-female-front.png',
  './muscle-female-back.png',
  './exercise-catalog-extra.js',
  './youtube-links.js',
  './training-knowledge.js',
  './training-analytics-engine.js',
  './domain-merge.js',
  './exercise-taxonomy.js',
  './program-builder.js',
  './program-catalog.js',
  './progression-models.js',
  './food-search.js',
  './nutrition-targets.js',
  './checkin-schedule.js',
  './features.js',
  './entitlements.js',
  './cardio-library.js',
  './program-generator.js'
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
  // Never intercept the API: account data (nutrition, training, logs...) must
  // always be a live network round trip. Caching a GET here and falling back
  // to it on any network hiccup silently hands the app a stale snapshot that
  // *looks* like a fresh sync - which then gets treated as authoritative and
  // overwrites newer local data. Reproduced live: save a meal, save another
  // later, and a single flaky request during the next reopen quietly reverted
  // the account to an older cached copy, wiping what was just saved.
  if (/^\/api\//.test(url.pathname)) return;
  if (/program-catalog|xlsx\.full/i.test(url.pathname)) return;
  const isAsset = /\.(png|jpe?g|gif|webp|svg|ico|woff2?|css|js|json|webmanifest)$/i.test(url.pathname);

  if (/\.webmanifest$/i.test(url.pathname)) {
    event.respondWith(fetch(req, { cache: 'no-store' }).catch(() => caches.match(req)));
    return;
  }
  // The privacy notice, terms and deletion page are always read live: a
  // cached copy would show an outdated notice.
  // So are the pages the account emails link to, which carry a one-time token.
  if (/^\/(privacy|termini|elimina-account|verifica-email|reimposta-password)(\.html)?$/.test(url.pathname) || /^\/(legal(-pages)?|account-pages)\.(css|js)$/.test(url.pathname)) return;
  const isClientDoc = /^\/c\/[^/]+\/?$/.test(url.pathname);
  // An invite page carries its token in the HTML and the server sends it
  // no-store: it is not kept here. Offline, the app shell opens it (the boot
  // reads the token from the address).
  if (isClientDoc) {
    event.respondWith(
      fetch(req, { cache: 'no-store' }).catch(() => caches.open(CACHE).then((cache) => cache.match('/')).then((res) => res || fetch(req)))
    );
    return;
  }
  const isHtml = req.mode === 'navigate' || url.pathname === '/' || /index\.html$/i.test(url.pathname);
  if (isHtml) {
    // Stale-while-revalidate: a returning visitor gets the cached app shell
    // instantly instead of waiting on the network - critical on a free host
    // whose origin can take 20-30s to wake from sleep on the first request,
    // during which the network layer would otherwise serve the host's own
    // "waking up" interstitial instead of our page. The network fetch still
    // runs in the background to refresh the cache for the next visit; a real
    // new release is picked up via the existing update-available banner
    // (each release changes CACHE's name, so its cache starts empty and this
    // falls through to the network on that first post-update load).
    event.respondWith(
      caches.open(CACHE).then((cache) => cache.match(req).then((cached) => {
        const network = fetch(req, { cache: 'no-store' }).then((res) => {
          if (res && res.ok && res.type === 'basic') cache.put(req, res.clone()).catch(() => {});
          return res;
        }).catch(() => null);
        if (cached) {
          event.waitUntil(network);
          return cached;
        }
        return network.then((res) => res || caches.match(req)).then((res) => res || fetch(req));
      }))
    );
    return;
  }
  // The app's own scripts follow the page: from this release's cache, with
  // the refresh in the background. Served fresh while the page came from the
  // cache, the first launch after a deploy ran the old page's code against the
  // new scripts.
  if (/\.js$/i.test(url.pathname)) {
    event.respondWith(
      caches.open(CACHE).then((cache) => cache.match(req).then((cached) => {
        const network = fetch(req).then((res) => {
          if (res && res.ok && res.type === 'basic') cache.put(req, res.clone()).catch(() => {});
          return res;
        }).catch(() => null);
        if (cached) {
          event.waitUntil(network);
          return cached;
        }
        return network.then((res) => res || fetch(req));
      }))
    );
    return;
  }
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
        return undefined;
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
