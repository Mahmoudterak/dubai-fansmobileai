/* Dubai Fans AI — Service Worker
   الصفحة دايماً من الشبكة الأول (عشان التحديثات توصل على طول)، والملفات الثابتة من الكاش.
   طلبات /api/ مابتتخزنش أبداً. */
const CACHE = 'dfai-v50';
const SHELL = ['/', '/manifest.json', '/favicon.svg', '/icons/icon-192.png', '/icons/apple-touch-icon.png',
  '/vendor/marked.min.js', '/vendor/purify.min.js'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// إشعارات الدفع: الخادم يرسل JSON فيه title و body و url
self.addEventListener('push', (e) => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; } catch (_) { data = { body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(data.title || 'دبي فانز AI', {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/favicon.svg',
    dir: 'rtl',
    lang: 'ar',
    data: { url: data.url || '/' },
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const target = (e.notification.data && e.notification.data.url) || '/';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    for (const c of list) { if ('focus' in c) return c.focus(); }
    return self.clients.openWindow(target);
  }));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin || url.pathname.startsWith('/api/')) return;

  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((res) => {
      if (res.ok && (url.pathname === '/' || url.pathname === '/index.html')) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put('/', copy)).catch(() => {});
      }
      return res;
    }).catch(() => caches.match('/').then((r) => r || new Response(
      '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><body style="background:#07080C;color:#F2F4F8;font-family:sans-serif;display:grid;place-items:center;height:100vh;margin:0;text-align:center" dir="rtl"><div><h2>مفيش إنترنت</h2><p>Dubai Fans AI محتاج إنترنت. اتأكد من الاتصال وجرّب تاني.</p></div>',
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }))));
    return;
  }

  if (/\.(js|css|png|svg|woff2?|json)$/.test(url.pathname)) {
    e.respondWith(caches.match(req).then((hit) => {
      const net = fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {}); }
        return res;
      });
      return hit || net;
    }));
  }
});
