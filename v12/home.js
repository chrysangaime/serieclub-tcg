/**
 * SérieClub V12 — véritable page d'accueil TV/SVOD.
 * Aucun mécanisme de jeu ni probabilité ne se trouve ici.
 * Les 2 paquets réels restent classic/halloween ; Premium est un aperçu,
 * pas un booster inventé ou une vente.
 */
const esc=x=>String(x??'').replace(/[&<>"']/g,k=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[k]));
const photo=x=>/^https:\/\/[^\s"'<>]+$/i.test(x||'')?esc(x):'';
const nfmt=x=>new Intl.NumberFormat('fr-FR').format(Number(x)||0);
const featuredGenres=[
 {id:'Crime',label:'Thriller & polar',symbol:'⌕',tone:'crime'},
 {id:'Fantasy',label:'Fantastique',symbol:'✧',tone:'fantasy'},
 {id:'Science-Fiction',label:'Science-fiction',symbol:'◈',tone:'sf'},
 {id:'Comedy',label:'Comédie',symbol:'☺',tone:'comedy'},
 {id:'Drama',label:'Drame',symbol:'◆',tone:'drama'},
 {id:'Animation',label:'Animation',symbol:'✦',tone:'animation'}
];
export const homeGenres=featuredGenres.map(x=>x.id);
function visibleShows(s){
 const mixed=[
  ...(Array.isArray(s.homeShows)?s.homeShows:[]),
  ...(Array.isArray(s.seasonShows)?s.seasonShows:[]),
  ...(Array.isArray(s.cards)?s.cards.map(c=>c.series||c):[])
 ];
 const ids=new Set();
 return mixed.filter(x=>{
  if(!x||!Number.isSafeInteger(Number(x.id))||!photo(x.image_url)||ids.has(String(x.id)))return false;
  ids.add(String(x.id));return true;
 }).slice(0,40);
}
function genreArt(items,genre){
 const candidates=items.filter(x=>(x.genres||[]).includes(genre)).slice(0,2);
 const fallback=items.slice(0,2);
 return (candidates.length?candidates:fallback).map((x,i)=>
  '<img class="sc12-genre-poster sc12-genre-poster-'+i+'" src="'+photo(x.image_url)+'" loading="lazy" alt="">').join('');
}
function progressItem(icon,label,description,value,max,tone){
 const cap=Math.max(1,Number(max)||1),current=Math.max(0,Number(value)||0);
 const shown=Math.min(current,cap);
 return '<div class="sc12-milestone"><span class="sc12-milestone-icon '+tone+'" aria-hidden="true">'+icon+'</span>'+
  '<div class="sc12-milestone-body"><div class="sc12-milestone-title"><strong>'+esc(label)+'</strong><span>'+shown+'/'+cap+'</span></div>'+
  '<small>'+esc(description)+'</small><div class="sc12-bar" role="progressbar" aria-label="'+esc(label)+'" aria-valuenow="'+shown+'" aria-valuemin="0" aria-valuemax="'+cap+'"><i style="width:'+Math.round(shown/cap*100)+'%"></i></div></div></div>';
}
function packCard(s,type,foil){
 const halloween=type==='halloween',premium=type==='premium';
 const title=premium?'Premium':halloween?'Halloween':'Original';
 const selected=s.pack===type;
 const disabled=halloween&&!s.isOctober;
 const text=premium?'Une formule en préparation, sans cartes exclusives pour le moment.':halloween?'Une série horrifique garantie en octobre.':'Tous les genres · sept niveaux de rareté.';
 const action=premium
  ?'<button class="sc12-pack-action" type="button" data-route="store">Découvrir Premium <span aria-hidden="true">↗</span></button>'
  :'<button class="sc12-pack-action" type="button" data-pack="'+type+'"'+(disabled?' disabled':'')+' aria-label="Choisir le paquet '+title+'">'+(selected?'✓ Paquet sélectionné':disabled?'Disponible en octobre':'Choisir ce paquet')+' <span aria-hidden="true">→</span></button>';
 const emblem=premium?'<span class="sc12-premium-foil" aria-hidden="true"><b>✦</b><strong>SÉRIECLUB</strong><small>APERÇU PREMIUM</small></span>':foil(type);
 const all=visibleShows(s);
 const themed=halloween?all.filter(x=>(x.genres||[]).some(g=>['Horror','Mystery','Thriller'].includes(g))):all;
 const source=themed.length>=2?themed:all;
 const start=premium?4:halloween?2:0;
 const shots=[source[start%Math.max(source.length,1)],source[(start+1)%Math.max(source.length,1)]].filter(Boolean);
 const background=shots.map((show,i)=>'<img class="sc12-pack-backdrop sc12-pack-backdrop-'+i+'" src="'+photo(show.image_url)+'" alt="" loading="lazy">').join('');
 return '<article class="sc12-pack-tile sc12-pack-'+type+(selected?' is-active':'')+(disabled?' is-disabled':'')+'">'+
  '<span class="sc12-pack-badge">'+(premium?'EN PRÉPARATION':halloween?'ÉDITION SAISONNIÈRE':'COLLECTION ORIGINALE')+'</span>'+
  '<div class="sc12-pack-art" aria-hidden="true">'+background+'<span class="sc12-pack-glow"></span>'+emblem+'</div>'+
  '<div class="sc12-pack-copy"><h3>'+title+'</h3><p>'+text+'</p>'+action+'</div></article>';
}
function posterShelf(shows){
 const display=shows.slice(0,12);
 if(!display.length)return '<div class="sc12-rail-empty">De nouvelles séries seront affichées ici après synchronisation du catalogue France.</div>';
 return '<div class="sc12-title-rail" role="list">'+display.map((show,i)=>
  '<button class="sc12-show-poster" type="button" role="listitem" data-series="'+esc(show.id)+'" aria-label="Voir la fiche de '+esc(show.name)+'">'+
  '<img src="'+photo(show.image_url)+'" alt="" loading="'+(i<5?'eager':'lazy')+'">'+
  '<span class="sc12-show-caption"><b>'+esc(show.name)+'</b><small>Découvrir la série ↗</small></span></button>'
 ).join('')+'</div>';
}
export function svodHome(s,{foil,platformStrip=()=>'',seasonShelf=()=>'',timecode=()=>''}={}){
 const halloween=s.isOctober===true;
 const stock=s.stock?.stock??'—';
 const max=s.stock?.maximum??10;
 const seconds=s.stock?.recharge_seconds??0;
 const opened=Number(s.wallet?.boosters_opened)||0;
 const cards=Array.isArray(s.cards)?s.cards:[];
 const uniq=new Set(cards.map(c=>c.series_id)).size;
 const shows=visibleShows(s);
 const chosen=s.pack==='halloween'&&halloween?'Halloween':'Original';
 const available=Number(stock)>0;
 const hero=halloween?
  {tag:'ÉVÉNEMENT · OCTOBRE',title:'Les nuits',highlight:'d’octobre',
   strap:'Horreur, suspense et mystères à collectionner.',
   intro:'Explore un univers de séries cultes avec notre paquet saisonnier. Cinq cartes, sept raretés, zéro achat.',
   action:'Découvrir le paquet Halloween'}:
  {tag:'LE CLUB DES SÉRIES TV',title:'Tes séries.',highlight:'Ton univers.',
   strap:'La collection prend vie à chaque découverte.',
   intro:'Ouvre des paquets gratuits, découvre des séries diffusées en France et collectionne les affiches qui ont marqué la télévision.',
   action:'Choisir un paquet'};
 const mainCTA=s.user?(available?'Ouvrir le paquet '+chosen:'Réserve épuisée'):'Commencer à jouer';
 return '<section class="hero-packs sc12-home"><div class="pack-section">'+
  '<div class="sc12-banner" aria-label="'+esc(hero.tag)+'"><div class="sc12-banner-content"><span class="sc12-banner-tag">✦ '+hero.tag+'</span>'+
  '<h1>'+hero.title+'<br><em>'+hero.highlight+'</em></h1>'+
  '<strong>'+hero.strap+'</strong><p>'+hero.intro+'</p>'+
  '<div class="sc12-banner-actions"><button class="sc12-hero-cta" type="button" data-home-event>✧ '+esc(hero.action)+' <span aria-hidden="true">→</span></button>'+
  '<button class="sc12-hero-secondary" type="button" data-route="catalog">Explorer les séries ↗</button></div>'+
  '</div><div class="sc12-banner-art" aria-hidden="true"><span class="sc12-orbit sc12-orbit-a">▣</span><span class="sc12-orbit sc12-orbit-b">✦</span></div></div>'+
  '<div id="svod-packs" class="sc12-main-head"><div><span class="sc12-eyebrow">DÉCOUVERTE</span><h2>Choisis ton paquet</h2><p>5 séries par paquet · 7 raretés · Gratuit</p></div><button type="button" class="sc12-text-link" data-route="rules">Comprendre les paquets →</button></div>'+
  '<div class="sc12-home-grid"><div class="sc12-pack-column"><div class="pack-options sc12-pack-options">'+
  packCard({...s,isOctober:halloween},'classic',foil)+
  packCard({...s,isOctober:halloween},'halloween',foil)+
  packCard({...s,isOctober:halloween},'premium',foil)+
  '</div><div class="sc12-open-bar"><div class="sc12-stock"><span class="sc12-stock-icon" aria-hidden="true">◈</span><div><strong><span class="sc12-stock-number">'+esc(stock)+'</span> / '+esc(max)+' paquets</strong>'+
  '<small id="packTimer">'+(stock==='—'?'Connecte-toi pour consulter ta réserve':Number(stock)>=Number(max)?'Réserve pleine':seconds?'Prochain paquet dans '+timecode(seconds):'Disponible')+'</small></div></div>'+
  '<button id="openPack" class="btn primary sc12-open-btn" type="button"'+(s.user&&!available?' disabled':'')+'>'+
  (s.user?esc(mainCTA):'Commencer à jouer<br><small>Créer un compte gratuit</small>')+' <span aria-hidden="true">→</span></button>'+
  '<button class="sc12-daily-btn" type="button" data-daily>✦ Récupérer mes 100 crédits quotidiens ↗</button>'+
  '</div><p class="sc12-rules-note">Le paquet Halloween partage la même réserve et les mêmes probabilités que l’Original. Premium : aperçu uniquement, aucune vente active.</p></div>'+
  '<aside class="sc12-profile-column" aria-label="Ma progression"><div class="sc12-progress-card"><div class="sc12-aside-head"><h3>Mon avancement</h3><button data-route="profile" class="sc12-text-link" type="button">Mon profil →</button></div>'+
  progressItem('ϟ','Explorateur','Ouvrir dix paquets',opened,10,'cyan')+
  progressItem('▧','Collectionneur','Détenir cinquante cartes',cards.length,50,'violet')+
  progressItem('✦','Sérievore','Découvrir dix séries différentes',uniq,10,'blue')+
  '</div><div class="sc12-credit-card"><div><small>✦ Mes crédits</small><strong>'+nfmt(s.wallet?.credits)+'</strong></div><button type="button" data-route="store">Premium & crédits ↗</button></div>'+
  '<div class="sc12-quick-card"><strong>Ton prochain épisode</strong><p>Découvre des séries, complète tes Saisons officielles et débloque des badges.</p>'+
  '<button type="button" data-route="albums">Voir mes Saisons →</button></div></aside></div>'+
  '<div class="sc12-shelf-head"><div><span class="sc12-eyebrow">TON PROGRAMME</span><h2>À découvrir ce soir</h2><p>Une sélection par univers, comme sur une plateforme de streaming.</p></div><button type="button" class="sc12-text-link" data-route="catalog">Voir le catalogue →</button></div>'+
  '<div class="sc12-genre-rail" role="list">'+
  '<button type="button" role="listitem" class="sc12-genre-card sc12-genre-classics" data-home-decade="1990"><span class="sc12-genre-symbol">★</span><span>Séries cultes</span></button>'+
  featuredGenres.map(g=>'<button type="button" role="listitem" class="sc12-genre-card sc12-genre-'+g.tone+'" data-home-genre="'+g.id+'">'+genreArt(shows,g.id)+
   '<span class="sc12-genre-symbol">'+g.symbol+'</span><span>'+esc(g.label)+'</span></button>').join('')+
  '</div>'+
  '<div class="sc12-shelf-head sc12-trending-title"><div><span class="sc12-eyebrow">LE CATALOGUE FRANCE</span><h2>Séries à l’affiche</h2><p>De vraies séries vérifiées pour la France, pas une sélection fictive.</p></div><button class="sc12-text-link" type="button" data-route="catalog">Toutes les séries →</button></div>'+
  posterShelf(shows)+
  (halloween?seasonShelf(s.seasonShows||[]):'')+
  '<div class="sc12-footer-strip">'+platformStrip()+'</div>'+
  '</div></section>';
}
