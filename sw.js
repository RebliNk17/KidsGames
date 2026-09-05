/* Service Worker - מאפשר עבודה גם בלי אינטרנט והתקנה כאפליקציה.
 *
 * בכל עדכון של האתר מעלים את המספר בשני מקומות יחד:
 *   1. CACHE כאן (v7 ← v8)
 *   2. ה-?v= שבקישורי ה-JS/CSS ב-index.html
 * ככה ה-HTML תמיד טוען קבצים מאותה גרסה בדיוק, וגם דפדפן עם מטמון ישן
 * לא יערבב קוד ישן עם HTML חדש (זה בדיוק מה שתקע את המסך פעם אחת). */

const CACHE = 'kidsgames-v7';
const V = '?v=7';

const ASSETS = [
  './',
  './index.html',
  './css/style.css' + V,
  './js/sounds.js' + V,
  './js/speech.js' + V,
  './js/confetti.js' + V,
  './js/levels.js' + V,
  './js/letters-levels.js' + V,
  './js/engine.js' + V,
  './js/game.js' + V,
  './js/letters-game.js' + V,
  './js/app.js' + V,
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
