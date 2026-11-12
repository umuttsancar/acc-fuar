const CACHE = 'acc-fuar-shell-850fe2d1bc';
const ASSET_CACHE = 'acc-fuar-assets-fc20596709';
const SHELL = ["./", "index.html", "manifest.json", "apple-touch-icon.png", "icon-192.png", "icon-512.png", "assets/fonts/exo-latin.woff2", "assets/fonts/exo-latin-ext.woff2", "assets/img/acc-logo-white.svg", "assets/img/home-clarivent.jpg", "assets/img/home-davlumbaz.jpg", "assets/img/hero-clarivent.jpg", "assets/img/hero-davlumbaz.jpg"];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && !k.startsWith('acc-fuar-assets-')).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function rangeResponse(request, cached) {
  const blob = await cached.blob();
  const size = blob.size;
  const m = /bytes=(\d*)-(\d*)/.exec(request.headers.get('range') || '');
  let start = m && m[1] ? parseInt(m[1], 10) : 0;
  let end = m && m[2] ? parseInt(m[2], 10) : size - 1;
  if (m && !m[1] && m[2]) { start = Math.max(0, size - parseInt(m[2], 10)); end = size - 1; }
  end = Math.min(end, size - 1);
  if (start >= size || start > end) {
    return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
  }
  return new Response(blob.slice(start, end + 1), {
    status: 206,
    statusText: 'Partial Content',
    headers: {
      'Content-Type': cached.headers.get('Content-Type') || 'video/mp4',
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Content-Length': String(end - start + 1),
      'Accept-Ranges': 'bytes',
    },
  });
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  e.respondWith((async () => {
    const hit = (await (await caches.open(CACHE)).match(req, { ignoreSearch: true, ignoreVary: true }))
      || (await (await caches.open(ASSET_CACHE)).match(req, { ignoreSearch: true, ignoreVary: true }));
    if (hit) {
      return req.headers.has('range') ? rangeResponse(req, hit) : hit;
    }
    try {
      return await fetch(req);
    } catch (err) {
      const old = await caches.match(req, { ignoreSearch: true, ignoreVary: true });
      if (old) return req.headers.has('range') ? rangeResponse(req, old) : old;
      if (req.mode === 'navigate') {
        const shell = await (await caches.open(CACHE)).match('index.html');
        if (shell) return shell;
      }
      throw err;
    }
  })());
});
