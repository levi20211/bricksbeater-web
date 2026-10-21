const C='bb-v1',F=['./','index.html','game.js','levels.js','manifest.json','assets/restart.gif','assets/prop_3x.gif','assets/prop_shoot_3.gif','assets/prop_heart.gif','assets/ping.mp3','assets/pong.mp3','assets/prop.mp3'];
self.addEventListener('install',e=>e.waitUntil(caches.open(C).then(c=>c.addAll(F))));
self.addEventListener('fetch',e=>e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request))));
