// Turkish Is Easy — offline support.
// Core shell is precached; lesson media (images/audio) is cached on first use.
const CACHE = 'tie-v1';
const CORE = [
  './',
  'index.html',
  'manifest.json',
  'favicon.svg',
  'css/styles.css',
  'css/typography.css',
  'js/app.js',
  'js/i18n.js',
  'js/lessonData.js',
  'js/profiles.js',
  'js/progressStore.js',
  'js/uiComponents.js',
  'js/audioRegistry.js',
  'js/qaPanel.js',
  'js/speech.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Media (audio/images) rarely changes: cache-first.
// Code and pages must never go stale after a deploy: network-first,
// falling back to cache when offline.
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if(e.request.method !== 'GET' || url.origin !== location.origin) return;
  const isMedia = /\.(mp3|png|jpg|svg|webp)$/.test(url.pathname);
  if(isMedia){
    e.respondWith(
      caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
        if(res.ok){ const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
        return res;
      }))
    );
  } else {
    e.respondWith(
      fetch(e.request).then(res => {
        if(res.ok){ const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
        return res;
      }).catch(() => caches.match(e.request))
    );
  }
});
