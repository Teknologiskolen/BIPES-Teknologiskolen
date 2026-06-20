const CACHE_NAME = 'v{{app_version}}';
const urlsToCache = [
  'ide',
  'static/style.css',
  'static/media/icons.svg',
  'static/media/icon/icon-192x192.png',
  'static/media/manifest.webmanifest',
  'static/libs/bipes.umd.js',
  {% for item in imports -%}
  'static/libs/{{ item }}.js',
  {% endfor %}
  {% for item in explicit_imports -%}
  'static/{{ item }}.js',
  {% endfor %}
  {% for plugin in lang_imports -%}
  'static/{{ plugin }}',
  {% endfor %}
  {% for img in static_images -%}
  'static/{{ img }}',
  {% endfor %}
];
let prefix = self.location.pathname.replace('serviceworker.js', '')

let urlsToCacheAbsolute = urlsToCache.map(s => prefix + s)

self.addEventListener('install', event => {
  // Activate a freshly-installed worker immediately instead of waiting for all
  // tabs to close — otherwise an old worker keeps serving stale cached modules.
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCacheAbsolute))
  );
});


self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
        )
      )
      // Take control of open pages right away so the new worker (and its purged
      // cache) is used on this load, not the next one.
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
{% if import_type == "text/javascript" -%}
  let ogn = self.location.origin + prefix
  let req = event.request.url
  if (req.substring(0, ogn.length) === ogn &&
      (urlsToCache.includes(req.substring(ogn.length)) ||
       req.substring(ogn.length,ogn.length + 3) === 'ide')
  ){
   // Network-first: always try the network so edited modules/assets show up on a
   // normal reload; fall back to the cache only when offline. (Was cache-first,
   // which kept serving stale page modules after every rebuild.)
   event.respondWith(
      fetch(event.request)
        .then(response => {
          let copy = response.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy))
          return response
        })
        .catch(() => caches.match(event.request, {ignoreSearch: true}))
    )
  } else
    return false

{% else %}
  return false
{% endif %}
});
