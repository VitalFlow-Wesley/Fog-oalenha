const CACHE_NAME = 'fogao-a-lenha-pwa-v2'
const APP_SHELL = ['/', '/manifest.webmanifest', '/assets/logooficial.png']

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).catch(() => null)
  )
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
  )
  self.clients.claim()
})

self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  if (request.method !== 'GET') return
  if (url.pathname.startsWith('/api/')) return

  // Nunca servir HTML/JS/CSS antigo primeiro. Isso evita celular ficar preso em versão antiga.
  if (
    request.mode === 'navigate' ||
    url.pathname === '/' ||
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css')
  ) {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .then(response => response)
        .catch(() => caches.match(request).then(cached => cached || caches.match('/')))
    )
    return
  }

  event.respondWith(
    fetch(request)
      .then(response => {
        const copy = response.clone()
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy)).catch(() => null)
        return response
      })
      .catch(() => caches.match(request).then(cached => cached || caches.match('/')))
  )
})
