/**
 * SérieClub V5.2 — Le Studio de collection
 * 100 % dérivé de l'inventaire Supabase existant (aucune modification SQL).
 * Les doublons sont des exemplaires au-delà de la première copie d'une même
 * série. Une copie engagée ne peut pas être conseillée pour la vente.
 */
import {card,esc,money,ranks,photo,officialRarity,raritySlug} from '../v3/views.js?v=5.3.1';
import {genreFR} from '../v5/fr-text.js?v=5.3.1';

export const COLLECTION_PAGE_SIZE=48;
const rankOrder=new Map(ranks.map((name,i)=>[name,i]));

export function deriveCollection(cards=[],wishes=[],activity=[]){
 const copies=new Map(),selling=new Set((activity||[])
   .filter(a=>a.status==='active').map(a=>a.card_id));
 for(const c of cards||[]){
  if(c?.id==null||c.series_id==null)continue;
  const k=String(c.series_id);
  if(!copies.has(k))copies.set(k,[]);
  copies.get(k).push(c);
 }
 const groups=[...copies].map(([id,items])=>{
  const first=items[0],rank=officialRarity(first);
  const protectedCount=items.filter(c=>c.locked).length;
  const blockedCount=items.filter(c=>c.reserved_trade_id||selling.has(c.id)).length;
  const free=items.filter(c=>!c.locked&&!c.reserved_trade_id&&!selling.has(c.id)&&(!c.series?.rarity||c.rarity===c.series.rarity));
  return {
   id,name:first.series?.name||'Série inconnue',
   image:first.series?.image_url||'',premiered:first.series?.premiered||'',
   rarity:rank,genre:first.series?.genres||[],
   frVerified:first.series?.fr_verified===true,
   eligible:Boolean(first.series?.image_url)&&first.series?.rarity_source!=='pending'&&first.series?.fr_verified===true,
   cards:items,count:items.length,duplicates:Math.max(0,items.length-1),
   protectedCount,blockedCount,
   sellableCopy:items.length>1&&free.length>0&&(protectedCount>0||free.length>=2)?free[free.length-1]:null,
   lastObtained:items.reduce((best,c)=>Math.max(best,Date.parse(c.obtained_at)||0),0)
  };
 });
 const rankStats=ranks.map(rank=>{
  const matching=groups.filter(g=>g.rarity===rank);
  return {rank,series:matching.length,cards:matching.reduce((n,g)=>n+g.count,0)};
 });
 const missing=(wishes||[]).filter(w=>w.series_id!=null&&!copies.has(String(w.series_id)));
 const duplicateGroups=groups.filter(g=>g.count>1);
 return {
  groups,rankStats,missing,
  totalCards:(cards||[]).length,unique:groups.length,
  duplicates:duplicateGroups.reduce((n,g)=>n+g.duplicates,0),
  rarityConflicts:(cards||[]).filter(c=>c.series?.rarity&&c.series?.rarity_source!=='pending'&&c.rarity!==c.series.rarity).length,
  duplicateGroups:duplicateGroups.length,
  protectedCards:(cards||[]).filter(c=>c.locked).length,
  reservedCards:(cards||[]).filter(c=>c.reserved_trade_id||selling.has(c.id)).length,
  tradableDuplicates:duplicateGroups.filter(g=>g.sellableCopy).length
 };
}

/**
 * Export compatible Excel FR : une ligne par série, non par copie.
 * Neutralise l'injection de formules CSV dans les tableurs.
 */
export function collectionCSV(cards=[],wishes=[],activity=[]){
 const groups=deriveCollection(cards,wishes,activity).groups
  .sort((a,b)=>a.name.localeCompare(b.name,'fr'));
 const head=['Série','ID TVmaze','Première diffusion','Rareté officielle',
  'Exemplaires','Doublons','Protégées','Engagées','Genres'];
 const safe=value=>{
  let val=String(value??'');
  if(/^\s*[=+\-@]/.test(val))val="'"+val;
  return '"'+val.replace(/"/g,'""').replace(/\r|\n/g,' ')+'"';
 };
 const rows=[head,...groups.map(g=>[g.name,g.id,String(g.premiered).slice(0,10),g.rarity,
  g.count,g.duplicates,g.protectedCount,g.blockedCount,g.genre.map(genreFR).join(', ')])];
 return rows.map(row=>row.map(safe).join(';')).join('\r\n');
}
function sortGroups(groups,mode){
 const out=[...groups];
 if(mode==='name')out.sort((a,b)=>a.name.localeCompare(b.name,'fr'));
 else if(mode==='recent')out.sort((a,b)=>b.lastObtained-a.lastObtained||a.name.localeCompare(b.name,'fr'));
 else if(mode==='copies')out.sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name,'fr'));
 else out.sort((a,b)=>(rankOrder.get(b.rarity)??-1)-(rankOrder.get(a.rarity)??-1)||a.name.localeCompare(b.name,'fr'));
 return out;
}
export function selectCollection(view){
 const data=deriveCollection(view.cards,view.wishes,view.marketActivity);
 const mode=['all','unique','duplicates','protected','missing'].includes(view.collectionMode)
  ?view.collectionMode:'all';
 const text=(view.filter||'').trim().toLocaleLowerCase('fr');
 const rank=view.rank||'',genre=view.genre||'';
 const acceptName=name=>!text||String(name||'').toLocaleLowerCase('fr').includes(text);
 const validGroup=g=>(!rank||g.rarity===rank)&&(!genre||g.genre.includes(genre))&&acceptName(g.name);
 const groups=sortGroups(data.groups.filter(g=>validGroup(g)),view.collectionSort||'rarity');
 const groupIndex=new Map(data.groups.map(g=>[g.id,g]));
 let entries;
 if(mode==='missing'){
  entries=data.missing.filter(w=>{
   const series=w.series||{},rarity=series.rarity||'';
   return (!rank||rarity===rank)&&(!genre||(series.genres||[]).includes(genre))&&acceptName(series.name);
  }).map(w=>({id:String(w.series_id),wish:w,series:w.series||{name:'Série inconnue'}}));
 }else if(mode==='all'){
  const orderByRank=(a,b)=>(rankOrder.get(b.series?.rarity||b.rarity)??-1)-
   (rankOrder.get(a.series?.rarity||a.rarity)??-1);
  const filtered=(view.cards||[]).filter(c=>validGroup(groupIndex.get(String(c.series_id))||{
   name:c.series?.name||'',rarity:c.series?.rarity||c.rarity,genre:c.series?.genres||[]
  }));
  entries=[...filtered];
  if(view.collectionSort==='name')entries.sort((a,b)=>(a.series?.name||'').localeCompare(b.series?.name||'','fr'));
  else if(view.collectionSort==='copies'){
   const counts=new Map(groups.map(g=>[g.id,g.count]));
   entries.sort((a,b)=>(counts.get(String(b.series_id))||0)-(counts.get(String(a.series_id))||0));
  }else if(view.collectionSort==='recent')entries.sort((a,b)=>(Date.parse(b.obtained_at)||0)-(Date.parse(a.obtained_at)||0));
  else entries.sort(orderByRank);
 }else if(mode==='unique')entries=groups;
 else if(mode==='duplicates')entries=groups.filter(g=>g.count>1);
 else entries=groups.filter(g=>g.protectedCount>0);
 const page=Math.max(0,Math.floor(Number(view.collectionPage)||0));
 const pages=Math.max(1,Math.ceil(entries.length/COLLECTION_PAGE_SIZE));
 const boundedPage=Math.min(page,pages-1);
 return {data,mode,entries:entries.slice(boundedPage*COLLECTION_PAGE_SIZE,(boundedPage+1)*COLLECTION_PAGE_SIZE),
  total:entries.length,page:boundedPage,pages,rank,genre,text};
}
function pill(value){return '<span class="sc52-rarity">'+esc(value)+'</span>'}
function groupCard(g){
 const selling=g.sellableCopy;
 return '<article class="sc52-group-card sc53-rarity-'+raritySlug(g.rarity)+'">'+
  '<button class="sc52-group-poster" data-series="'+esc(g.id)+'" aria-label="Découvrir '+esc(g.name)+'">'+
  (photo(g.image)?'<img src="'+photo(g.image)+'" loading="lazy" alt="Affiche de '+esc(g.name)+'">':'<span class="sc52-poster-absent">✧</span>')+
  '<span class="sc52-copy-count">× '+g.count+'</span></button>'+
  '<div class="sc52-group-body"><h3>'+esc(g.name)+'</h3>'+pill(g.rarity)+
  (g.frVerified?'':'<small class="sc54-collection-pending">🇫🇷 Diffusion à vérifier · ancienne carte</small>')+
  '<p>'+g.count+' exemplaire'+(g.count>1?'s':'')+
  (g.duplicates?' · '+g.duplicates+' doublon'+(g.duplicates>1?'s':''):'')+'</p>'+
  '<div class="sc52-group-flags">'+
   (g.protectedCount?'<span>🔒 '+g.protectedCount+' protégé'+(g.protectedCount>1?'s':'')+'</span>':'')+
   (g.blockedCount?'<span>⇆ '+g.blockedCount+' engagé'+(g.blockedCount>1?'s':'')+'</span>':'')+
  '</div><div class="sc52-group-actions">'+
  '<button class="btn subtle small" data-series="'+esc(g.id)+'">Fiche série</button>'+
  (selling?'<button class="btn primary small" data-sell-copy="'+esc(selling.id)+'">Vendre un doublon ↗</button>':
    g.duplicates?'<span class="sc52-unavailable">Doublons protégés ou engagés</span>':'')+
  '</div></div></article>';
}
function missingCard(item){
 const show=item.series;
 return '<article class="sc52-wish-row">'+
  (photo(show.image_url)?'<img src="'+photo(show.image_url)+'" alt="" loading="lazy">':'<span class="sc52-wish-empty">✧</span>')+
  '<div><b>'+esc(show.name||'Série')+'</b><small>'+esc(show.rarity||'Rareté à définir')+'</small>'+
  (show.fr_verified===false?'<small>🇫🇷 Diffusion à vérifier</small>':'')+'</div>'+
  '<button class="btn subtle small" data-series="'+esc(item.id)+'">Découvrir</button>'+
  '<button class="btn subtle small" data-wish="'+esc(item.id)+'" aria-label="Retirer des souhaits">✕</button>'+
  '</article>';
}
function statsPanel(view,data){
 const total=Number(view.collectionEligibleTotal)||0;
 const eligibleOwned=data.groups.filter(g=>g.eligible).length;
 const percentage=total>0?Math.min(100,Math.round(100*eligibleOwned/total)):null;
 return '<div class="sc52-stats">'+
  '<div><strong>'+money(data.totalCards)+'</strong><span>Cartes possédées</span></div>'+
  '<div><strong>'+money(data.unique)+'</strong><span>Séries différentes</span></div>'+
  '<div><strong>'+money(data.duplicates)+'</strong><span>Exemplaires en doublon</span></div>'+
  '<div><strong>'+money(data.tradableDuplicates)+'</strong><span>Séries avec doublon vendable</span></div>'+
  '</div>'+
  (total>0?'<div class="sc52-completion"><div><b>Exploration du catalogue</b><span>'+money(eligibleOwned)+' / '+money(total)+' séries classées possédées · '+percentage+' %</span></div><div class="sc52-progress"><span style="width:'+percentage+'%"></span></div><small>Indicateur de découverte, calculé sur les séries classées et illustrées. Les doublons et les anciennes séries sans preuve française ne comptent qu’une fois ou sont exclus du total.</small></div>':
  '<p class="sc52-stats-note">Découvre des séries en ouvrant des paquets. Le pourcentage global sera affiché lorsque le catalogue sera disponible.</p>');
}
export function collectionStudio(state){
 const v=selectCollection(state),d=v.data;
 const modes=[
  ['all','Toutes mes cartes',d.totalCards],
  ['unique','Mes séries',d.unique],
  ['duplicates','Doublons',d.duplicateGroups],
  ['protected','Protégées',d.groups.filter(g=>g.protectedCount>0).length],
  ['missing','À rechercher',d.missing.length]
 ];
 const filters='<div class="sc52-controls"><input type="search" class="input" id="collectionSearch" placeholder="Rechercher une série…" value="'+esc(state.filter||'')+'" aria-label="Rechercher mes cartes">'+
  '<select id="rarityFilter" aria-label="Filtrer par rareté"><option value="">Toutes les raretés</option>'+
  ranks.map(r=>'<option '+(state.rank===r?'selected':'')+'>'+esc(r)+'</option>').join('')+'</select>'+
  '<select id="collectionSort" aria-label="Trier les cartes">'+[
   ['rarity','Rareté décroissante'],['name','Titre A → Z'],['recent','Acquisitions récentes'],['copies','Nombre d’exemplaires']
  ].map(([key,label])=>'<option value="'+key+'" '+((state.collectionSort||'rarity')===key?'selected':'')+'>'+label+'</option>').join('')+
  '</select></div>';
 const rankBars='<div class="sc52-rank-section"><h2>Répartition par rareté officielle</h2>'+
  '<div class="sc52-rank-grid">'+d.rankStats.map(x=>
   '<button data-collection-rank="'+esc(x.rank)+'" class="sc52-rank-stat '+(state.rank===x.rank?'active':'')+'">'+
   '<b>'+esc(x.rank)+'</b><strong>'+money(x.series)+'</strong><small>séries · '+money(x.cards)+' cartes</small></button>').join('')+
  '</div></div>';
 const type=v.mode==='missing'
  ?(v.entries.length?'<div class="sc52-wish-list">'+v.entries.map(missingCard).join('')+'</div>':'<div class="empty">Toutes les séries de ta liste de souhaits sont déjà dans ta collection, ou aucun souhait n’a été enregistré.</div>')
  :v.entries.length?(v.mode==='all'?'<div class="grid sc52-copies">'+v.entries.map(c=>card(c,
    '<button class="card-action" data-series="'+esc(c.series_id)+'">Voir la série ↗</button>'+
    '<button class="card-action" data-lock="'+esc(c.id)+'" data-next="'+(!c.locked)+'" '+
    (c.reserved_trade_id||((state.marketActivity||[]).some(l=>l.card_id===c.id&&l.status==='active'))?'disabled':'')+'>'+
    (c.locked?'Déprotéger':'🔒 Protéger')+'</button>')).join('')+'</div>':
   '<div class="sc52-group-grid">'+v.entries.map(groupCard).join('')+'</div>'):
   '<div class="empty">Aucune série ne correspond à ces filtres. Essaie une autre recherche ou efface la rareté sélectionnée.</div>';
 const pages=v.pages>1?'<nav class="sc52-pagination" aria-label="Pages de la collection">'+
  '<button class="btn subtle small" data-collection-page="'+(v.page-1)+'" '+(v.page===0?'disabled':'')+'>← Précédent</button>'+
  '<span>Page '+(v.page+1)+' sur '+v.pages+'</span>'+
  '<button class="btn subtle small" data-collection-page="'+(v.page+1)+'" '+(v.page===v.pages-1?'disabled':'')+'>Suivant →</button></nav>':'';
 return '<div class="page-content sc52-collection"><header class="sc52-heading"><div><span class="caps">SÉRIECLUB · LE STUDIO</span><h1>MA COLLECTION</h1><p>Retrouve tes séries, organise tes exemplaires et repère les doublons que tu peux échanger.</p></div>'+
  '<div class="sc52-heading-actions"><button class="btn subtle" data-route="catalog">Explorer le catalogue ↗</button><button class="btn subtle" data-export-collection '+(!state.user||!d.totalCards?'disabled':'')+'>Exporter CSV ↓</button></div></header>'+
  statsPanel(state,d)+(d.rarityConflicts?'<div class="notice sc53-rarity-warning">'+money(d.rarityConflicts)+' anciennes cartes ont encore une rareté historique différente en base. L’affichage respecte la rareté officielle de leur série ; une synchronisation serveur est prévue.</div>':'')+rankBars+
  '<div class="sc52-tabs" role="group" aria-label="Mode de consultation">'+
  modes.map(([mode,label,n])=>'<button data-collection-mode="'+mode+'" class="'+(v.mode===mode?'active':'')+'" aria-pressed="'+(v.mode===mode)+'">'+esc(label)+' <span>'+money(n)+'</span></button>').join('')+'</div>'+
  (state.genre?'<div class="notice">Genre sélectionné : '+esc(state.genre)+' <button class="btn small subtle" data-clear-genre>Afficher tous les genres</button></div>':'')+
  filters+'<div class="sc52-results-head"><b>'+money(v.total)+' résultat'+(v.total>1?'s':'')+'</b>'+
  '<span>'+ (v.mode==='duplicates'?'Un doublon est une copie supplémentaire d’une série déjà détenue. Les exemplaires protégés ou engagés ne sont pas proposés à la vente.':
    v.mode==='missing'?'Ce sont tes souhaits non encore obtenus, et non toutes les séries absentes du catalogue.':
    v.mode==='unique'?'Chaque série est affichée une seule fois, même avec plusieurs exemplaires.':'Rareté officielle commune à tous les exemplaires d’une série.')+
  '</span></div>'+type+pages+
  (d.totalCards>=3000?'<p class="notice">La collection affichée est limitée aux 3 000 exemplaires les plus récents par session ; la progression peut être incomplète.</p>':'')+
  '</div>';
}
