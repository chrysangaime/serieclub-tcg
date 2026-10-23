/* V1.0 du jeu de séries (nom définitif à valider) — secours hors connexion sans cache de données joueurs. */
const VERSION='sc1-offline-shell-3';
const OFFLINE='./offline.html';
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(VERSION).then(cache=>cache.add(OFFLINE)));
 self.skipWaiting();
});
self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(key=>key.startsWith('sc1-offline-shell-')&&key!==VERSION)
    .map(key=>caches.delete(key)));
  await self.clients.claim();
 })());
});
self.addEventListener('fetch',event=>{
 const req=event.request;
 // Aucun cache des requêtes Supabase, du compte, des cartes, des images, ni des RPC.
 if(req.mode!=='navigate'||req.method!=='GET')return;
 const url=new URL(req.url);
 if(url.origin!==self.location.origin||!url.pathname.startsWith(new URL('./',self.registration.scope).pathname))return;
 event.respondWith(fetch(req).catch(async()=>{
  const cache=await caches.open(VERSION);
  return await cache.match(OFFLINE)||Response.error();
 }));
});
