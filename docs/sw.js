// sw.js — cache-first app shell. Bump CACHE_VERSION on every deploy.
// Every file in docs/ is precached so the game loads offline and as a home-screen app.
const CACHE_VERSION = 'muntstad-v19';
const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css',
  './js/main.js',
  './js/config.js',
  './js/economy.js',
  './js/eiland.js',
  './js/nacht.js',
  './js/save.js',
  './js/audio.js',
  './js/speech.js',
  './js/i18n.js',
  './js/3d/engine.js',
  './js/3d/build.js',
  './js/3d/world.js',
  './js/3d/buildings.js',
  './js/3d/avatar.js',
  './js/3d/scene-stad.js',
  './js/3d/heightmap.js',
  './js/3d/terrain.js',
  './js/3d/forest.js',
  './js/3d/forest-place.js',
  './js/3d/camp.js',
  './js/3d/daycycle.js',
  './js/3d/daynight.js',
  './js/3d/scene-eiland.js',
  './js/3d/spoken.js',
  './js/3d/player.js',
  './js/3d/controls.js',
  './js/3d/props.js',
  './js/3d/pets.js',
  './js/3d/thumbs.js',
  './vendor/three.module.min.js',
  './vendor/three.core.min.js',
  './js/art.js',
  './js/ui/mentor.js',
  './js/ui/popups.js',
  './js/ui/fx.js',
  './js/ui/start.js',
  './js/ui/stad.js',
  './js/ui/avontuur.js',
  './js/ui/kamp.js',
  './js/ui/samen.js',
  './js/net/relay.js',
  './js/net/samen.js',
  './js/ui/werk.js',
  './js/ui/winkel.js',
  './js/ui/huis.js',
  './js/ui/papa.js',
  './icons/icon.svg',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(PRECACHE.map((url) => new Request(url, { cache: 'reload' })))) // never precache stale HTTP-cache copies
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((hit) => {
      if (hit) return hit;
      return fetch(request).then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy)).catch(() => {});
        }
        return response;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
