import{createClient}from'https://esm.sh/@supabase/supabase-js@2';
import{navItems,ranks,esc,photo,money,monthHalloween,timecode,foil,card,packs,collection,catalogue,wishlist,albums,rankings,fusions,profile,games,rules,settings,placeholder}from'./views.js?v=5.8.0';
import{getShowDetails,getPersonFilmography,searchPeople,showDetailHTML,actorDetailHTML,frenchSynopsisHTML,stripSummary}from'../v4/series.js?v=5.6.1';
import{getFrenchSynopsis}from'../v4/synopsis-fr.js?v=5.1.0';
import{getFrenchOffersByShow,renderFranceAvailability}from'../v5/fr-watch.js?v=5.8.0';
import{partitionFrenchInventory}from'../v5/fr-collection.js?v=5.5.0';
import{marketPage,communityPage,questsPage,tradeDialog}from'../v4/club.js?v=5.6.1';
import{personalAlbumsPage,albumDialog}from'../v4/albums.js?v=5.6.1';
import{collectionStudio,collectionCSV}from'../v5/collection.js?v=5.6.1';
const supa=createClient('https://anjfidksqbqlaggttdop.supabase.co','sb_publishable_wPFasufNG20maU1rokgPLA_7nyagxY3');
const $=id=>document.getElementById(id);
const routes={paquets:'packs',packs:'packs',collection:'collection',catalogue:'catalog',catalog:'catalog',albums:'albums',classement:'rankings',rankings:'rankings',fusions:'fusion',fusion:'fusion',jeux:'games',games:'games',souhaits:'wishlist',wishlist:'wishlist',communaute:'community',community:'community',marche:'market',market:'market',profil:'profile',profile:'profile',parametres:'settings',settings:'settings',regles:'rules',rules:'rules',premiere:'premiere',parrainage:'referral',referral:'referral',missions:'quests',quetes:'quests',quests:'quests'};
const slug={packs:'paquets',catalog:'catalogue',rankings:'classement',games:'jeux',fusion:'fusions',wishlist:'souhaits',community:'communaute',market:'marche',profile:'profil',settings:'parametres',rules:'regles',referral:'parrainage',quests:'missions'};
const state={route:'packs',user:null,username:'',cards:[],excludedCardsCount:0,excludedWishesCount:0,frMigrationError:'',wallet:null,stock:null,wishes:[],seasonShows:[],marketListings:[],marketActivity:[],tradeOffers:[],marketError:'',marketQuery:'',marketRarity:'',players:[],peopleFilter:'',peopleError:'',dailyError:'',personalAlbums:[],publicAlbums:[],albumError:'',bio:'',favoriteGenre:'',daily:null,catalog:[],catalogMode:'series',actorQuery:'',actorMatches:[],actorSelected:null,actorShows:[],actorCatalogueIds:[],actorOnlyClub:false,actorLoading:false,actorError:'',catalogQuery:'',catalogRarity:'',catalogGenre:'',catalogDecade:'',catalogSort:'name',catalogPage:0,catalogTotal:null,catalogMore:true,catalogLoading:false,catalogError:'',rankings:[],collectionMode:'all',collectionSort:'rarity',collectionPage:0,collectionEligibleTotal:null,saleSelectionCard:null,pack:monthHalloween()?'halloween':'classic',filter:'',rank:'',genre:'',fusionRank:'Commune',fusionSelected:[],reduceMotion:localStorage.getItem('sc-reduced-motion')==='yes',busy:false};
const navName=key=>navItems.find(x=>x[0]===key)?.[2]||'Règles du jeu';
let toastTimer,clockTimer,searchTimer,catalogRequestId=0,refreshing=false,detailRequestId=0,actorSearchRequestId=0,lastShowForBack=null,personReturnToShow=false;
function toast(msg,error=false){const el=$('toast');el.textContent=msg;el.classList.toggle('error',error);el.classList.remove('hidden');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.add('hidden'),5200)}
function safeRoute(){return routes[decodeURIComponent(location.hash.replace(/^#\/?/,'').split('?')[0])||'paquets']||'packs'}
function loadRouteData(route){
 if((route==='catalog'&&state.catalogMode==='series'||route==='games')&&!state.catalog.length)loadCatalog(true);
 if(route==='rankings')loadRankings();
 if(route==='collection'){loadCollectionGoal();if(state.user)loadMySales()}
 if(route==='market'&&state.user)loadMarket();
 if(route==='community'&&state.user)loadPeople();
 if(route==='quests'&&state.user)loadDaily();
 if(route==='albums'&&state.user)loadAlbums();
}
function change(route){
 clearTimeout(searchTimer);
 const nextRoute=routes[route]||route;if(!nextRoute)return;
 state.route=nextRoute;
 const next='#/'+(slug[nextRoute]||nextRoute);
 if(location.hash!==next)history.pushState(null,'',next);
 render();loadRouteData(nextRoute);
 window.scrollTo({top:0,behavior:'instant'});
 document.body.classList.remove('drawer-open');
 const button=$('menuToggle');if(button)button.setAttribute('aria-expanded','false');
}
function syncBrowserRoute(){
 state.route=safeRoute();render();loadRouteData(state.route);
}
window.addEventListener('popstate',syncBrowserRoute);
window.addEventListener('hashchange',()=>{if(safeRoute()!==state.route)syncBrowserRoute()});
function renderChrome(){
 const pending=state.tradeOffers.filter(o=>o.status==='pending'&&o.seller_id===state.user?.id).length;
 const nav=navItems.map(([key,icon,title])=>'<button class="side-link '+(state.route===key?'active ':'')+(key==='premiere'?'featured':'')+'" data-route="'+key+'" aria-current="'+(state.route===key?'page':'false')+'"><span class="ico">'+esc(icon)+'</span><span>'+esc(title)+'</span>'+(key==='collection'&&state.cards.length?'<span class="count">'+money(state.cards.length)+'</span>':key==='wishlist'&&state.wishes.length?'<span class="count">'+state.wishes.length+'</span>':key==='market'&&pending?'<span class="count">'+pending+'</span>':'')+'</button>').join('');
 $('sidebar').innerHTML='<a class="logo" href="#/paquets" data-route="packs"><span class="logo-mark">S</span><span>SÉRIE<strong>CLUB</strong><em> TCG</em></span></a><nav class="side-links" aria-label="Menu principal">'+nav+'</nav>'+(monthHalloween()?'<div class="side-note"><b>✦ NUITS D’OCTOBRE</b>Édition Halloween disponible en octobre, chaque année.</div>':'')+'<div class="side-account" data-route="profile"><div class="avatar">'+esc((state.username||'S').slice(0,1).toUpperCase())+'</div><div><b>'+esc(state.username||'Mon compte')+'</b><small>'+money(state.cards.length)+' cartes dans ma collection</small></div></div>';
 $('topbar').innerHTML='<div class="row"><button class="top-btn mobile-menu" id="menuToggle" aria-label="Ouvrir le menu" aria-expanded="false">☰</button><span class="crumb">'+esc(navName(state.route)).toUpperCase()+'</span></div><div class="top-actions"><button class="top-btn sc4-bell" data-route="market" aria-label="Offres d’échange reçues">✧'+(pending?'<span class="sc4-bell-number">'+pending+'</span>':'')+'</button><button class="top-btn hide-mobile" data-route="rules">Règles du jeu</button><span class="credit-pill">Ⓒ &nbsp;'+money(state.wallet?.credits)+'<span>crédits</span></span><button class="top-btn" data-auth>'+(state.user?'Mon compte':'Connexion')+'</button><button class="top-btn hide-mobile" id="motionToggle" title="Animations">◐</button><span class="top-btn" aria-label="Langue : français">🇫🇷 FR</span></div>';
 if(monthHalloween()){
  $('topbar').querySelector('.crumb')?.insertAdjacentHTML('afterend','<span class="top-season-tag hide-mobile">☾ LES NUITS D’OCTOBRE</span>');
 }
 const mobile=[['packs','▤','Paquets'],['collection','▣','Collection'],['catalog','⌕','Catalogue'],['wishlist','☆','Souhaits']];
 const bottom=$('mobileNav');
 if(bottom)bottom.innerHTML=mobile.map(([route,icon,label])=>
   '<button type="button" data-route="'+route+'" class="sc59-mobile-link'+(state.route===route?' active':'')+'" aria-current="'+(state.route===route?'page':'false')+'" aria-label="'+label+'"><span aria-hidden="true">'+icon+'</span><small>'+label+'</small></button>').join('');
}
function render(){
 const focused=document.activeElement;
 const restoreCatalog=state.route==='catalog'&&focused?.id==='catalogQuery';
 const cursor=restoreCatalog?focused.selectionStart:null;
 document.body.classList.toggle('reduce-motion',state.reduceMotion);
 document.body.classList.toggle('season-halloween',monthHalloween());
 renderChrome();
 const view={packs,collection:collectionStudio,catalog:catalogue,wishlist,albums:personalAlbumsPage,rankings,fusion:fusions,profile,games,rules,settings,market:marketPage,community:communityPage,quests:questsPage}[state.route];
 $('page').innerHTML=(view?view(state):placeholder(state.route))+'<footer class="app-footer">SÉRIECLUB TCG · Données de séries : TVmaze · Visuels : ayants droit respectifs · Projet indépendant</footer>';
 document.title=navName(state.route)+' — SérieClub TCG';
 if(restoreCatalog){const input=$('catalogQuery');if(input){input.focus({preventScroll:true});if(cursor!==null)input.setSelectionRange(cursor,cursor)}}
}
async function ensureProfile(user){
 let {data,error}=await supa.from('profiles').select('username,bio,favorite_genre').eq('id',user.id).maybeSingle();
 if(error){const fallback=await supa.from('profiles').select('username').eq('id',user.id).maybeSingle();if(!fallback.error){data=fallback.data;error=null}}
 if(error){toast('Profil indisponible : '+error.message,true);return}
 if(data?.username){state.username=data.username;state.bio=data.bio||'';state.favoriteGenre=data.favorite_genre||'';return}
 const username=(user.user_metadata?.username||'').trim();
 if(username.length>=3&&username.length<=24){
  const out=await supa.from('profiles').upsert({id:user.id,username},{onConflict:'id'});
  if(!out.error){state.username=username;return}
 }
 state.username='';
 toast('Compte connecté : renseigne un pseudonyme dans Mon profil pour activer les boosters.',true);
}
async function loadSession(){
 if(refreshing)return;
 refreshing=true;
 try{
  const {data:{user},error}=await supa.auth.getUser();
  if(error&&!/session missing/i.test(error.message))console.warn('Auth:',error.message);
  state.user=user||null;
  if(!user){state.username='';state.bio='';state.favoriteGenre='';state.cards=[];state.excludedCardsCount=0;state.excludedWishesCount=0;state.frMigrationError='';state.wallet=null;state.wishes=[];state.stock=null;state.marketListings=[];state.marketActivity=[];state.tradeOffers=[];state.players=[];state.personalAlbums=[];state.publicAlbums=[];state.collectionEligibleTotal=null;state.saleSelectionCard=null;state.daily=null;render();return}
  await ensureProfile(user);
  const status=await supa.rpc('get_booster_status');
  if(status.error)console.warn('Réserve:',status.error.message);
  state.stock=status.data?.[0]||null;
  let [w,c,wi,tr]=await Promise.all([
   supa.from('player_wallets').select('*').eq('player_id',user.id).maybeSingle(),
   supa.from('player_cards').select('id,owner_id,series_id,rarity,locked,reserved_trade_id,obtained_at,series:series_id(id,name,image_url,genres,premiered,rarity,rarity_source,fr_verified,fr_verification_method,fr_evidence_url)').eq('owner_id',user.id).order('obtained_at',{ascending:false}).limit(3000),
   supa.from('player_wishlist').select('series_id,series:series_id(id,name,image_url,premiered,rarity,rarity_source,fr_verified,fr_verification_method,fr_evidence_url)').eq('owner_id',user.id).order('created_at',{ascending:false}).limit(500),
   supa.rpc('my_trade_offers')
  ]);
  // A missing France column is an actionable migration error, not a reason
  // to display worldwide historical wishlists.
  // Do not silently fall back to a worldwide inventory if the FR schema is absent.
  state.frMigrationError=c.error&&/fr_verified|schema cache|column/i.test(c.error.message)?
   'Active la migration France V5.4 + V5.5 pour afficher les cartes éligibles.':'';
  if(w.error)toast('Portefeuille : '+w.error.message,true);
  if(c.error)toast('Collection : '+c.error.message,true);
  state.wallet=w.data||null;
  const allCards=c.error?[]:c.data||[];
  const allWishes=wi.error?[]:wi.data||[];
  const france=partitionFrenchInventory(allCards,allWishes);
  state.cards=france.cards;
  state.wishes=france.wishes;
  state.excludedCardsCount=france.excludedCardsCount;
  state.excludedWishesCount=france.excludedWishesCount;
  state.fusionSelected=state.fusionSelected.filter(id=>state.cards.some(c=>c.id===id));
  state.tradeOffers=tr.error?[]:tr.data||[];
  if(wi.error&&wi.error.code!=='42P01')console.warn('Wishlist:',wi.error.message);
  render();
  loadDaily();
  if(state.route==='market')loadMarket();
  if(state.route==='collection'){loadCollectionGoal();loadMySales()}
  if(state.route==='community')loadPeople();
  if(state.route==='albums')loadAlbums();
 }catch(e){console.error('Session:',e);toast('Connexion au serveur momentanément indisponible.',true)}
 finally{refreshing=false}
}
async function loadAlbums(){
 if(!state.user){state.personalAlbums=[];state.publicAlbums=[];if(state.route==='albums')render();return}
 const [own,shared]=await Promise.all([
  supa.rpc('my_personal_albums'),supa.rpc('public_personal_albums')
 ]);
 const errors=[own,shared].filter(v=>v.error).map(v=>v.error.message);
 state.albumError=errors.length?'Active la migration SQL V4 des albums : '+errors[0]:'';
 state.personalAlbums=own.data||[];state.publicAlbums=shared.data||[];
 if(state.route==='albums')render();
}
async function openAlbum(id){
 if(!state.user){openAuth();return}
 const album=state.personalAlbums.find(a=>a.album_id===id)||state.publicAlbums.find(a=>a.album_id===id);
 if(!album){toast('Album introuvable, actualise la page.',true);return}
 const {data,error}=await supa.rpc('album_card_data',{p_album_id:id});
 if(error){toast('Album : '+error.message,true);return}
 $('overlay').classList.remove('hidden');
 $('overlay').innerHTML=albumDialog(state,album,data||[]);
}
async function albumMutation(rpc,args,msg,id){
 if(!state.user){openAuth();return}
 if(state.busy)return;
 state.busy=true;
 try{
  const {error}=await supa.rpc(rpc,args);if(error)throw error;
  toast(msg);await loadAlbums();
  if(id)await openAlbum(id);
 }catch(e){toast('Album : '+e.message,true)}
 finally{state.busy=false}
}
async function createAlbum(){
 const title=$('newAlbumTitle')?.value.trim(),description=$('newAlbumDescription')?.value.trim()||'';
 const visible=Boolean($('newAlbumPublic')?.checked);
 if(!title||title.length<3||title.length>48||description.length>160){
  toast('Choisis un titre de 3 à 48 caractères et une description courte.',true);return
 }
 await albumMutation('create_personal_album',{p_title:title,p_description:description,p_public:visible},'Nouvelle saison personnelle créée.');
}
async function deleteAlbum(id){
 if(!confirm('Supprimer cet album et ses sélections ? Tes cartes ne seront pas supprimées.'))return;
 await albumMutation('delete_personal_album',{p_album_id:id},'Album personnel supprimé.');
}
async function addAlbumCard(id){
 const cardId=$('albumCardSelect')?.value;
 if(!cardId)return toast('Choisis une carte à ajouter.',true);
 await albumMutation('add_card_to_album',{p_album_id:id,p_card_id:cardId},'Carte ajoutée à la saison.',id);
}
async function removeAlbumCard(id,cardId){
 await albumMutation('remove_card_from_album',{p_album_id:id,p_card_id:cardId},'Carte retirée de l’album.',id);
}
async function loadCollectionGoal(){
 if(state.collectionEligibleTotal!==null)return;
 if(loadCollectionGoal.pending)return;
 loadCollectionGoal.pending=true;
 try{
  const {count,error}=await supa.from('series').select('id',{count:'exact',head:true})
   .neq('rarity_source','pending').eq('fr_verified',true).not('image_url','is',null);
  state.collectionEligibleTotal=!error&&Number.isFinite(count)?count:0;
 }catch{state.collectionEligibleTotal=0}
 finally{
  loadCollectionGoal.pending=false;
  if(state.route==='collection')render();
 }
}
async function loadMySales(){
 if(!state.user)return;
 try{
  const {data,error}=await supa.rpc('my_marketplace_activity');
  if(!error){state.marketActivity=data||[];if(state.route==='collection')render()}
 }catch{/* Le Comptoir indiquera l'erreur sur sa page dédiée. */}
}
async function loadMarket(){
 if(!state.user){state.marketListings=[];state.marketActivity=[];state.tradeOffers=[];if(state.route==='market')render();return}
 const [feed,activity,offers]=await Promise.all([
  supa.rpc('marketplace_feed'),supa.rpc('my_marketplace_activity'),supa.rpc('my_trade_offers')
 ]);
 const errors=[feed,activity,offers].filter(r=>r.error).map(r=>r.error.message);
 state.marketError=errors.length?'Active les migrations SQL V4 du Comptoir : '+errors[0]:'';
 state.marketListings=feed.data||[];
 state.marketActivity=activity.data||[];
 state.tradeOffers=offers.data||[];
 if(state.route==='market')render();
}
async function loadPeople(){
 if(!state.user){state.players=[];if(state.route==='community')render();return}
 const {data,error}=await supa.rpc('player_directory');
 state.players=data||[];
 state.peopleError=error?'Active la migration SQL V4 du Signal : '+error.message:'';
 if(state.route==='community')render();
}
async function loadDaily(){
 if(!state.user){state.daily=null;return}
 const {data,error}=await supa.rpc('get_daily_progress');
 state.daily=error?null:data?.[0]||null;
 state.dailyError=error?'Active la migration SQL V4 des Missions : '+error.message:'';
 if(state.route==='quests')render();
}
async function executeMarket(action,params,success){
 if(!state.user){openAuth();return}
 if(state.busy)return;
 state.busy=true;
 try{
  const {data,error}=await supa.rpc(action,params);
  if(error)throw error;
  toast(success||'Opération enregistrée.');
  await loadSession();
  await loadMarket();
  return data;
 }catch(e){toast('Le Comptoir : '+e.message,true)}
 finally{state.busy=false}
}
function openTradeDialog(listingId){
 if(!state.user){openAuth();return}
 const listing=state.marketListings.find(l=>l.listing_id===listingId);
 if(!listing)return toast('Annonce indisponible. Actualise le Comptoir.',true);
 if(listing.seller_id===state.user.id)return toast('Tu ne peux pas échanger avec toi-même.',true);
 $('overlay').classList.remove('hidden');
 $('overlay').innerHTML=tradeDialog(state,listing);
}
async function createListing(){
 if(!state.user){openAuth();return}
 const id=$('listingCard')?.value,price=Number($('listingPrice')?.value);
 if(!id||!Number.isInteger(price)||price<10||price>50000)return toast('Choisis une carte et un prix entre 10 et 50 000 crédits.',true);
 state.saleSelectionCard=null;
 await executeMarket('create_card_listing',{p_card_id:id,p_price:price},'Ta carte est désormais en vente.');
}
async function purchaseListing(id){
 const listing=state.marketListings.find(l=>l.listing_id===id);
 if(!listing)return toast('Annonce introuvable.',true);
 if(!confirm('Acheter '+listing.series_name+' pour '+listing.price+' crédits virtuels ?'))return;
 await executeMarket('buy_card_listing',{p_listing_id:id},'Achat effectué : carte ajoutée à ta collection.');
}
async function submitTradeOffer(id){
 const cardId=$('offerCard')?.value;
 if(!cardId)return toast('Sélectionne une carte à proposer.',true);
 if(!confirm('Réserver cette carte pour proposer un échange ?'))return;
 closeModal();
 await executeMarket('propose_card_trade',{p_listing_id:id,p_offered_card_id:cardId},'Proposition envoyée, ta carte est réservée.');
}
async function respondTradeOffer(id,accept){
 if(accept&&!confirm('Accepter cet échange ? Les deux cartes changeront de propriétaire.'))return;
 await executeMarket('respond_card_trade',{p_offer_id:id,p_accept:accept},accept?'Échange sécurisé terminé.':'Proposition clôturée.');
}
async function toggleFollow(id){
 if(!state.user){openAuth();return}
 if(state.busy)return;
 state.busy=true;
 try{
  const {data,error}=await supa.rpc('toggle_player_follow',{p_target:id});
  if(error)throw error;
  toast(data?'Collectionneur ajouté à tes abonnements.':'Tu ne suis plus ce collectionneur.');
  await loadPeople();
 }catch(e){toast('Abonnements : '+e.message,true)}
 finally{state.busy=false}
}
async function claimQuest(key){
 if(!state.user){openAuth();return}
 if(state.busy)return;
 state.busy=true;
 try{
  const {data,error}=await supa.rpc('claim_quest_reward',{p_quest_key:key});
  if(error)throw error;
  toast('Mission accomplie : +'+data+' crédits et expérience !');
  await loadSession();
  await loadDaily();
 }catch(e){toast('Mission : '+e.message,true)}
 finally{state.busy=false}
}
async function loadCatalog(reset=false){
 // Toute nouvelle recherche peut remplacer une précédente en cours.
 // Une pagination simultanée, en revanche, ne doit pas charger deux fois la même page.
 if(state.catalogLoading&&!reset)return;
 const request=++catalogRequestId;
 const page=reset?0:state.catalogPage;
 if(reset){state.catalog=[];state.catalogPage=0;state.catalogMore=true;state.catalogTotal=null}
 state.catalogLoading=true;state.catalogError='';
 if(state.route==='catalog'&&state.catalogMode==='series')render();
 try{
  let query=supa.from('series')
    .select('id,name,image_url,premiered,genres,rarity,rarity_source,fr_verified,fr_verification_method,fr_evidence_url',{count:'exact'})
    .eq('fr_verified',true).neq('rarity_source','pending')
    .not('image_url','is',null);
  const name=state.catalogQuery.trim().replace(/[%_(),]/g,'').slice(0,90);
  if(name)query=query.ilike('name','%'+name+'%');
  if(ranks.includes(state.catalogRarity))query=query.eq('rarity',state.catalogRarity);
  const allowedGenres=['Drama','Comedy','Crime','Thriller','Mystery','Science-Fiction','Fantasy','Horror','Action','Adventure','Romance','Animation','Documentary','Family'];
  if(allowedGenres.includes(state.catalogGenre))query=query.contains('genres',[state.catalogGenre]);
  const decade=state.catalogDecade;
  if(decade==='before1950')query=query.lt('premiered','1950-01-01');
  else if(/^\d{4}$/.test(decade||'')&&Number(decade)>=1950&&Number(decade)<=2020){
   query=query.gte('premiered',decade+'-01-01').lt('premiered',String(Number(decade)+10)+'-01-01');
  }
  switch(state.catalogSort){
   case 'recent':query=query.order('premiered',{ascending:false,nullsFirst:false});break;
   case 'oldest':query=query.order('premiered',{ascending:true,nullsFirst:false});break;
   case 'popular':query=query.order('popularity_weight',{ascending:false,nullsFirst:false});break;
   default:query=query.order('name',{ascending:true});break;
  }
  const {data,error,count}=await query.order('id',{ascending:true})
   .range(page*36,page*36+35);
  if(request!==catalogRequestId)return;
  if(error)throw error;
  state.catalog=reset?[...(data||[])]:state.catalog.concat(data||[]);
  state.catalogTotal=Number.isSafeInteger(count)?count:null;
  state.catalogMore=(data||[]).length===36 && (state.catalogTotal===null||state.catalog.length<state.catalogTotal);
  state.catalogPage=page+1;
 }catch(e){
  if(request!==catalogRequestId)return;
  state.catalogError=/fr_verified|schema cache|column/i.test(e.message)
   ?'La migration France doit être activée pour filtrer le catalogue.'
   :'Catalogue indisponible : '+e.message;
 }finally{
  if(request===catalogRequestId){
   state.catalogLoading=false;
   if(state.route==='catalog'&&state.catalogMode==='series')render();
  }
 }
}
async function loadSeasonShows(){
 if(!monthHalloween())return;
 try{
  const desired=['Wednesday','Stranger Things','The Haunting of Hill House','Midnight Mass','From','American Horror Story','The Last of Us','Penny Dreadful','The Walking Dead'];
  const [curated,genre]=await Promise.all([
   supa.from('series').select('id,name,image_url,premiered,genres').in('name',desired).eq('fr_verified',true).neq('rarity_source','pending').not('image_url','is',null).limit(12),
   supa.from('series').select('id,name,image_url,premiered,genres').overlaps('genres',['Horror','Thriller','Supernatural','Mystery']).eq('fr_verified',true).neq('rarity_source','pending').not('image_url','is',null).order('premiered',{ascending:false}).limit(30)
  ]);
  const pool=[...(curated.data||[]),...(genre.data||[])];
  const seen=new Set();state.seasonShows=pool.filter(x=>x?.image_url&&(!seen.has(x.id))&&seen.add(x.id)).slice(0,6);
  if(state.route==='packs')render();
 }catch(e){console.warn('Sélection de saison indisponible :',e.message)}
}

function showDetailLoading(label='Préparation de la fiche…'){
 const root=$('overlay');root.classList.remove('hidden');
 root.innerHTML='<div class="dialog sc5-dialog sc5-loading" role="dialog" aria-modal="true" aria-label="Chargement de la fiche"><button class="close" data-close aria-label="Fermer">×</button><div class="sc5-loader-icon">✧</div><h2>'+esc(label)+'</h2><p>Informations fournies par TVmaze.</p></div>';
 root.querySelector('[data-close]')?.focus();
}
function detailReady(token){
 return token===detailRequestId && !$('overlay').classList.contains('hidden');
}
async function catalogueMatches(shows){
 const ids=shows.map(show=>Number(show.id)).filter(id=>Number.isSafeInteger(id)&&id>0).slice(0,120);
 if(!ids.length)return [];
 try{
  const {data,error}=await supa.from('series').select('id').in('id',ids).eq('fr_verified',true).neq('rarity_source','pending');
  return error?[]:(data||[]).map(x=>x.id);
 }catch{return []}
}
function findLocalShow(id){
 return state.seasonShows.find(x=>x.id===id)
  ||state.catalog.find(x=>x.id===id)
  ||state.cards.find(c=>c.series_id===id)?.series
  ||state.wishes.find(w=>w.series_id===id)?.series
  ||state.actorShows.find(x=>x.id===id)
  ||null;
}
async function openSeriesDetail(id){
 const numeric=Number(id);
 if(!Number.isSafeInteger(numeric)||numeric<=0)return;
 const token=++detailRequestId;
 lastShowForBack=numeric;
 showDetailLoading('Une histoire à découvrir…');
 let base=findLocalShow(numeric)||{};
 try{
  const loaded=await getShowDetails(numeric);
  if(!detailReady(token))return;
  if(!loaded&&!base?.name){
   const {data,error}=await supa.from('series').select('id,name,image_url,premiered,genres,rarity,rarity_source,fr_verified,fr_verification_method,fr_evidence_url').eq('id',numeric).maybeSingle();
   if(!error&&data)base=data;
  }
  if(!loaded&&!base?.name){
   $('overlay').innerHTML='<div class="dialog sc5-loading"><button class="close" data-close>×</button><h2>Série introuvable</h2><p>Aucune fiche disponible pour cet identifiant.</p></div>';
   return;
  }
  // The canonical series rank is stored in Supabase, never derived from a
  // card's historic rarity, a TVmaze popularity weight or a selected filter.
  {
    // Read the authoritative French proof on EVERY modal open. Previously
    // a cached series could permanently show "France à vérifier" even after
    // the server had already validated the show.
    const {data:canonical,error:catalogError}=await supa.from('series')
      .select('id,name,image_url,premiered,genres,rarity,rarity_source,fr_verified,fr_verification_method,fr_evidence_url')
      .eq('id',numeric).maybeSingle();
    if(!catalogError&&canonical)base={...base,...canonical};
    if(!detailReady(token))return;
  }
  const show=loaded||base;
  $('overlay').innerHTML=showDetailHTML(loaded||{},base);
  $('overlay').querySelector('[data-close]')?.focus();
  getFrenchOffersByShow(numeric).then(record=>{
    if(!detailReady(token))return;
    const target=$('overlay').querySelector('[data-fr-watch]');
    if(target)target.innerHTML=renderFranceAvailability(record,{...show,...base});
  }).catch(()=>{/* Provider data remains explicitly unverified. */});
  // Localized synopsis is loaded independently: never blocks cast or navigation.
  getFrenchSynopsis(show,stripSummary(show.summary||base.summary))
    .then(result=>{
      if(!detailReady(token))return;
      const target=$('overlay').querySelector('[data-synopsis]');
      if(target)target.innerHTML=frenchSynopsisHTML(result,show.summary||base.summary);
    })
    .catch(()=>{
      if(!detailReady(token))return;
      const target=$('overlay').querySelector('[data-synopsis]');
      if(target)target.innerHTML=frenchSynopsisHTML({source:'unavailable',text:''},show.summary||base.summary);
    });
 }catch(error){
  if(!detailReady(token))return;
  if(base?.name){
    $('overlay').innerHTML=showDetailHTML({},base);
    getFrenchOffersByShow(numeric).then(record=>{
      if(!detailReady(token))return;
      const target=$('overlay').querySelector('[data-fr-watch]');
      if(target)target.innerHTML=renderFranceAvailability(record,base);
    }).catch(()=>{});
    getFrenchSynopsis(base,stripSummary(base.summary)).then(result=>{
      if(!detailReady(token))return;
      const target=$('overlay').querySelector('[data-synopsis]');
      if(target)target.innerHTML=frenchSynopsisHTML(result,base.summary);
    }).catch(()=>{if(detailReady(token)){const target=$('overlay').querySelector('[data-synopsis]');if(target)target.innerHTML=frenchSynopsisHTML({source:'unavailable',text:''},base.summary)}});
    const dialog=$('overlay').querySelector('.sc5-dialog');
    dialog?.insertAdjacentHTML('afterbegin','<div class="notice sc5-fetch-warning">La distribution et le résumé détaillé ne sont pas accessibles momentanément sur TVmaze.</div>');
    $('overlay').querySelector('[data-close]')?.focus();
  }else{
    $('overlay').innerHTML='<div class="dialog sc5-loading"><button class="close" data-close>×</button><h2>Fiche indisponible</h2><p>Le service TVmaze ne répond pas pour le moment. Réessaie.</p></div>';
  }
 }
}
async function openPersonDetail(id,fromShow=false){
 const numeric=Number(id);
 if(!Number.isSafeInteger(numeric)||numeric<=0)return;
 const token=++detailRequestId;
 personReturnToShow=Boolean(fromShow);
 showDetailLoading('À la rencontre de la distribution…');
 try{
  const result=await getPersonFilmography(numeric);
  const ids=await catalogueMatches(result.shows);
  if(!detailReady(token))return;
  $('overlay').innerHTML=actorDetailHTML(result.person,result.shows,new Set(ids),personReturnToShow);
  $('overlay').querySelector('[data-close]')?.focus();
 }catch(error){
  if(!detailReady(token))return;
  $('overlay').innerHTML='<div class="dialog sc5-loading"><button class="close" data-close>×</button><h2>Filmographie indisponible</h2><p>'+esc(error.message)+'</p><button class="btn subtle" data-person-back>Retour</button></div>';
 }
}
async function searchCatalogueActors(){
 const query=state.actorQuery.trim();
 if(query.length<2){
   state.actorError='Saisis au moins deux caractères pour rechercher un acteur.';
   state.actorMatches=[];state.actorLoading=false;render();return;
 }
 const token=++actorSearchRequestId;
 state.actorLoading=true;state.actorError='';state.actorMatches=[];
 state.actorSelected=null;state.actorShows=[];state.actorCatalogueIds=[];state.actorOnlyClub=false;
 if(state.route==='catalog'&&state.catalogMode==='actors')render();
 try{
  const matches=await searchPeople(query);
  if(token!==actorSearchRequestId)return;
  state.actorMatches=matches;
  state.actorError=matches.length?'':'Aucun artiste trouvé. Essaie un autre nom.';
 }catch(error){
  if(token!==actorSearchRequestId)return;
  state.actorError='Recherche impossible : '+error.message;
 }finally{
  if(token===actorSearchRequestId){
   state.actorLoading=false;
   if(state.route==='catalog'&&state.catalogMode==='actors')render();
  }
 }
}
async function filterCatalogueByActor(id){
 const numeric=Number(id);if(!Number.isSafeInteger(numeric)||numeric<=0)return;
 const token=++actorSearchRequestId;
 state.catalogMode='actors';state.actorLoading=true;state.actorError='';state.actorOnlyClub=false;
 if(state.route!=='catalog')change('catalog');else render();
 try{
  const result=await getPersonFilmography(numeric);
  const ids=await catalogueMatches(result.shows);
  if(token!==actorSearchRequestId)return;
  state.actorSelected=result.person;
  state.actorQuery=result.person.name;
  state.actorShows=result.shows;
  state.actorCatalogueIds=ids;
  state.actorMatches=[];
 }catch(error){
  if(token!==actorSearchRequestId)return;
  state.actorSelected=null;state.actorShows=[];
  state.actorError='Filmographie indisponible : '+error.message;
 }finally{
  if(token===actorSearchRequestId){
   state.actorLoading=false;
   if(state.route==='catalog'&&state.catalogMode==='actors')render();
  }
 }
}
async function loadRankings(){
 const {data,error}=await supa.rpc('get_leaderboard');
 if(error){toast('Classement indisponible : '+error.message,true);return}
 state.rankings=data||[];if(state.route==='rankings')render();
}
async function toggleWishlist(id){
 if(!state.user){openAuth();return}
 const exists=state.wishes.some(w=>String(w.series_id)===String(id));
 if(!exists){
  const check=await supa.from('series').select('id')
   .eq('id',id).eq('fr_verified',true).neq('rarity_source','pending').maybeSingle();
  if(check.error||!check.data){toast('Cette série attend une preuve de diffusion française avant d’être ajoutée aux souhaits.',true);return}
 }
 const reply=exists?await supa.from('player_wishlist').delete().eq('owner_id',state.user.id).eq('series_id',id):await supa.from('player_wishlist').insert({owner_id:state.user.id,series_id:id});
 if(reply.error){toast('Liste de souhaits : '+reply.error.message,true);return}
 const {data}=await supa.from('player_wishlist').select('series_id,series:series_id(id,name,image_url,premiered,rarity,rarity_source,fr_verified)').eq('owner_id',state.user.id).order('created_at',{ascending:false});
 state.wishes=(data||[]).filter(w=>w.series?.fr_verified===true&&w.series?.rarity_source!=='pending');toast(exists?'Série retirée des souhaits.':'Série ajoutée à tes souhaits.');render();
}
async function toggleLock(id,next){
 const {error}=await supa.rpc('set_card_locked',{p_card_id:id,p_locked:next});
 if(error){toast('Protection : '+error.message,true);return}
 const match=state.cards.find(c=>c.id===id);if(match)match.locked=next;
 state.fusionSelected=state.fusionSelected.filter(x=>x!==id);
 render();toast(next?'Carte protégée.':'Protection retirée.');
}
async function claimDaily(){
 if(!state.user){openAuth();return}
 if(state.busy)return;state.busy=true;
 try{const {data,error}=await supa.rpc('claim_daily_reward');if(error)throw error;toast('Récompense quotidienne : +100 crédits !');await loadSession()}
 catch(e){toast('Récompense : '+e.message,true)}finally{state.busy=false}
}
function showOpening(data){
 const overlay=$('overlay');overlay.classList.remove('hidden');
 overlay.innerHTML='<div class="dialog opening-dialog" role="dialog" aria-modal="true" aria-label="Paquet ouvert"><button class="close" data-close aria-label="Fermer">×</button><div class="caps">SÉRIECLUB · OUVERTURE DE PAQUET</div><div id="openingPack">'+foil(state.pack)+'</div><div class="opening-status" id="openingText">Les cartes se dévoilent…</div><div class="opening-result hidden" id="openingCards"></div><button class="btn primary hidden" id="openingDone">Voir mes nouvelles cartes ✓</button></div>';
 $('openingPack').querySelector('.foil').classList.add('shaking');
 const show=()=>{const f=$('openingPack')?.querySelector('.foil');if(f)f.classList.add('opened')};
 const reveal=()=>{if(!$('openingCards'))return;$('openingPack').classList.add('hidden');$('openingCards').classList.remove('hidden');$('openingCards').innerHTML=data.map(c=>card({rarity:c.rarity,series:{id:c.series_id,name:c.name,image_url:c.image_url}})).join('');$('openingText').textContent='Cinq nouvelles cartes ! +25 crédits · +50 XP';$('openingDone').classList.remove('hidden')};
 if(state.reduceMotion||matchMedia('(prefers-reduced-motion: reduce)').matches)reveal();else{setTimeout(show,650);setTimeout(reveal,1250)}
}
async function openPack(){
 if(!state.user){openAuth();return}
 if(state.busy)return;
 if(state.pack==='halloween'&&!monthHalloween()){toast('Halloween n’est disponible qu’en octobre.',true);return}
 state.busy=true;const btn=$('openPack');if(btn){btn.disabled=true;btn.textContent='Préparation du paquet…'}
 try{
  const rpc=state.pack==='halloween'?'open_halloween_booster':'open_starter_booster';
  const {data,error}=await supa.rpc(rpc);
  if(error)throw error;
  if(!data||data.length!==5)throw Error('Le paquet ne contient pas cinq cartes. Contacte le support.');
  showOpening(data);await loadSession();
 }catch(e){toast('Ouverture impossible : '+e.message,true);render()}
 finally{state.busy=false}
}
async function doFusion(){
 if(state.fusionSelected.length!==10||state.busy)return;
 if(!confirm('Confirmer ? Ces dix cartes seront définitivement consommées.'))return;
 state.busy=true;
 try{
  const {data,error}=await supa.rpc('fuse_cards',{p_card_ids:state.fusionSelected});
  if(error)throw error;
  state.fusionSelected=[];toast('Fusion réussie : '+(data?.[0]?.name||'nouvelle carte')+' ('+(data?.[0]?.rarity||'rareté supérieure')+')');
  await loadSession();
 }catch(e){toast('Fusion impossible : '+e.message,true)}
 finally{state.busy=false}
}
function openAuth(){
 const root=$('overlay');root.classList.remove('hidden');
 root.innerHTML='<div class="dialog" role="dialog" aria-modal="true" aria-label="Compte joueur"><button class="close" data-close aria-label="Fermer">×</button><div class="caps">BIENVENUE DANS LE CLUB</div><h2>MON COMPTE</h2>'+(state.user?'<p>Connecté : '+esc(state.user.email)+'</p><button class="btn primary wide" data-route="profile" data-close>Gérer mon profil</button><button class="btn subtle wide" id="authSignout" style="margin-top:10px">Me déconnecter</button>':'<p>Connecte-toi ou crée un compte gratuit pour sauvegarder tes cartes.</p><input class="input" id="authEmail" type="email" autocomplete="email" placeholder="E-mail"><input class="input" id="authPassword" type="password" autocomplete="current-password" placeholder="Mot de passe (6 caractères minimum)"><input class="input" id="authUsername" maxlength="24" autocomplete="nickname" placeholder="Pseudonyme pour l’inscription"><div class="row"><button class="btn primary" id="authLogin">Connexion</button><button class="btn subtle" id="authRegister">Créer un compte</button></div>')+'<p class="feedback" id="authFeedback" role="status"></p></div>';
 $('authEmail')?.focus();
}
async function authenticate(register){
 const email=$('authEmail')?.value.trim(),password=$('authPassword')?.value,username=$('authUsername')?.value.trim();
 if(!email||!password||password.length<6||(register&&(username.length<3||username.length>24))){$('authFeedback').textContent='Renseigne un e-mail, un mot de passe de 6 caractères minimum et un pseudonyme de 3 à 24 caractères pour l’inscription.';return}
 $('authFeedback').textContent='Connexion au club…';
 const result=register?await supa.auth.signUp({email,password,options:{emailRedirectTo:location.origin+location.pathname,data:{username}}}):await supa.auth.signInWithPassword({email,password});
 if(result.error){$('authFeedback').textContent=result.error.message;return}
 if(register&&!result.data.session){$('authFeedback').textContent='Inscription enregistrée. Vérifie ton e-mail pour confirmer le compte.';return}
 $('overlay').classList.add('hidden');await loadSession();toast('Bienvenue dans le club !')
}
function closeModal(){detailRequestId++;const root=$('overlay');root.classList.add('hidden');root.replaceChildren()}
function exportCollection(){
 if(!state.user||!state.cards.length){toast('Aucune carte à exporter.',true);return}
 const csv=collectionCSV(state.cards,state.wishes,state.marketActivity);
 const blob=new Blob(['\uFEFF',csv],{type:'text/csv;charset=utf-8'});
 const url=URL.createObjectURL(blob),link=document.createElement('a');
 link.href=url;link.download='serieclub-collection-'+new Date().toISOString().slice(0,10)+'.csv';
 document.body.append(link);link.click();link.remove();
 setTimeout(()=>URL.revokeObjectURL(url),3000);
 toast('Ta collection a été exportée au format CSV.');
}
async function exportData(){
 const payload={exported_at:new Date().toISOString(),username:state.username,wallet:state.wallet,cards:state.cards,wishlist:state.wishes};
 const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='serieclub-mes-donnees.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
}
function chooseChallenge(type){
 const pool=state.catalog.filter(c=>c.image_url&&c.premiered);
 const stage=$('challengeStage');
 if(pool.length<2){stage.innerHTML='<div class="panel">Le jeu nécessite au moins deux séries datées et illustrées dans le catalogue. Vérifie la synchronisation TVmaze.</div>';return}
 const choice=()=>pool[Math.floor(Math.random()*pool.length)];
 const a=choice();let b=choice();let guard=0;while((a.id===b.id||a.premiered?.slice(0,4)===b.premiered?.slice(0,4))&&guard++<100)b=choice();
 if(type==='poster'){
  stage.innerHTML='<div class="panel" style="max-width:490px"><h2>Affiche mystère</h2><img id="quizPoster" src="'+photo(a.image_url)+'" alt="Affiche floutée" style="width:175px;filter:blur(17px);border-radius:9px;display:block;margin:16px 0"><input class="input" id="quizGuess" placeholder="Nom de la série" style="width:100%"><button class="btn primary" id="quizReveal" style="margin-top:10px">Révéler</button><p id="quizAnswer" role="status"></p></div>';
  $('quizReveal').onclick=()=>{const guess=$('quizGuess').value;const norm=x=>x.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');$('quizPoster').style.filter='none';$('quizAnswer').textContent=(norm(guess)===norm(a.name)?'Bravo ! ':'Réponse : ')+a.name;$('quizReveal').disabled=true};
 }else{
  const first=a.premiered<b.premiered?a:b;
  stage.innerHTML='<div class="panel" style="max-width:620px"><h2>Avant ou après ?</h2><p>Quelle série a débuté en premier ?</p><div class="challenge-choices"><button data-answer="'+a.id+'">'+esc(a.name)+'</button><button data-answer="'+b.id+'">'+esc(b.name)+'</button></div><p id="quizAnswer" role="status"></p></div>';
  stage.querySelectorAll('[data-answer]').forEach(button=>button.onclick=()=>{$('quizAnswer').textContent=(String(first.id)===button.dataset.answer?'Bravo ! ':'Dommage ! ')+first.name+' ('+first.premiered.slice(0,4)+')';stage.querySelectorAll('[data-answer]').forEach(x=>x.disabled=true)});
 }
}
function globalClick(e){
 const close=e.target.closest('[data-close]');if(close){closeModal();return}
 if(e.target.closest('[data-summary-toggle]')){
  const dialog=e.target.closest('.sc5-dialog');
  const short=dialog?.querySelector('.sc5-summary-short');
  const long=dialog?.querySelector('.sc5-summary-long');
  if(short&&long){
   const expanded=long.classList.toggle('hidden')===false;
   short.classList.toggle('hidden',expanded);
   e.target.setAttribute('aria-expanded',String(expanded));
   e.target.textContent=expanded?'Réduire le résumé ↑':'Lire le résumé complet ↓';
  }
  return;
 }
 const actorButton=e.target.closest('[data-person]');
 if(actorButton){openPersonDetail(actorButton.dataset.person,Boolean(actorButton.closest('.sc5-dialog')?.querySelector('.sc5-show-head')));return}
 if(e.target.closest('[data-person-back]')){
  if(personReturnToShow&&lastShowForBack)openSeriesDetail(lastShowForBack);else closeModal();
  return;
 }
 const actorFilter=e.target.closest('[data-filter-actor]');
 if(actorFilter){closeModal();filterCatalogueByActor(actorFilter.dataset.filterActor);return}
 const mode=e.target.closest('[data-catalog-mode]');
 if(mode){
  state.catalogMode=mode.dataset.catalogMode==='actors'?'actors':'series';
  state.actorError='';render();
  if(state.catalogMode==='series'&&!state.catalog.length)loadCatalog(true);
  return;
 }
 if(e.target.closest('#actorSearchSubmit')){state.actorQuery=$('actorSearchQuery')?.value||'';searchCatalogueActors();return}
 const personSelect=e.target.closest('[data-select-actor]');
 if(personSelect){filterCatalogueByActor(personSelect.dataset.selectActor);return}
 if(e.target.closest('[data-actor-reset]')){
  actorSearchRequestId++;
  state.actorSelected=null;state.actorShows=[];state.actorCatalogueIds=[];state.actorMatches=[];state.actorOnlyClub=false;
  state.actorQuery='';state.actorError='';state.actorLoading=false;render();return;
 }

 const route=e.target.closest('[data-route]');if(route){e.preventDefault();change(route.dataset.route);return}
 if(e.target.closest('#menuToggle')){const opened=document.body.classList.toggle('drawer-open');$('menuToggle')?.setAttribute('aria-expanded',String(opened));return}
 if(e.target.closest('#drawerBackdrop')){document.body.classList.remove('drawer-open');$('menuToggle')?.setAttribute('aria-expanded','false');return}
 if(e.target.closest('[data-auth]')){openAuth();return}
 if(e.target.closest('#authLogin')){authenticate(false);return}
 if(e.target.closest('#authRegister')){authenticate(true);return}
 if(e.target.closest('#authSignout')){supa.auth.signOut().then(()=>{closeModal();loadSession();toast('Compte déconnecté.')});return}
 if(e.target.closest('#motionToggle')){state.reduceMotion=!state.reduceMotion;localStorage.setItem('sc-reduced-motion',state.reduceMotion?'yes':'no');render();return}

 if(e.target.closest('#createAlbum')){createAlbum();return}
 const viewAlbum=e.target.closest('[data-view-album]');if(viewAlbum){openAlbum(viewAlbum.dataset.viewAlbum);return}
 const deleteAlb=e.target.closest('[data-delete-album]');if(deleteAlb){deleteAlbum(deleteAlb.dataset.deleteAlbum);return}
 const addAlb=e.target.closest('#albumAddCard');if(addAlb){addAlbumCard(addAlb.dataset.albumId);return}
 const removeAlb=e.target.closest('[data-album-remove]');if(removeAlb){removeAlbumCard(removeAlb.dataset.albumId,removeAlb.dataset.albumRemove);return}
 if(e.target.closest('#createListing')){createListing();return}
 if(e.target.closest('#refreshMarket')){loadMarket();return}
 if(e.target.closest('#refreshPeople')){loadPeople();return}
 const buy=e.target.closest('[data-buy]');if(buy){purchaseListing(buy.dataset.buy);return}
 const cancelListing=e.target.closest('[data-cancel-listing]');
 if(cancelListing){
  if(confirm('Retirer cette carte du Comptoir ?'))executeMarket('cancel_card_listing',{p_listing_id:cancelListing.dataset.cancelListing},'Annonce retirée, carte disponible.');
  return
 }
 const offer=e.target.closest('[data-offer]');if(offer){openTradeDialog(offer.dataset.offer);return}
 const submit=e.target.closest('#submitOffer');if(submit){submitTradeOffer(submit.dataset.listing);return}
 const answer=e.target.closest('[data-respond-trade]');if(answer){respondTradeOffer(answer.dataset.respondTrade,answer.dataset.accept==='true');return}
 const follow=e.target.closest('[data-follow]');if(follow){toggleFollow(follow.dataset.follow);return}
 const claim=e.target.closest('[data-claim-quest]');if(claim){claimQuest(claim.dataset.claimQuest);return}
 const pack=e.target.closest('[data-pack]');if(pack){state.pack=pack.dataset.pack;render();return}
 if(e.target.closest('#openPack')){openPack();return}
 if(e.target.closest('[data-daily]')){claimDaily();return}
 if(e.target.closest('#openingDone')){closeModal();change('collection');return}
 if(e.target.closest('[data-export-collection]')){exportCollection();return}
 const switchMode=e.target.closest('[data-collection-mode]');
 if(switchMode){state.collectionMode=switchMode.dataset.collectionMode;state.collectionPage=0;render();return}
 const rankChip=e.target.closest('[data-collection-rank]');
 if(rankChip){state.rank=state.rank===rankChip.dataset.collectionRank?'':rankChip.dataset.collectionRank;state.collectionPage=0;render();return}
 const pager=e.target.closest('[data-collection-page]');
 if(pager){state.collectionPage=Number(pager.dataset.collectionPage)||0;render();$('page')?.scrollIntoView({behavior:'smooth',block:'start'});return}
 const sellCopy=e.target.closest('[data-sell-copy]');
 if(sellCopy){
  if(!state.user){openAuth();return}
  const copy=state.cards.find(c=>c.id===sellCopy.dataset.sellCopy);
  if(!copy||copy.locked||copy.reserved_trade_id){toast('Exemplaire indisponible pour la vente.',true);return}
  state.saleSelectionCard=copy.id;
  change('market');
  return;
 }
 const lock=e.target.closest('[data-lock]');if(lock){toggleLock(lock.dataset.lock,lock.dataset.next==='true');return}
 const series=e.target.closest('[data-series]');if(series){openSeriesDetail(series.dataset.series);return}
 const wish=e.target.closest('[data-wish]');if(wish){toggleWishlist(Number(wish.dataset.wish));return}
 if(e.target.closest('#catalogSearch')){clearTimeout(searchTimer);state.catalogQuery=$('catalogQuery')?.value||'';loadCatalog(true);return}
 if(e.target.closest('#catalogReset')){
  clearTimeout(searchTimer);state.catalogQuery='';state.catalogRarity='';state.catalogGenre='';state.catalogDecade='';state.catalogSort='name';
  loadCatalog(true);return;
 }
 if(e.target.closest('#catalogMore')){loadCatalog(false);return}
 if(e.target.closest('#fusionAuto')){state.fusionSelected=state.cards.filter(c=>c.rarity===state.fusionRank&&(!c.series?.rarity||c.rarity===c.series.rarity)&&c.series?.fr_verified===true&&!c.locked&&!c.reserved_trade_id&&!(state.marketActivity||[]).some(l=>l.card_id===c.id&&l.status==='active')).slice(0,10).map(c=>c.id);render();return}
 if(e.target.closest('#fusionSubmit')){doFusion();return}
 if(e.target.closest('#usernameSave')){saveUsername();return}
 if(e.target.closest('#signout')){supa.auth.signOut().then(()=>loadSession());return}
 if(e.target.closest('#exportData')){exportData();return}
 const ch=e.target.closest('[data-challenge]');if(ch){chooseChallenge(ch.dataset.challenge);return}
 if(e.target.closest('[data-clear-genre]')){state.genre='';state.collectionPage=0;render();return}
 const album=e.target.closest('[data-album]');if(album){state.filter='';state.rank='';state.collectionMode='unique';state.collectionPage=0;state.genre=album.dataset.album;change('collection');return}
}
async function saveUsername(){
 const name=$('usernameInput')?.value.trim();if(!state.user||!name||name.length<3||name.length>24){toast('Pseudonyme entre 3 et 24 caractères.',true);return}
 const bio=($('bioInput')?.value||'').trim(),favoriteGenre=$('favoriteGenre')?.value||'';
 if(bio.length>160||favoriteGenre.length>32){toast('Biographie trop longue.',true);return}
 let {error}=await supa.from('profiles').upsert({id:state.user.id,username:name,bio,favorite_genre:favoriteGenre},{onConflict:'id'});
 if(error&&(/bio|favorite_genre|schema cache|column/i.test(error.message))){const fallback=await supa.from('profiles').upsert({id:state.user.id,username:name},{onConflict:'id'});if(!fallback.error){toast('Pseudonyme sauvegardé. Active la migration V4 pour enregistrer la biographie.');state.username=name;render();return}error=fallback.error}
 if(error){toast(error.code==='23505'?'Ce pseudonyme est déjà utilisé.':error.message,true);return}
 state.username=name;state.bio=bio;state.favoriteGenre=favoriteGenre;render();toast('Profil enregistré et visible dans Le Signal.')
}
function globalChange(e){
 const facet={catalogRarity:'catalogRarity',catalogGenre:'catalogGenre',catalogDecade:'catalogDecade',catalogSort:'catalogSort'}[e.target.id];
 if(facet){state[facet]=e.target.value;clearTimeout(searchTimer);loadCatalog(true);return}
 if(e.target.id==='actorOnlyClub'){state.actorOnlyClub=e.target.checked;render();return}
 if(e.target.id==='marketRarity'){state.marketRarity=e.target.value;render();return}
 if(e.target.id==='rarityFilter'){state.rank=e.target.value;state.collectionPage=0;render();return}
 if(e.target.id==='collectionSort'){state.collectionSort=e.target.value;state.collectionPage=0;render();return}
 if(e.target.id==='fusionRank'){state.fusionRank=e.target.value;state.fusionSelected=[];render();return}
 if(e.target.matches('[data-fuse]')){const id=e.target.dataset.fuse;if(e.target.checked){if(state.fusionSelected.length===10){e.target.checked=false;return}state.fusionSelected.push(id)}else state.fusionSelected=state.fusionSelected.filter(x=>x!==id);render();return}
 if(e.target.id==='reduceMotion'){state.reduceMotion=e.target.checked;localStorage.setItem('sc-reduced-motion',state.reduceMotion?'yes':'no');render()}
}
document.addEventListener('click',globalClick);
document.addEventListener('change',globalChange);
document.addEventListener('input',e=>{
 if(e.target.id==='collectionSearch'){state.filter=e.target.value;state.collectionPage=0;const position=e.target.selectionStart;render();const input=$('collectionSearch');input?.focus();input?.setSelectionRange(position,position)}
 if(e.target.id==='catalogQuery'){
  state.catalogQuery=e.target.value;
  clearTimeout(searchTimer);
  searchTimer=setTimeout(()=>{if(state.route==='catalog'&&state.catalogMode==='series')loadCatalog(true)},420);
 }
 if(e.target.id==='actorSearchQuery')state.actorQuery=e.target.value;
 if(e.target.id==='marketSearch'||e.target.id==='peopleSearch'){
  const type=e.target.id==='marketSearch'?'marketQuery':'peopleFilter';state[type]=e.target.value;
  const pos=e.target.selectionStart;render();const input=$(e.target.id);input?.focus();input?.setSelectionRange(pos,pos);
 }
});
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'){
  if(document.body.classList.contains('drawer-open')){document.body.classList.remove('drawer-open');$('menuToggle')?.setAttribute('aria-expanded','false')}
  else closeModal();
 }
 if(e.key==='Enter'&&e.target.id==='catalogQuery'){clearTimeout(searchTimer);loadCatalog(true)}
 if(e.key==='Enter'&&e.target.id==='actorSearchQuery')searchCatalogueActors();
 if(e.key==='/'&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&
    !['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)&&
    $('overlay')?.classList.contains('hidden')){
  e.preventDefault();if(state.route!=='catalog')change('catalog');
  $('catalogQuery')?.focus({preventScroll:true});
 }
});
$('overlay').addEventListener('click',e=>{if(e.target===$('overlay'))closeModal()});
supa.auth.onAuthStateChange(()=>setTimeout(loadSession,75));
state.route=safeRoute();render();loadSession();if(['catalog','games'].includes(state.route))loadCatalog(true);if(state.route==='rankings')loadRankings();loadSeasonShows();
clockTimer=setInterval(()=>{if(state.stock&&state.stock.stock<10){if(state.stock.recharge_seconds>0)state.stock.recharge_seconds-=1;else{state.stock.stock=Math.min(10,state.stock.stock+1);state.stock.recharge_seconds=state.stock.stock===10?0:600}
 const t=$('packTimer');if(t)t.textContent=state.stock.stock===10?'Réserve pleine':'Prochain paquet dans '+timecode(state.stock.recharge_seconds)}},1000);
