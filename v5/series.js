// SérieClub V5 — fiches et filmographies TVmaze. Utilisation à la demande.
const BASE='https://api.tvmaze.com';
const expiry=45*60*1000;
const cache=new Map(),pending=new Map();
export const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const safeImage=s=>/^https:\/\//i.test(s||'')?escapeHtml(s):'';
const validId=id=>Number.isSafeInteger(Number(id))&&Number(id)>0;
const cached=key=>{const x=cache.get(key);return x&&x.time>Date.now()?x.value:null};
const save=(key,val)=>{if(cache.size>350)cache.delete(cache.keys().next().value);cache.set(key,{value:val,time:Date.now()+expiry});return val};
async function request(path){
 if(pending.has(path))return pending.get(path);
 const p=(async()=>{
  for(let n=0;n<2;n++){
   let r;try{r=await fetch(BASE+path,{headers:{Accept:'application/json'}})}catch{throw Error('Connexion au service des fiches indisponible.')}
   if(r.status===404)return null;
   if((r.status===429||r.status>=500)&&n===0){await new Promise(ok=>setTimeout(ok,1050));continue}
   if(!r.ok)throw Error('Erreur TVmaze HTTP '+r.status);
   return r.json();
  }
  throw Error('TVmaze est temporairement surchargé.');
 })();
 pending.set(path,p);try{return await p}finally{pending.delete(path)}
}
export function plainText(html){
 return String(html??'').replace(/<\s*br\s*\/?>/gi,' ').replace(/<\/\s*(p|div|li|h[1-6])\s*>/gi,' ').replace(/<[^>]*>/g,'')
 .replace(/&#(x[0-9a-f]+|\d+);/gi,(_,n)=>{const k=n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):parseInt(n,10);return k>=32&&k<=0x10ffff?String.fromCodePoint(k):' '})
 .replace(/&(?:nbsp|amp|lt|gt|quot|apos|rsquo|lsquo|ldquo|rdquo|hellip|mdash|ndash);/gi,x=>({'&nbsp;':' ','&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'",'&rsquo;':'’','&lsquo;':'‘','&ldquo;':'“','&rdquo;':'”','&hellip;':'…','&mdash;':'—','&ndash;':'–'}[x.toLowerCase()]||x))
 .replace(/\s+/g,' ').trim().slice(0,3500);
}
export function shortSummary(text,limit=385){
 const t=plainText(text);if(t.length<=limit)return t;
 const part=t.slice(0,limit),k=part.lastIndexOf(' ');return part.slice(0,k>limit*.65?k:limit)+'…';
}
export function personModel(p){
 if(!p||!validId(p.id))return null;
 return {id:Number(p.id),name:String(p.name||'Interprète'),image_url:p.image?.medium||p.image?.original||''};
}
export function showModel(s){
 if(!s||!validId(s.id))return null;
 return {id:Number(s.id),name:String(s.name||'Série'),image_url:s.image?.medium||s.image?.original||'',premiered:String(s.premiered||''),genres:Array.isArray(s.genres)?s.genres:[],summary:plainText(s.summary),language:String(s.language||''),status:String(s.status||''),rating:Number(s.rating?.average)||null,runtime:Number(s.averageRuntime||s.runtime)||null,origin:s.network?.country?.name||s.webChannel?.country?.name||'',url:/^https:\/\/www\.tvmaze\.com\//.test(s.url||'')?s.url:'',cast:(s._embedded?.cast||[]).map(row=>({person:personModel(row.person),character:String(row.character?.name||'')})).filter(x=>x.person)};
}
export function creditsModel(rows){
 const seen=new Set();
 return (Array.isArray(rows)?rows:[]).map(row=>{const show=showModel(row?._embedded?.show);return show?{...show,role:String(row?._embedded?.character?.name||'')}:null})
  .filter(s=>{if(!s||seen.has(s.id))return false;seen.add(s.id);return true})
  .sort((a,b)=>b.premiered.localeCompare(a.premiered)||a.name.localeCompare(b.name,'fr'));
}
export async function getSeries(id){
 if(!validId(id))throw Error('Série invalide.');
 const key='series:'+Number(id);return cached(key)||save(key,showModel(await request('/shows/'+Number(id)+'?embed=cast')));
}
export async function getCredits(id){
 if(!validId(id))throw Error('Interprète invalide.');
 const key='credits:'+Number(id);return cached(key)||save(key,creditsModel(await request('/people/'+Number(id)+'/castcredits?embed=show')));
}
export async function searchActors(q){
 const input=String(q||'').trim().slice(0,75);if(input.length<2)return [];
 const key='people:'+input.toLocaleLowerCase('fr');const fromCache=cached(key);if(fromCache)return fromCache;
 const rows=await request('/search/people?q='+encodeURIComponent(input));
 return save(key,(Array.isArray(rows)?rows:[]).slice(0,12).map(x=>personModel(x.person)).filter(Boolean));
}
export function detailSheet(show,{allSummary=false,allCast=false}={}){
 const title=show?.name||'Série',description=show?.summary||'',cast=show?.cast||[],visible=allCast?cast.length:10;
 const tags=(show?.genres||[]).map(g=>'<span>'+escapeHtml(g)+'</span>').join('');
 const item=(label,value)=>value?'<div><small>'+escapeHtml(label)+'</small><strong>'+escapeHtml(value)+'</strong></div>':'';
 const facts=item('Première diffusion',show?.premiered?.slice(0,4))+item('Statut',show?.status==='Running'?'En cours':show?.status==='Ended'?'Terminée':show?.status)+item('Durée',show?.runtime?show.runtime+' min':'')+item('Note TVmaze',show?.rating?show.rating+'/10':'')+item('Origine',show?.origin);
 return '<div class="sc5-sheet"><span class="sc5-kicker">SÉRIECLUB / FICHE SÉRIE</span><div class="sc5-cover">'+
 '<img src="'+safeImage(show?.image_url)+'" alt="Affiche de '+escapeHtml(title)+'" loading="lazy">'+
 '<div class="sc5-information"><span class="sc5-kicker">L’UNIVERS DES SÉRIES</span><h2>'+escapeHtml(title)+'</h2><div class="sc5-genres">'+tags+'</div><div class="sc5-facts">'+facts+'</div>'+
 '<h3>L’histoire en quelques mots</h3><p class="sc5-description">'+escapeHtml(description?(allSummary?description:shortSummary(description)):'Aucun résumé disponible dans le catalogue TVmaze.')+'</p>'+
 (description.length>385?'<button type="button" class="sc5-textlink" data-expand-summary aria-expanded="'+allSummary+'">'+(allSummary?'Réduire le résumé ↑':'Lire la suite ↓')+'</button>':'')+
 (show?.language&&show.language!=='French'?'<div class="sc5-language">Résumé TVmaze en langue d’origine : '+escapeHtml(show.language)+'</div>':'')+'</div></div>'+
 '<section class="sc5-cast"><div class="sc5-heading"><div><span class="sc5-kicker">LES VISAGES DE LA SÉRIE</span><h3>Distribution principale</h3></div><small>'+cast.length+' interprètes</small></div>'+
 (cast.length?'<div class="sc5-actors">'+cast.slice(0,visible).map(row=>'<button type="button" class="sc5-actor" data-actor="'+row.person.id+'" aria-label="Voir les séries avec '+escapeHtml(row.person.name)+'">'+
 (row.person.image_url?'<img src="'+safeImage(row.person.image_url)+'" alt="" loading="lazy">':'<span class="sc5-person-placeholder">◉</span>')+
 '<b>'+escapeHtml(row.person.name)+'</b><small>'+escapeHtml(row.character||'Interprète')+'</small><span>Ses séries ↗</span></button>').join('')+'</div>'+
 (cast.length>visible?'<button class="btn subtle small" data-expand-cast>Voir tous les interprètes ↓</button>':''):
 '<p class="note">Distribution non renseignée pour cette série.</p>')+'</section>'+
 '<div class="sc5-footer"><div><h3>Prolonge l’expérience.</h3><p>Retrouve les autres œuvres de ces interprètes et les offres de visionnage.</p></div><div class="row"><a class="btn primary" href="https://www.google.com/search?q='+encodeURIComponent('site:justwatch.com/fr/serie/ '+title)+'" target="_blank" rel="noopener noreferrer">Où regarder ↗</a><a class="btn subtle" href="https://www.amazon.fr/s?k='+encodeURIComponent(title+' coffret DVD Blu-ray série')+'" target="_blank" rel="noopener noreferrer">Coffrets ↗</a></div></div>'+
 '<p class="sc5-credit">Données et distribution : <a href="'+(show?.url?escapeHtml(show.url):'https://www.tvmaze.com/api')+'" target="_blank" rel="noopener noreferrer">TVmaze</a>. Affiches et œuvres appartiennent à leurs ayants droit ; aucune disponibilité SVOD garantie.</p></div>';
}
export function detailsLoading(title){return '<div class="sc5-sheet"><span class="sc5-kicker">SÉRIECLUB / FICHE SÉRIE</span><div class="sc5-loading" role="status"><div class="sc5-spinner"></div><h2>'+escapeHtml(title||'Série')+'</h2><p>Récupération du résumé et de la distribution…</p></div></div>'}
export function actorBanner(person,total,displayed,inCatalogue){
 return '<div class="sc5-filter"><div class="sc5-filter-identity">'+
 (person.image_url?'<img src="'+safeImage(person.image_url)+'" alt="">':'<span class="sc5-person-placeholder">◉</span>')+
 '<div><span class="sc5-kicker">EXPLORER PAR ACTEUR</span><h2>'+escapeHtml(person.name)+'</h2><p>'+total+' séries répertoriées sur TVmaze · '+displayed+' résultats affichés</p></div></div>'+
 '<div class="sc5-filter-controls"><label><input id="actorCatalogueOnly" type="checkbox" '+(inCatalogue?'checked':'')+'> Uniquement dans SérieClub</label><button class="btn subtle small" data-clear-actor>✕ Effacer le filtre</button></div></div>';
}
export function actorSuggestions(people){
 return '<div class="sc5-suggestions" aria-label="Acteurs trouvés">'+(people.length?people.map(p=>'<button type="button" class="sc5-person-result" data-select-actor="'+p.id+'">'+
 (p.image_url?'<img src="'+safeImage(p.image_url)+'" alt="" loading="lazy">':'<span class="sc5-person-placeholder">◉</span>')+'<b>'+escapeHtml(p.name)+'</b><span>Voir ses séries ↗</span></button>').join(''):'<p class="note">Aucun interprète correspondant.</p>')+'</div>';
}
export function creditCard(show){
 const year=show.premiered?.slice(0,4)||'';
 return '<article class="collect-card sc5-film"><button class="sc5-film-cover" data-series="'+show.id+'" aria-label="Voir '+escapeHtml(show.name)+'">'+
 '<img src="'+safeImage(show.image_url)+'" loading="lazy" alt="Affiche de '+escapeHtml(show.name)+'"></button><div class="card-title">'+escapeHtml(show.name)+'</div>'+
 '<div class="card-meta"><span class="sc5-catalogue-tag">'+(show.inCatalogue?'SérieClub':'TVmaze')+'</span><small>'+escapeHtml(year)+'</small></div>'+
 (show.role?'<div class="sc5-role">Rôle : '+escapeHtml(show.role)+'</div>':'')+
 '<button class="card-action" data-series="'+show.id+'">Ouvrir la fiche ↗</button></article>';
}
