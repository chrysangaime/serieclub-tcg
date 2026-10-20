import {commerce} from './config.js';
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const photo = value => /^https:\/\//i.test(value || '') ? esc(value) : '';

/**
 * Plateformes = points de découverte, PAS confirmation d'un catalogue local.
 * Les libellés sont typographiques et non des copies d'assets officiels.
 * Les liens s'ouvrent vers les sites des services concernés.
 */
export const platforms=Object.freeze([
 {id:'netflix',name:'Netflix',mark:'N',url:'https://www.netflix.com/fr/'},
 {id:'prime',name:'Prime Video',mark:'p',url:'https://www.primevideo.com/'},
 {id:'max',name:'HBO Max',mark:'M',url:'https://www.hbomax.com/'},
 {id:'disney',name:'Disney+',mark:'D+',url:'https://www.disneyplus.com/'},
 {id:'apple',name:'Apple TV+',mark:'TV',url:'https://tv.apple.com/fr'},
 {id:'canal',name:'CANAL+',mark:'C+',url:'https://www.canalplus.com/'},
 {id:'paramount',name:'Paramount+',mark:'P+',url:'https://www.paramountplus.com/'}
]);

export function platformStrip(){
 return '<section class="stream-zone" aria-label="Explorer les plateformes de streaming">'+
 '<div class="platform-header"><div><span class="caps">L’UNIVERS DES SÉRIES</span><h2>Les séries sont partout. Le club les réunit.</h2><p>Explore les services de streaming et découvre où chercher tes prochaines séries favorites.</p></div><span class="note">7 services à explorer ↗</span></div>'+
 '<div class="platform-row">'+platforms.map(p=>'<a class="platform-chip" href="'+p.url+'" target="_blank" rel="noopener noreferrer" aria-label="Visiter '+esc(p.name)+'"><span class="platform-mark '+esc(p.id)+'" aria-hidden="true">'+esc(p.mark)+'</span>'+esc(p.name)+' ↗</a>').join('')+'</div>'+
 '<div class="platform-disclaimer">Liens informatifs vers les plateformes, pas de garantie de disponibilité par série. SérieClub est indépendant des services présentés et n’est pas sponsorisé par eux.</div></section>';
}

export function seasonShelf(series=[]){
 if(!Array.isArray(series)||series.length===0){
  return '<section class="season-shelf" aria-label="La sélection Halloween"><div class="caps">ÉVÉNEMENT · OCTOBRE</div><div class="shelf-head"><div><h2>La saison des frissons.</h2><p>Une sélection de séries d’horreur, de suspense et de mystère à retrouver dès que le catalogue aura été synchronisé.</p></div></div></section>';
 }
 return '<section class="season-shelf" aria-label="La sélection Halloween">'+
 '<div class="shelf-head"><div><span class="caps sc-season-tag">LA SÉLECTION D’OCTOBRE</span><h2>À regarder la lumière allumée.</h2><p>Horreur, suspense, mystère et fantastique : découvre de vraies séries du catalogue, puis explore où les regarder.</p></div><span class="note">Sélection éditoriale · pas un indicateur de disponibilité</span></div>'+
 '<div class="shelf-grid">'+series.slice(0,6).map(s=>'<button class="shelf-item" data-series="'+esc(s.id)+'" aria-label="Découvrir '+esc(s.name)+'"><img src="'+photo(s.image_url)+'" alt="Affiche de '+esc(s.name)+'" loading="lazy"><span>'+esc(s.name)+'</span><small>'+(Array.isArray(s.genres)?s.genres.slice(0,2).map(esc).join(' · '):'Série')+'</small></button>').join('')+'</div></section>';
}

export function whereToWatchLink(title){
 // Une recherche du titre sur JustWatch via un moteur connu, sans inventer
 // de deep link ou la disponibilité du programme en France.
 const search='site:justwatch.com/fr/serie/ '+String(title||'').trim()+' streaming';
 return 'https://www.google.com/search?q='+encodeURIComponent(search);
}
export function amazonSearchLink(title){
 const term=(String(title||'').trim()+' coffret Blu-ray DVD série').trim();
 const target='https://www.amazon.fr/s?k='+encodeURIComponent(term);
 const tag=String(commerce.amazonPartnerTag||'').trim();
 // N'activer un tag que s'il est explicitement configuré.
 return target+(tag && /^[a-zA-Z0-9-]{3,45}$/.test(tag)?'&tag='+encodeURIComponent(tag):'');
}
export const amazonIsAffiliate=()=>Boolean(commerce.amazonPartnerTag&&/^[a-zA-Z0-9-]{3,45}$/.test(commerce.amazonPartnerTag));

export function seriesDetail(s){
 const title=s?.name||'Série',year=String(s?.premiered||'').slice(0,4);
 const genres=Array.isArray(s?.genres)?s.genres:[];
 return '<div class="dialog series-detail" role="dialog" aria-modal="true" aria-label="Détails de la série">'+
 '<button class="close" data-close aria-label="Fermer">×</button>'+
 '<img src="'+photo(s?.image_url)+'" alt="Affiche de '+esc(title)+'">'+
 '<div><div class="caps">FICHE SÉRIE · SÉRIECLUB</div><h2>'+esc(title)+'</h2>'+
 '<p>'+(year?'Première diffusion : '+esc(year):'Série TV')+'</p>'+
 '<div class="detail-tags">'+genres.map(g=>'<span>'+esc(g)+'</span>').join('')+'</div>'+
 '<p>Tu connais la série ? Découvre les services de streaming et les éventuels coffrets. Les offres et leur disponibilité en France sont à vérifier directement auprès des marchands.</p>'+
 '<div class="external-actions">'+
 '<a class="btn primary" href="'+whereToWatchLink(title)+'" target="_blank" rel="noopener noreferrer">Chercher où regarder ↗</a>'+
 '<a class="btn subtle" href="'+amazonSearchLink(title)+'" target="_blank" rel="noopener noreferrer">Rechercher un coffret ↗</a>'+
 '</div>'+
 '<p class="ad-label">'+(amazonIsAffiliate()?'Lien Amazon pouvant générer une commission pour SérieClub, sans coût supplémentaire pour toi.':'Lien marchand de recherche non affilié pour le moment.')+
 ' SérieClub n’est affilié à aucun diffuseur et ne certifie aucune disponibilité de streaming.</p>'+
 '</div></div>';
}
