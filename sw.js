/* Service Worker - מאפשר עבודה גם בלי אינטרנט והתקנה כאפליקציה.
 * כשמעדכנים קבצים באתר - יש להעלות את מספר הגרסה כאן כדי שהעדכון יגיע לכולם. */

const CACHE = 'kidsgames-v2';

const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/sounds.js',
  './js/speech.js',
  './js/confetti.js',
  './js/levels.js',
  './js/letters-levels.js',
  './js/engine.js',
  './js/game.js',
  './js/letters-game.js',
  './js/app.js',
  './manifest.webmanifest',
  './icons/favicon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', ev => {
  ev.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', ev => {
  ev.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', ev => {
  const req = ev.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (url.origin !== location.origin && !isFont) return;

  // ניווט: קודם רשת, ואם אין - הדף מהמטמון (משחק גם בלי אינטרנט)
  if (req.mode === 'navigate') {
    ev.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // שאר הקבצים: קודם מטמון, ורענון שקט ברקע
  ev.respondWith(
    caches.match(req).then(cached => {
      const fresh = fetch(req)
        .then(res => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || fresh;
    })
  );
});
