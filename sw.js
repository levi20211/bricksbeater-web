// 网络优先，离线时回退缓存，避免手机一直用旧版 game.js
const C='bb-v2',F=['./','index.html','game.js','levels.js','manifest.json','assets/restart.gif','assets/prop_3x.gif','assets/prop_shoot_3.gif','assets/prop_heart.gif','assets/ping.mp3','assets/pong.mp3','assets/prop.mp3'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(C).then(c=>c.addAll(F)))});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(n=>n!==C).map(n=>caches.delete(n)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(C).then(x=>x.put(e.request,c));return r}).catch(()=>caches.match(e.request)))});
