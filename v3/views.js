import {platformStrip,seasonShelf} from './discovery.js?v=6.1.0';
import {actorCatalogueView} from '../v4/series.js?v=6.1.0&build=18';
import {genreFR} from '../v5/fr-text.js?v=5.3.1';
import {fusionPlan,fusionRanks,nextFusionRank} from '../v6/fusion.js?v=8.0.0';
import {quizHTML} from '../v6/games.js?v=8.1.0';
import {gameCards,rewardQuizHTML} from '../v7/arena.js?v=10.1.0';
import {pixelPreviewHTML} from '../v10/pixel-preview.js?v=10.2.0';
import {profileArtPanel} from '../v10/profile.js?v=10.1.1';
import {svodHome} from '../v12/home.js?v=1.1.0&build=12';
export const navItems=[
 ['packs','▤','Paquets'],['collection','▣','Collection'],['albums','▤','Albums de séries'],
 ['catalog','⌕','Catalogue'],['wishlist','☆','Souhaits'],['market','◇','Le Comptoir'],
 ['community','♧','Le Signal'],['games','♜','Jeux & défis'],['quests','✦','Missions'],
 ['fusion','⚒','Fusions'],['rankings','♙','Classement'],['profile','♙','Profil'],
 ['store','✦','Premium & crédits'],['settings','☷','Paramètres']
];
export const ranks=['Commune','Peu commune','Rare','Épique','Légendaire','Mythique','Unique'];
export const esc=v=>String(v??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
export const photo=s=>/^https:\/\//i.test(s||'')?esc(s):'';
export const money=n=>new Intl.NumberFormat('fr-FR').format(Number(n)||0);
export const monthHalloween=()=>new Date().getMonth()===9;
export const timecode=s=>String(Math.floor(Math.max(0,s)/60)).padStart(2,'0')+':'+String(Math.floor(Math.max(0,s)%60)).padStart(2,'0');
export function foil(type='classic'){
 const horror=type==='halloween';
 const art=horror?'<svg viewBox="0 0 130 120" aria-hidden="true"><defs><radialGradient id="moonT"><stop stop-color="#ffe9aa"/><stop offset="1" stop-color="#f39678"/></radialGradient></defs><circle cx="65" cy="53" r="42" fill="url(#moonT)"/><path d="M65 51 56 33 52 45 C40 43 32 27 13 36 L23 53 Q11 57 7 77 Q25 66 36 81 Q42 66 54 74 L65 91 L76 74 Q88 66 94 81 Q105 66 123 77 Q119 57 107 53 L117 36 C98 27 90 43 78 45 L74 33Z" fill="#21172d" stroke="#663554" stroke-width="1.6"/><circle cx="60" cy="55" r="1.7" fill="#f7c599"/><circle cx="70" cy="55" r="1.7" fill="#f7c599"/></svg>':'<svg viewBox="0 0 120 120" aria-hidden="true"><rect x="23" y="33" width="74" height="56" rx="12" fill="none" stroke="currentColor" stroke-width="2"/><path d="M36 70 48 56 60 67 74 48 84 60" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><circle cx="90" cy="34" r="5" fill="currentColor"/><path d="M48 25 Q60 12 73 25 M42 20 Q60 2 80 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
 return '<div class="foil '+(horror?'halloween':'')+'" aria-label="Pochette '+(horror?'Halloween':'Classique')+'"><div class="foil-face"><div class="foil-shimmer"></div><div class="foil-name">SÉRIESCLUBTCG<small>TRADING CARD GAME</small></div><div class="foil-emblem">'+art+'</div><div class="foil-foot">'+(horror?'HALLOWEEN':'ORIGINAL')+'</div><span class="foil-mini">5 CARTES • 7 RARETÉS</span></div></div>';
}
/** Official rank belongs to a TV show; a card cannot have its own rank. */
export function officialRarity(cardOrShow){
 const item=cardOrShow||{},show=item.series||item;
 if(show.rarity_source==='pending')return 'À classer';
 return show.rarity||item.rarity||'Non classée';
}
export function raritySlug(rank){
 const known=ranks.find(r=>r===rank);
 if(!known)return 'unclassified';
 return known.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,'-');
}
export function card(c,action=''){
 const s=c.series||c,season=Number.isInteger(c.season_number)&&c.season_number>0?c.season_number:null;
 const title=(s.name||'Série inconnue')+(season?' · Saison '+season:'');
 const rank=officialRarity(c),slug=raritySlug(rank);
 const locked=Boolean(c.locked),year=String(c.season?.premiered||s.premiered||'').slice(0,4);
 return '<article class="collect-card sc53-card sc53-rarity-'+slug+'">'+
  '<div class="sc53-poster-wrap"><img loading="lazy" src="'+photo(c.season?.image_url||s.image_url||s.image?.medium)+'" alt="Affiche de '+esc(title)+'">'+
  (season?'<span class="sc-season-card-badge">S'+season+'</span>':'')+
  '<span class="sc53-rank-label">'+(locked?'🔒 ':'')+esc(rank)+'</span>'+
  (s.fr_verified===false?'<span class="sc54-fr-pending">🇫🇷 À vérifier</span>':'')+
  (c.seasons_pending?'<span class="sc-season-card-badge">Saisons à compléter</span>':'')+
  '</div>'+
  '<div class="card-title">'+esc(title)+'</div>'+
  '<div class="card-meta"><span class="rarity rarity--'+rank.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\W/g,'')+'">'+esc(rank)+'</span>'+
  '<small>'+esc(year)+'</small></div>'+action+'</article>';
}
export function heading(t,sub=''){return '<div class="page-title"><h1>'+esc(t)+'</h1>'+(sub?'<p>'+esc(sub)+'</p>':'')+'</div>'}
export function packs(s){
 return svodHome({...s,isOctober:monthHalloween()},{
  foil,platformStrip,seasonShelf,timecode
 });
}
export function collection(s){
 const q=(s.filter||'').toLowerCase(),list=s.cards.filter(c=>(!s.rank||c.rarity===s.rank)&&(!s.genre||(c.series?.genres||[]).includes(s.genre))&&(!q||c.series?.name?.toLowerCase().includes(q)));
 return '<div class="page-content">'+heading('Ma collection','Une collection synchronisée, carte par carte.')+'<div class="metric-row"><div class="metric"><strong>'+money(s.cards.length)+'</strong><span>Cartes</span></div><div class="metric"><strong>'+money(new Set(s.cards.map(c=>c.series_id)).size)+'</strong><span>Séries uniques</span></div><div class="metric"><strong>'+money(s.cards.filter(c=>c.locked).length)+'</strong><span>Cartes protégées</span></div><div class="metric"><strong>'+money(s.wallet?.experience)+'</strong><span>Expérience</span></div></div>'+(s.genre?'<div class="notice">Album : '+esc(s.genre)+' <button class="btn small" data-clear-genre>Tout afficher</button></div>':'')+'<div class="row" style="margin-bottom:20px"><input class="input" id="collectionSearch" placeholder="Rechercher mes cartes..." value="'+esc(s.filter||'')+'"><select id="rarityFilter"><option value="">Toutes les raretés</option>'+ranks.map(r=>'<option '+(s.rank===r?'selected':'')+'>'+esc(r)+'</option>').join('')+'</select><span class="note">'+list.length+' résultats</span></div>'+(list.length?'<div class="grid">'+list.map(c=>card(c,'<button class="card-action" data-series="'+esc(c.series_id)+'">✧ Voir la série</button><button class="card-action" data-lock="'+esc(c.id)+'" data-next="'+(!c.locked)+'">'+(c.locked?'Déprotéger':'🔒 Protéger')+'</button>')).join('')+'</div>':'<div class="empty">Aucune carte. Ouvre un paquet pour commencer.</div>')+'</div>';
}
/** Catalogue France : filtres réellement exécutés par Supabase, pas sur la seule page courante. */
export function catalogue(s){
 if(s.catalogMode==='actors')return actorCatalogueView(s);
 const owned=new Map();
 for(const c of s.cards||[]){const k=String(c.series_id)+':'+String(c.season_number||0);owned.set(k,(owned.get(k)||0)+1)}
 const wishes=new Set((s.wishes||[]).map(w=>w.series_id));
 const opt=(value,label,current)=>'<option value="'+esc(value)+'"'+(current===value?' selected':'')+'>'+esc(label)+'</option>';
 const genres=[['','Tous les genres'],['Drama','Drame'],['Comedy','Comédie'],['Crime','Policier'],['Thriller','Thriller'],['Mystery','Mystère'],['Science-Fiction','Science-fiction'],['Fantasy','Fantastique'],['Horror','Horreur'],['Action','Action'],['Adventure','Aventure'],['Romance','Romance'],['Animation','Animation'],['Documentary','Documentaire'],['Family','Famille']];
 const decades=[['','Toutes les époques'],['2020','Années 2020'],['2010','Années 2010'],['2000','Années 2000'],['1990','Années 1990'],['1980','Années 1980'],['1970','Années 1970'],['1960','Années 1960'],['1950','Années 1950'],['before1950','Avant 1950']];
 const sorting=[['name','Titre A → Z'],['recent','Plus récentes'],['oldest','Plus anciennes'],['popular','Popularité']];
 const chosen={rarity:s.catalogRarity||'',genre:s.catalogGenre||'',decade:s.catalogDecade||'',platform:s.catalogPlatform||'',sort:s.catalogSort||'name'};
 const active=Boolean((s.catalogQuery||'').trim()||chosen.rarity||chosen.genre||chosen.decade||chosen.platform||chosen.sort!=='name');
 const countText=Number.isSafeInteger(s.catalogTotal)
  ?money(s.catalogTotal)+' séries éligibles en France · '+money((s.catalog||[]).length)+' éditions de saisons affichées'
  :money((s.catalog||[]).length)+' séries affichées';
 const filters='<div class="sc59-search-row"><label class="sr" for="catalogQuery">Rechercher une série</label>'+
   '<div class="sc59-search-input"><span aria-hidden="true">⌕</span><input class="input" type="search" id="catalogQuery" placeholder="Rechercher une série…" autocomplete="off" value="'+esc(s.catalogQuery||'')+'" aria-describedby="catalogFeedback"></div>'+
   '<button class="btn primary" id="catalogSearch">Rechercher</button></div>'+
   '<div class="sc59-filter-grid" aria-label="Filtrer le catalogue">'+
    '<label>Rareté<select id="catalogRarity">'+opt('', 'Toutes les raretés',chosen.rarity)+ranks.map(v=>opt(v,v,chosen.rarity)).join('')+'</select></label>'+
    '<label>Genre<select id="catalogGenre">'+genres.map(([v,l])=>opt(v,l,chosen.genre)).join('')+'</select></label>'+
    '<label>Plateforme SVOD<select id="catalogPlatform">'+[['','Toutes les plateformes'],['netflix','Netflix · archive'],['prime','Prime Video · archive'],['disney','Disney+ · archive']].map(([v,l])=>opt(v,l,chosen.platform)).join('')+'</select></label>'+
    '<label>Époque<select id="catalogDecade">'+decades.map(([v,l])=>opt(v,l,chosen.decade)).join('')+'</select></label>'+
    '<label>Trier par<select id="catalogSort">'+sorting.map(([v,l])=>opt(v,l,chosen.sort)).join('')+'</select></label>'+
   '</div>';
 const archiveNotice=chosen.platform?'<div class="notice" role="status">Sélection française historique, non actualisée : la présence d’une série ne garantit pas sa disponibilité actuelle sur la plateforme.</div>':'';
 const results=(s.catalog||[]).length
  ?'<div class="grid sc59-catalog-grid">'+s.catalog.map(c=>card(c,
    (owned.get(String(c.id)+':'+String(c.season_number||0))?'<div class="sc52-owned-tag">✓ Saison possédée · '+money(owned.get(String(c.id)+':'+String(c.season_number||0)))+' exemplaire(s)</div>':'')+
    '<button class="card-action" data-series="'+esc(c.id)+'">✧ Découvrir · où regarder</button>'+
    '<button class="card-action" data-wish="'+esc(c.id)+'" aria-pressed="'+wishes.has(c.id)+'">'+
     (wishes.has(c.id)?'★ Retirer des souhaits':'☆ Ajouter aux souhaits')+'</button>')).join('')+'</div>'
  :s.catalogLoading
   ?'<div class="sc59-skeleton-grid" role="status" aria-label="Chargement des séries">'+Array.from({length:6},()=>'<div class="sc59-skeleton"><div></div><span></span><span></span></div>').join('')+'</div>'
   :'<div class="sc59-empty"><span aria-hidden="true">⌕</span><h2>Aucune série trouvée</h2><p>'+(active?'Essaie un autre titre ou élargis les filtres.':'De nouvelles séries sont ajoutées après vérification de leur diffusion en France.')+'</p>'+
      (active?'<button class="btn primary" id="catalogReset">Effacer les filtres</button>':'')+'</div>';
 return '<div class="page-content sc59-catalog">'+
  heading('Catalogue France','Explore les séries diffusées en France, aujourd’hui ou autrefois, et prépare ta collection.')+
  '<div class="sc54-fr-intro">🇫🇷 <b>Diffusion en France vérifiée.</b> Toutes les séries présentées ont une diffusion française confirmée.</div>'+
  '<div class="sc5-mode"><button class="btn primary" data-catalog-mode="series" aria-pressed="true">▦ Par série</button>'+
  '<button class="btn subtle" data-catalog-mode="actors" aria-pressed="false">♙ Par acteur</button></div>'+
  '<section class="sc59-explorer" aria-label="Rechercher et filtrer les séries">'+filters+
  '<div class="sc59-results" id="catalogFeedback" role="status" aria-live="polite">'+
   '<span>'+(s.catalogLoading?'Recherche en cours…':esc(s.catalogError||countText))+'</span>'+
   (active?'<button class="sc59-clear" id="catalogReset">Effacer les filtres ×</button>':'')+
  '</div></section>'+archiveNotice+
  results+
  (s.catalogMore?'<div class="sc59-more"><button class="btn primary" id="catalogMore"'+(s.catalogLoading?' disabled':'')+'>Charger davantage de séries ↓</button></div>':'')+
 '</div>';
}
export function wishlist(s){
 return '<div class="page-content">'+heading('Liste de souhaits','Les séries que tu aimerais obtenir.')+'<div class="panel"><p>'+ (s.user?'Synchronisée avec ton compte.':'Connecte-toi pour enregistrer une liste de souhaits.')+'</p>'+(s.wishes.length?'<div class="grid">'+s.wishes.map(w=>card(w.series||{name:'Série'},'<button class="card-action" data-series="'+esc(w.series_id)+'">✧ Découvrir</button><button class="card-action" data-wish="'+esc(w.series_id)+'">★ Retirer</button>')).join('')+'</div>':'<div class="empty">La liste est vide. Ajoute des séries depuis le catalogue.</div>')+'</div></div>';
}
export function albums(s){
 const genres=new Map();for(const c of s.cards)for(const g of c.series?.genres||[])genres.set(g,(genres.get(g)||0)+1);
 return '<div class="page-content">'+heading('Mes albums','Tes cartes organisées par univers.')+(genres.size?'<div class="album-grid">'+[...genres].sort((a,b)=>b[1]-a[1]).map(([g,n])=>'<button class="album" data-album="'+esc(g)+'"><div class="caps">ALBUM THÉMATIQUE</div><b>'+esc(genreFR(g))+'</b><small>'+n+' cartes</small></button>').join('')+'</div>':'<div class="empty">Ouvre des paquets pour remplir tes premiers albums.</div>')+'</div>';
}
export function rankings(s){
 return '<div class="page-content">'+heading('Classement','Les collectionneurs les plus actifs.')+'<div class="panel"><table class="ranking-table"><thead><tr><th>#</th><th>Joueur</th><th>Cartes</th><th>Séries</th></tr></thead><tbody>'+(s.rankings.length?s.rankings.map((x,i)=>'<tr><td>'+(i+1)+'</td><td><b>'+esc(x.username)+'</b></td><td>'+money(x.card_count)+'</td><td>'+money(x.unique_series)+'</td></tr>').join(''):'<tr><td colspan="4">Aucun résultat pour le moment.</td></tr>')+'</tbody></table></div></div>';
}
export function fusions(s){
 const preserve=s.fusionProtectLast!==false;
 const plan=fusionPlan(s.cards||[],s.fusionRank,s.fusionSelected||[],s.marketActivity||[],preserve);
 const current=plan.selected.length,target=plan.target||'—';
 const order=s.fusionSort||'duplicates';
 const all=[...plan.allowed].sort((a,b)=>{
  const an=(a.series?.name||'').toLocaleLowerCase('fr'),bn=(b.series?.name||'').toLocaleLowerCase('fr');
  if(order==='name')return an.localeCompare(bn,'fr');
  if(order==='recent')return String(b.obtained_at||'').localeCompare(String(a.obtained_at||''));
  return Number(a.isLast)-Number(b.isLast)||an.localeCompare(bn,'fr');
 });
 const perPage=24,totalPages=Math.max(1,Math.ceil(all.length/perPage));
 const page=Math.min(Math.max(0,Number(s.fusionPage)||0),totalPages-1);
 const subset=all.slice(page*perPage,(page+1)*perPage);
 const chips=fusionRanks.slice(0,6).map(rank=>{
  const stats=fusionPlan(s.cards||[],rank,[],s.marketActivity||[],true);
  const count=stats.allowed.length;
  return '<button class="sc60-rank-chip '+(s.fusionRank===rank?'active':'')+'" data-fusion-rank="'+esc(rank)+'" aria-pressed="'+(s.fusionRank===rank)+'">'+esc(rank)+'<small>'+count+' doublon'+(count===1?'':'s')+'</small></button>';
 }).join('');
 const items=subset.map(c=>{
  const chosen=plan.selected.includes(String(c.id));
  return card(c,'<button type="button" class="sc60-fuse-select '+(chosen?'picked':'')+'" data-fusion-pick="'+esc(c.id)+'" aria-pressed="'+chosen+'" aria-label="'+(chosen?'Retirer de la sélection : ':'Ajouter à la sélection : ')+esc(c.series?.name||'Carte')+'">'+(chosen?'✓ Sélectionnée':'＋ Sélectionner')+'</button>'+
   (c.isLast?'<div class="sc60-fuse-last">Dernier exemplaire</div>':'<div class="sc60-fuse-spare">Doublon disponible</div>'));
 }).join('');
 const picked=plan.selectedCards.map(c=>
  '<button type="button" data-fusion-pick="'+esc(c.id)+'" title="Retirer de la sélection" aria-label="Retirer '+esc(c.series?.name||'Série')+' de la fusion">'+
   '<span>'+esc(c.series?.name||'Carte')+'</span>'+(c.isLast?' ⚠ Dernière copie':' ✕')+'</button>').join('');
 const tray='<section class="sc8-fusion-tray" aria-label="Cartes sélectionnées pour la fusion">'+
   '<h3>Ton panier de fusion · '+current+'/10</h3>'+
   (picked?'<div class="sc8-fusion-picked">'+picked+'</div>':
    '<div class="sc8-fusion-empty">Aucune carte sélectionnée. Utilise « Sélection intelligente » pour privilégier tes doublons.</div>')+
   '<p>'+(plan.ready?'Prêt à fusionner : vérifie le récapitulatif avant de confirmer.':
    'Encore '+plan.missing+' carte'+(plan.missing===1?'':'s')+' à sélectionner · clique sur une carte pour la retirer.')+'</p></section>';
 const footer='<div class="sc60-fuse-pages"><span>Cartes '+(all.length?page*perPage+1:0)+'–'+Math.min(all.length,(page+1)*perPage)+' sur '+all.length+'</span>'+
  '<div><button class="btn subtle" data-fusion-page="-1" '+(page===0?'disabled':'')+'>← Précédent</button>'+
  '<button class="btn subtle" data-fusion-page="1" '+(page>=totalPages-1?'disabled':'')+'>Suivant →</button></div></div>';
 return '<div class="page-content sc60-fusion">'+heading('Atelier de fusion','Transforme 10 cartes de même rareté en une carte du rang supérieur, choisie par le jeu.')+
 '<div class="sc60-fusion-hero"><div><span class="caps">ÉVOLUTION DES CARTES</span><h2>'+esc(s.fusionRank)+' <span>→</span> '+esc(target)+'</h2><p>Chaque fusion consomme définitivement 10 cartes et crée une carte officiellement classée du niveau supérieur en France.</p></div>'+
 '<div class="sc60-fusion-ring"><strong>'+current+'<small>/10</small></strong><span>cartes choisies</span></div></div>'+
 '<div class="sc60-rank-row" aria-label="Rareté de départ">'+chips+'</div>'+
 '<div class="sc60-fusion-tools"><div><strong>'+plan.duplicates+' doublons disponibles</strong><p>'+plan.uniqueOnly+' dernières copies · '+(plan.missing?'il manque '+plan.missing+' carte'+(plan.missing>1?'s':''):'sélection complète')+'</p></div>'+
 '<label class="sc60-protect"><input type="checkbox" id="fusionProtectLast" '+(preserve?'checked':'')+'> Préserver mes dernières copies</label>'+
 '<label class="sc-fusion-sort">Trier<select id="fusionSort"><option value="duplicates"'+(order==='duplicates'?' selected':'')+'>Doublons en premier</option><option value="name"'+(order==='name'?' selected':'')+'>Titre A–Z</option><option value="recent"'+(order==='recent'?' selected':'')+'>Plus récentes</option></select></label>'+ 
 '<button class="btn subtle" id="fusionAuto" '+(!plan.allowed.length?'disabled':'')+'>✦ Sélection intelligente</button>'+
 '<button class="btn subtle" id="fusionClear" '+(!current?'disabled':'')+'>Effacer</button></div>'+
 (current?'<div class="sc60-progress" role="progressbar" aria-label="Cartes sélectionnées" aria-valuemin="0" aria-valuemax="10" aria-valuenow="'+current+'"><span style="width:'+current*10+'%"></span></div>':'')+tray+
 '<div class="sc60-fusion-notice" role="note">🔒 Les cartes protégées, réservées, en vente ou non certifiées France sont exclues. '+(preserve?'Les dernières copies de séries sont également préservées.':'Attention : la dernière copie d’une série peut maintenant être consommée.')+'</div>'+
 (all.length?'<div class="grid sc60-fuse-grid">'+items+'</div>'+footer:
  '<div class="sc60-empty"><h2>Aucune carte utilisable pour ce rang</h2><p>'+ (plan.uniqueOnly&&preserve?'Désactive « Préserver mes dernières copies » uniquement si tu souhaites utiliser des exemplaires uniques.':'Ouvre des boosters pour obtenir de nouvelles cartes ou choisis une autre rareté.')+'</p><button class="btn subtle" data-route="packs">Ouvrir des paquets</button></div>')+
 '<div class="sc60-fuse-action"><div><strong>'+current+' / 10 sélectionnées</strong><small>Gain : une carte '+esc(target)+' · +100 XP selon la règle serveur</small></div>'+
 '<button id="fusionSubmit" class="btn primary" '+(!plan.ready||s.busy?'disabled':'')+'>Fusionner 10 → 1 · Vérifier</button></div></div>';
}
export function profile(s){
 return '<div class="page-content">'+heading('Mon profil','Ton identité et ta progression au sein du club.')+(s.premiumActive?'<div class="sc16-premium-badge" role="status">✦ Membre Premium · Collectionneur passionné</div>':'')+profileArtPanel(s)+'<div class="metric-row"><div class="metric"><strong>'+money(s.cards.length)+'</strong><span>Cartes</span></div><div class="metric"><strong>'+money(s.wallet?.boosters_opened)+'</strong><span>Paquets ouverts</span></div><div class="metric"><strong>'+money(s.wallet?.credits)+'</strong><span>Crédits</span></div><div class="metric"><strong>'+money(s.wallet?.experience)+'</strong><span>XP</span></div></div><div class="panel"><h2>'+esc(s.username||'Bienvenue dans le club')+'</h2><p>'+(s.user?esc(s.user.email):'Connecte-toi pour jouer et sauvegarder ta progression.')+'</p>'+(s.user?'<div class="row"><input class="input" id="usernameInput" maxlength="24" value="'+esc(s.username||'')+'" placeholder="Pseudonyme"></div><div class="row" style="margin:12px 0"><input class="input" id="bioInput" maxlength="160" style="width:100%" value="'+esc(s.bio||'')+'" placeholder="Une phrase sur tes séries favorites (160 caractères)"></div><div class="row"><label for="favoriteGenre">Genre favori</label><select id="favoriteGenre"><option value="">À découvrir</option>'+['Drama','Comedy','Action','Horror','Thriller','Mystery','Science-Fiction','Fantasy','Animation','Crime','Romance','Family'].map(g=>'<option value="'+esc(g)+'" '+(s.favoriteGenre===g?'selected':'')+'>'+esc(genreFR(g))+'</option>').join('')+'</select><button class="btn primary" id="usernameSave">Enregistrer mon profil</button><button class="btn subtle" id="signout">Déconnexion</button></div>':'<button class="btn primary" data-auth>Connexion / inscription</button>')+'</div></div>';
}
export function games(s){
 const online=s.rewardStatus?.enabled===true;
 const upgraded=online&&s.rewardStatus?.limit_per_mode_hours===24;
 const remaining=Number(s.rewardStatus?.remaining_today??4);
 const menu=gameCards(s.rewardStatus||{},s.quizRecords||{});
 const intro=online?
   '<div class="sc7-rewards-bar"><strong>✦ +10 crédits par bonne réponse</strong><strong>+30 pour un sans-faute</strong><span>'+
    (upgraded?remaining+' défi'+(remaining===1?'':'s')+' disponible'+(remaining===1?'':'s')+' · 1 tentative par jeu toutes les 24 h':remaining+' partie'+(remaining===1?'':'s')+' récompensée'+(remaining===1?'':'s')+' restante'+(remaining===1?'':'s')+' (quota serveur actuel)')+'</span></div>':
   '<div class="sc7-rewards-bar"><strong>Entraînement</strong><span>Une tentative par jeu toutes les 24 h. Aucun crédit distribué dans ce mode.</span></div>';
 const playing=s.pixelPreview
  ?pixelPreviewHTML(s.pixelPreview)
  :s.rewardQuiz?rewardQuizHTML(s.rewardQuiz,s.rewardFeedback,s.rewardBusy)
  :s.quiz?quizHTML(s.quiz):menu;
 return '<div class="page-content sc7-games">'+
  heading('Jeux & défis','Une autre façon de vivre tes séries.')+
  '<div class="sc7-hero"><div><span class="sc7-hero-kicker">SÉRIESCLUBTCG · L’ARÈNE</span>'+
   '<h2>Joue. Gagne.<br>Collectionne.</h2>'+
   '<p>Affiches cultes, mémoire et chronologie : quatre défis, cinq questions et des surprises à chaque partie.</p></div>'+
   '<div class="sc7-hero-stat"><strong>'+money(s.wallet?.credits||0)+'</strong><small>Crédits disponibles</small></div></div>'+
  (!s.quiz&&!s.rewardQuiz&&!s.pixelPreview?intro:'')+
  playing+
  (s.rewardError?'<div class="sc60-quiz-empty" role="status">'+esc(s.rewardError)+'</div>':'')+
  (s.quizError?'<div class="sc60-quiz-empty" role="status">'+esc(s.quizError)+'</div>':'')+
  (s.quizLoading||s.rewardBusy&&!s.rewardQuiz?'<div class="sc60-loading" role="status">Préparation du défi…</div>':'')+
 '</div>';
}
export function rules(){
 const data=[['01','PAQUETS','5 cartes par ouverture. Dix paquets maximum en réserve, recharge de 10 minutes.'],['02','RARETÉS','Chaque série a un seul rang officiel, identique pour tous les exemplaires. Sept niveaux, de Commune à Unique.'],['03','FUSIONS','Dix cartes de même rareté sont consommées pour obtenir une carte officielle du rang supérieur. La sélection intelligente protège par défaut les derniers exemplaires et une confirmation précède toute fusion.'],['04','HALLOWEEN','Paquet gratuit saisonnier en octobre : deux séries au genre Horreur et une troisième Horreur, Thriller, Mystère ou Surnaturel. Deux autres cartes libres, sans doublon dans le paquet et avec leur rareté officielle.'],['05','RÉCOMPENSES','25 crédits et 50 XP par ouverture. 100 crédits une fois par jour.'],['06','COMPTE','Cartes sauvegardées sur Supabase, protégées par contrôle de propriétaire.'],['07','LE STUDIO','Retrouve tes séries, doublons, cartes protégées et souhaits pour organiser ta collection.'],['08','JEUX & DÉFIS','Quatre défis de culture séries : récompenses en crédits après activation de l’arène sécurisée, limitées à une tentative par jeu toutes les 24 heures côté serveur.'],['09','SAISONS & SOUHAITS','Suis les objectifs de huit ou vingt séries. Pour les Saisons à liste fixe, active le suivi pour retrouver les séries manquantes dans tes souhaits et protéger un exemplaire obtenu.'],['10','BOOSTERS THÉMATIQUES','Lorsque leurs catalogues sont actifs, les boosters Netflix, Prime Video, Disney+ et Télévision peuvent s’ouvrir avec les crédits virtuels gagnés dans le jeu. Aucun achat de crédits en euros n’est proposé.']];
 return '<div class="page-content">'+heading('Règles du jeu','Comment commencer ta collection.')+'<div class="guide-grid">'+data.map(([n,t,d])=>'<div class="guide-item"><div class="big">'+n+'</div><h2>'+t+'</h2><p>'+d+'</p></div>').join('')+'</div></div>';
}
export function settings(s){
 return '<div class="page-content">'+heading('Paramètres','Confort et informations de ton compte.')+'<div class="panel"><h2>Confort visuel</h2><div class="sc10-theme-settings" aria-label="Apparence du site"><button type="button" class="btn subtle '+(s.theme==='night'?'active':'')+'" data-theme-choice="night" aria-pressed="'+(s.theme==='night')+'">☾ Nuit</button><button type="button" class="btn subtle '+(s.theme==='day'?'active':'')+'" data-theme-choice="day" aria-pressed="'+(s.theme==='day')+'">☀ Jour</button><span>Thème nuit par défaut, choix conservé sur cet appareil.</span></div><hr class="divider"><label class="row"><input id="reduceMotion" type="checkbox" '+(s.reduceMotion?'checked':'')+'> Réduire les animations</label><p class="note">Cette préférence est enregistrée dans ce navigateur.</p><hr class="divider"><h2>Installer le jeu sur cet appareil</h2><p>Retrouve SériesClubTCG depuis ton écran d’accueil. Une connexion reste nécessaire pour jouer et synchroniser ta collection.</p><button class="btn subtle sc1-install-button" type="button" data-install-app>Installer SériesClubTCG →</button><p class="note">Sur iPhone/iPad : Safari → Partager → Sur l’écran d’accueil. Sur Android ou ordinateur : menu du navigateur → Installer l’application.</p><hr class="divider"><h2>Mes données</h2><p>Ta collection est sauvegardée sur ton compte. Le classement public affiche ton pseudonyme et tes résultats.</p><button class="btn subtle" id="exportData">Télécharger mes données du jeu (JSON)</button><p class="note">Export lié à ton compte authentifié : profil, cartes, souhaits, albums, crédits, récompenses et échanges.</p></div><div class="panel sc1-danger-zone"><h2>Confidentialité et fermeture du compte</h2><p>Tu peux consulter le fonctionnement des données et exercer ton droit à l’effacement. La suppression définitive détruit ta progression et tes crédits virtuels.</p><div class="sc1-rights-actions"><button type="button" class="btn subtle" data-route="privacy">Informations sur mes données →</button>'+(s.user?'<button type="button" class="btn sc1-delete-danger" data-delete-account-start>Supprimer définitivement mon compte</button>':'<button type="button" class="btn subtle" data-auth>Se connecter</button>')+'</div></div><div class="sc1-setting-info"><h2>Informations sur SériesClubTCG V1.0</h2><p>Version en préparation avant lancement public. Fonctionnement du jeu, droits des contenus, sources et services disponibles.</p><button type="button" class="btn subtle" data-route="about">À propos et transparence →</button></div></div>';
}
export function placeholder(route){
 const info={premiere:['Première','Bientôt disponible.'],market:['Marché','Bientôt disponible.'],community:['Communauté','Bientôt disponible.'],referral:['Parrainage','Bientôt disponible.']};
 const [t,d]=info[route]||['En préparation','Cette fonctionnalité sera disponible dans une prochaine version.'];
 return '<div class="page-content">'+heading(t,d)+'<div class="panel"><h2 class="serif" style="text-transform:none">Le club s’agrandit.</h2><p>Nous privilégions de vraies fonctionnalités, avec une sauvegarde fiable et sans simulation de transactions.</p><button class="btn primary" data-route="packs">Retour aux paquets</button></div></div>';
}
