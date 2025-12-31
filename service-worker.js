self.addEventListener('install', e => {
  e.waitUntil(self.skipWaiting());
});
self.addEventListener('activate', e => {
  e.waitUntil(self.clients.claim());
});
self.addEventListener('fetch', () => { /* simple: rely on network, cached by browser if needed */ });