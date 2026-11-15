// Offline support: the app shell is cached on install, audio clips as they are played.
const VERSION = 'bambou-v11';   // bump when audio clips are re-recorded: clips are served cache-first
const SHELL = [
  './', 'index.html', 'css/app.css', 'manifest.webmanifest', 'icons/icon-192.png',
  'vendor/hanzi-writer.min.js', 'vendor/pinyin-pro.js', 'data/chars.json', 'audio/index.json',
  'js/app.js', 'js/audio.js', 'js/data.js', 'js/hanzi.js', 'js/i18n.js', 'js/pinyin-table.js',
  'js/session.js', 'js/speech.js', 'js/store.js', 'js/tutor.js', 'js/ui.js', 'js/views.js',
];
self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    await c.addAll(SHELL);
    // word and sentence clips are small: fetch them all so lessons work offline
    try {
      const { words, v } = await (await fetch('audio/index.json', { cache: 'no-cache' })).json();
      await Promise.allSettled(words.map(w => c.add(`audio/w/${w}.mp3${v ? '?v=' + v : ''}`)));
    } catch { /* offline install */ }
    self.skipWaiting();
  })());
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.hostname === 'api.anthropic.com') return;
  const sameOrigin = url.origin === location.origin;
  const isFont = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!sameOrigin && !isFont) return;
  const isAudio = sameOrigin && url.pathname.includes('/audio/') && url.pathname.endsWith('.mp3');
  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const hit = await cache.match(e.request, { ignoreSearch: !isAudio });   // audio URLs carry their version
    if (hit && (isAudio || isFont)) return hit;                  // never changes: cache first
    try {
      // always ask the server whether the file changed: an updated app must never run old code
      const res = await fetch(e.request, sameOrigin && !isAudio ? { cache: 'no-cache' } : undefined);
      if (res.ok && res.status === 200) cache.put(e.request, res.clone());   // skip partial (206) responses
      return res;
    } catch (err) {
      if (hit) return hit;
      throw err;
    }
  })());
});
