/* SLT leaflet library: offline support.
   Everything is fetched fresh when there is a connection, so updates show straight away.
   The last copy of each page and each leaflet opened is kept for when there is no signal.
   Change VERSION whenever the list of SHELL files below changes. */
var VERSION = 'v1';
var SHELL_CACHE = 'slt-shell-' + VERSION;
var FILE_CACHE = 'slt-files'; // must match SLT.FILE_CACHE in assets/app.js
var SHELL = [
  './',
  'l/',
  'p/',
  'about/',
  'assets/style.css',
  'assets/app.js',
  'assets/library.js',
  'assets/leaflet.js',
  'assets/pack.js',
  'assets/qrcode.js',
  'assets/icons/icon-192.png',
  'data/site.json',
  'data/taxonomy.json',
  'data/catalogue.json',
  'manifest.webmanifest'
];
var NETWORK_WAIT_MS = 5000;

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then(function (cache) { return cache.addAll(SHELL); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (key) {
        if (key.indexOf('slt-shell-') === 0 && key !== SHELL_CACHE) return caches.delete(key);
        return null;
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

function isPdf(url) { return /\.pdf$/i.test(url.pathname); }

// Pages are stored without their ?id=... part so one stored copy serves every leaflet.
function storageKey(request, url) {
  if (request.mode === 'navigate') return url.origin + url.pathname;
  return request;
}

function fromNetwork(request, cacheName, key) {
  return fetch(request).then(function (response) {
    if (response && response.status === 200 && response.type === 'basic') {
      var copy = response.clone();
      caches.open(cacheName).then(function (cache) { cache.put(key, copy); });
    }
    return response;
  });
}

self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET') return;
  var url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.headers.has('range')) return; // partial PDF requests go straight to the network

  if (isPdf(url)) {
    // Leaflets: always try for the latest copy; fall back to the stored one offline.
    event.respondWith(
      fromNetwork(request, FILE_CACHE, request).catch(function () {
        return caches.match(request, { ignoreSearch: true }).then(function (hit) {
          return hit || new Response('This leaflet has not been saved on this device yet.', {
            status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
        });
      })
    );
    return;
  }

  // Pages, data and styles: latest copy if it arrives quickly, otherwise the stored copy.
  var key = storageKey(request, url);
  event.respondWith(new Promise(function (resolve) {
    var settled = false;
    function finish(response) { if (!settled && response) { settled = true; resolve(response); } }
    function stored() {
      return caches.match(key, { ignoreSearch: true }).then(function (hit) {
        return hit || caches.match(request, { ignoreSearch: true });
      });
    }
    var timer = setTimeout(function () { stored().then(finish); }, NETWORK_WAIT_MS);
    fromNetwork(request, SHELL_CACHE, key).then(function (response) {
      clearTimeout(timer);
      finish(response);
    }).catch(function () {
      clearTimeout(timer);
      stored().then(function (hit) {
        finish(hit || new Response('You are offline and this page has not been saved yet.', {
          status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        }));
      });
    });
  }));
});
