import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
test('L’application est installable et offre des raccourcis utiles',()=>{
 const manifest=JSON.parse(read('manifest.webmanifest'));
 assert.equal(manifest.display,'standalone');assert.equal(manifest.id,'./');
 assert.equal(manifest.shortcuts.length,2);assert.equal(manifest.lang,'fr');
 assert.match(read('v3/views.js'),/data-install-app/);
 assert.match(read('v3/app.js'),/beforeinstallprompt/);
 assert.match(read('v3/app.js'),/serviceWorker\.register/);
});
test('Hors connexion: aucune transaction locale et aucune API personnelle stockée',()=>{
 const sw=read('sw.js');assert.match(sw,/req.mode!=='navigate'/);
 assert.match(sw,/caches\.open\(VERSION\)/);
 assert.match(sw,/offline\.html/);
 assert.doesNotMatch(sw,/caches\.addAll/);
 assert.doesNotMatch(sw,/supabase\.co|auth\/v1|rest\/v1/);
 assert.match(read('offline.html'),/aucun[e]? carte ni aucun crédit|aucune carte ni aucun crédit/);
});
test('Ressources PWA et lien de la V1.0 se trouvent sur la page',()=>{
 const html=read('index.html');
 for(const x of ['manifest.webmanifest?v=1.0.0&build=10','src="./v3/app.js?v=1.0.0&build=21"'])
 assert.ok(html.includes(x),x);
});
