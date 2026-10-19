const CACHE = 'falcioni-kpis-v42';
const ASSETS = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(() => {}));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  const url = e.request.url;
  if (url.includes('firebasejs') || url.includes('firestore') || url.includes('googleapis')) return;

  // HTML / navegação: REDE PRIMEIRO (sempre pega a versão nova quando online),
  // caindo para o cache só quando estiver offline. Evita ficar preso em versão antiga.
  const ehPagina = e.request.mode === 'navigate' || e.request.destination === 'document'
    || url.endsWith('/') || url.endsWith('/index.html');
  if (ehPagina) {
    e.respondWith(
      fetch(e.request).then(r => {
        const copy = r.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        return r;
      }).catch(() => caches.match(e.request).then(r => r || caches.match('/index.html')))
    );
    return;
  }

  // Demais recursos: cache primeiro (rápido), buscando na rede se não tiver.
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
