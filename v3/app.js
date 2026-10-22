import{createClient}from'https://esm.sh/@supabase/supabase-js@2';
import{storePage}from'../v10/store.js?v=10.0.0';
import{updatePixelClues}from'../v10/pixel-canvas.js?v=10.0.1';
import{quizQuestion,newQuiz,answerQuiz,nextQuiz}from'../v6/games.js?v=10.0.0';
import{openingFrame}from'../v7/booster.js?v=7.0.0';
import{gameModes}from'../v7/arena.js?v=10.0.0';
import{trainingModeStatus,canStartTraining,startTraining}from'../v8/game-limits.js?v=8.0.0';
import{fusionPlan,autoFusion,fusionConfirmation}from'../v6/fusion.js?v=8.0.0';
import{navItems,ranks,esc,photo,money,monthHalloween,timecode,foil,card,packs,collection,catalogue,wishlist,albums,rankings,fusions,profile,games,rules,settings,placeholder}from'./views.js?v=10.0.0';
import{getShowDetails,getPersonFilmography,searchPeople,showDetailHTML,actorDetailHTML,frenchSynopsisHTML,stripSummary}from'../v4/series.js?v=6.1.0';
import{getFrenchSynopsis}from'../v4/synopsis-fr.js?v=5.1.0';
import{getFrenchOffersByShow,renderFranceAvailability}from'../v5/fr-watch.js?v=6.1.0';
import{getFrenchCastByShow}from'../v5/cast-fr.js?v=6.1.0';
import{partitionFrenchInventory}from'../v5/fr-collection.js?v=5.5.0';
import{marketPage,communityPage,questsPage,tradeDialog}from'../v4/club.js?v=5.6.1';
import{personalAlbumsPage,albumDialog}from'../v4/albums.js?v=10.0.0';
import{collectionStudio,collectionCSV}from'../v5/collection.js?v=5.6.1';
const supa=createClient('https://anjfidksqbqlaggttdop.supabase.co','sb_publishable_wPFasufNG20maU1rokgPLA_7nyagxY3');
function readQuizRecords(){
 try{
  const stored=JSON.parse(localStorage.getItem('sc-quiz-records-v6')||'{}');
  return Object.fromEntries(['poster','pixel','timeline','year'].map(k=>
   [k,Number.isInteger(stored[k])&&stored[k]>=0&&stored[k]<=5?stored[k]:0]));
 }catch{return {poster:0,pixel:0,timeline:0,year:0}}
}
const $=id=>document.getElementById(id);
function savedTheme(){try{return localStorage.getItem('sc10-theme')==='day'?'day':'night'}catch{return 'night'}}
function chooseTheme(next){
 state.theme=next==='day'?'day':'night';
 document.documentElement.dataset.theme=state.theme;
 try{localStorage.setItem('sc10-theme',state.theme)}catch{/* stockage facultatif */}
 render();
}
const TRAINING_KEY='sc8-quiz-cooldowns';
const PIXEL_REPAIR_KEY='sc8.1-pixel-visibility-restored';
function readTrainingStarts(){
 try{
  const value=JSON.parse(localStorage.getItem(TRAINING_KEY)||'{}');
  const starts=value&&typeof value==='object'?value:{};
  // Le jeu Pixels V8 consommait une tentative sans jamais afficher l'image.
  // Rendre UNE fois cette tentative d'entraînement lors du correctif V8.1.
  // Les autres jeux et les quotas à crédits sur Supabase sont inchangés.
  if(!localStorage.getItem(PIXEL_REPAIR_KEY)){
   if(starts.pixel!==undefined){
    delete starts.pixel;
    localStorage.setItem(TRAINING_KEY,JSON.stringify(starts));
   }
   localStorage.setItem(PIXEL_REPAIR_KEY,'yes');
  }
  return starts;
 }catch{return {}}
}
function offlineChallengeStatus(){return {enabled:false,modes:trainingModeStatus(readTrainingStarts())}}

const routes={paquets:'packs',packs:'packs',collection:'collection',catalogue:'catalog',catalog:'catalog',albums:'albums',classement:'rankings',rankings:'rankings',fusions:'fusion',fusion:'fusion',jeux:'games',games:'games',souhaits:'wishlist',wishlist:'wishlist',communaute:'community',community:'community',marche:'market',market:'market',profil:'profile',profile:'profile',parametres:'settings',settings:'settings',premium:'store',boutique:'store',store:'store',regles:'rules',rules:'rules',premiere:'premiere',parrainage:'referral',referral:'referral',missions:'quests',quetes:'quests',quests:'quests'};
const slug={packs:'paquets',catalog:'catalogue',rankings:'classement',games:'jeux',fusion:'fusions',wishlist:'souhaits',community:'communaute',market:'marche',profile:'profil',settings:'parametres',rules:'regles',referral:'parrainage',quests:'missions',store:'premium'};
const state={route:'packs',user:null,username:'',cards:[],excludedCardsCount:0,excludedWishesCount:0,frMigrationError:'',wallet:null,stock:null,wishes:[],seasonShows:[],marketListings:[],marketActivity:[],tradeOffers:[],marketError:'',marketQuery:'',marketRarity:'',players:[],peopleFilter:'',peopleError:'',dailyError:'',personalAlbums:[],publicAlbums:[],albumError:'',officialSeasons:null,officialSeasonError:'',bio:'',favoriteGenre:'',avatarSeriesId:null,bannerSeriesId:null,theme:savedTheme(),daily:null,catalog:[],catalogMode:'series',actorQuery:'',actorMatches:[],actorSelected:null,actorShows:[],actorCatalogueIds:[],actorOnlyClub:false,actorLoading:false,actorError:'',catalogQuery:'',catalogRarity:'',catalogGenre:'',catalogDecade:'',catalogSort:'name',catalogPage:0,catalogTotal:null,catalogMore:true,catalogLoading:false,catalogError:'',rankings:[],collectionMode:'all',collectionSort:'rarity',collectionPage:0,collectionEligibleTotal:null,saleSelectionCard:null,pack:monthHalloween()?'halloween':'classic',filter:'',rank:'',genre:'',fusionRank:'Commune',fusionSelected:[],fusionProtectLast:true,fusionPage:0,quiz:null,pixelPreview:null,quizLoading:false,quizError:'',rewardStatus:null,rewardQuiz:null,rewardFeedback:null,rewardBusy:false,rewardError:'',quizRecords:readQuizRecords(),reduceMotion:localStorage.getItem('sc-reduced-motion')==='yes',busy:false};
const navName=key=>navItems.find(x=>x[0]===key)?.[2]||'Règles du jeu';
let openingCards=null,openingStep=0;
let toastTimer,clockTimer,searchTimer,catalogRequestId=0,quizRequestId=0,refreshing=false,detailRequestId=0,actorSearchRequestId=0,lastShowForBack=null,personReturnToShow=false;
function toast(msg,error=false){const el=$('toast');el.textContent=msg;el.classList.toggle('error',error);el.classList.remove('hidden');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.add('hidden'),5200)}
function safeRoute(){return routes[decodeURIComponent(location.hash.replace(/^#\/?/,'').split('?')[0])||'paquets']||'packs'}
function loadRouteData(route){
 if(route==='catalog'&&state.catalogMode==='series'&&!state.catalog.length)loadCatalog(true);
 if(route==='rankings')loadRankings();
 if(route==='collection'){loadCollectionGoal();if(state.user)loadMySales()}
 if(route==='market'&&state.user)loadMarket();
 if(route==='community'&&state.user)loadPeople();
 if(route==='quests'&&state.user)loadDaily();
 if(route==='albums'&&state.user)loadAlbums();
 if(route==='profile'&&state.user)loadOfficialSeasons();
 if(route==='games')loadRewardStatus();
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
 $('sidebar').innerHTML='<a class="logo" href="#/paquets" data-route="packs"><span class="logo-mark">S</span><span>SÉRIE<strong>CLUB</strong><em> TCG</em></span></a><nav class="side-links" aria-label="Menu principal">'+nav+'</nav>'+(monthHalloween()?'<div class="side-note"><b>✦ NUITS D’OCTOBRE</b>Édition Halloween disponible en octobre, chaque année.</div>':'')+'<div class="side-account" data-route="profile"><div class="avatar sc10-directory-avatar"'+
 (state.avatarSeriesId&&state.cards.some(c=>String(c.series_id)===String(state.avatarSeriesId))?
  ' style="background-image:url(&quot;'+photo(state.cards.find(c=>String(c.series_id)===String(state.avatarSeriesId)).series.image_url)+'&quot;)"':'')+'>'+
 (state.avatarSeriesId&&state.cards.some(c=>String(c.series_id)===String(state.avatarSeriesId))?'':esc((state.username||'S').slice(0,1).toUpperCase()))+'</div><div><b>'+esc(state.username||'Mon compte')+'</b><small>'+money(state.cards.length)+' cartes dans ma collection</small></div></div>';
 $('topbar').innerHTML='<div class="row"><button class="top-btn mobile-menu" id="menuToggle" aria-label="Ouvrir le menu" aria-expanded="false">☰</button><span class="crumb">'+esc(navName(state.route)).toUpperCase()+'</span></div><div class="top-actions"><button class="top-btn hide-mobile" id="topSearch" aria-label="Rechercher une série">⌕ Rechercher</button><button class="sc10-theme-toggle" data-theme-toggle title="Changer le thème" aria-label="Basculer entre jour et nuit">'+(state.theme==='day'?'☀ Jour':'☾ Nuit')+'</button><button class="top-btn sc4-bell" data-route="market" aria-label="Offres d’échange reçues">✧'+(pending?'<span class="sc4-bell-number">'+pending+'</span>':'')+'</button><button class="top-btn hide-mobile" data-route="rules">Règles du jeu</button><span class="credit-pill">Ⓒ &nbsp;'+money(state.wallet?.credits)+'<span>crédits</span></span><button class="top-btn" data-auth>'+(state.user?'Mon compte':'Connexion')+'</button><button class="top-btn hide-mobile" id="motionToggle" title="Animations">◐</button><span class="top-btn" aria-label="Langue : français">🇫🇷 FR</span></div>';
 if(monthHalloween()){
  $('topbar').querySelector('.crumb')?.insertAdjacentHTML('afterend','<span class="top-season-tag hide-mobile">☾ LES NUITS D’OCTOBRE</span>');
 }
 const mobile=[['packs','▤','Paquets'],['collection','▣','Collection'],['catalog','⌕','Catalogue'],['wishlist','☆','Souhaits']];
 const bottom=$('mobileNav');
 if(bottom)bottom.innerHTML=mobile.map(([route,icon,label])=>
   '<button type="button" data-route="'+route+'" class="sc59-mobile-link'+(state.route===route?' active':'')+'" aria-current="'+(state.route===route?'page':'false')+'" aria-label="'+label+'"><span aria-hidden="true">'+icon+'</span><small>'+label+'</small></button>').join('');
}
function render(){
 document.documentElement.dataset.theme=state.theme;
 const focused=document.activeElement;
 const restoreCatalog=state.route==='catalog'&&focused?.id==='catalogQuery';
 const cursor=restoreCatalog?focused.selectionStart:null;
 document.body.classList.toggle('reduce-motion',state.reduceMotion);
 document.body.classList.toggle('season-halloween',monthHalloween());
 renderChrome();
 const view={store:storePage,packs,collection:collectionStudio,catalog:catalogue,wishlist,albums:personalAlbumsPage,rankings,fusion:fusions,profile,games,rules,settings,market:marketPage,community:communityPage,quests:questsPage}[state.route];
 $('page').innerHTML=(view?view(state):placeholder(state.route))+'<footer class="app-footer">SÉRIECLUB TCG · Données de séries : TVmaze · Visuels : ayants droit respectifs · Projet indépendant</footer>';
 updatePixelClues($('page'));
 document.title=navName(state.route)+' — SérieClub TCG';
 if(restoreCatalog){const input=$('catalogQuery');if(input){input.focus({preventScroll:true});if(cursor!==null)input.setSelectionRange(cursor,cursor)}}
}
async function ensureProfile(user){
 let {data,error}=await supa.from('profiles').select('username,bio,favorite_genre,avatar_series_id,banner_series_id').eq('id',user.id).maybeSingle();
 if(error){const fallback=await supa.from('profiles').select('username,bio,favorite_genre').eq('id',user.id).maybeSingle();if(!fallback.error){data=fallback.data;error=null}}
 if(error){toast('Profil indisponible : '+error.message,true);return}
 if(data?.username){state.username=data.username;state.bio=data.bio||'';state.favoriteGenre=data.favorite_genre||'';state.avatarSeriesId=data.avatar_series_id??null;state.bannerSeriesId=data.banner_series_id??null;return}
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
  if(!user){state.rewardStatus={enabled:false};state.rewardQuiz=null;state.rewardFeedback=null;state.username='';state.bio='';state.favoriteGenre='';state.avatarSeriesId=null;state.bannerSeriesId=null;state.officialSeasons=null;state.cards=[];state.excludedCardsCount=0;state.excludedWishesCount=0;state.frMigrationError='';state.wallet=null;state.wishes=[];state.stock=null;state.marketListings=[];state.marketActivity=[];state.tradeOffers=[];state.players=[];state.personalAlbums=[];state.publicAlbums=[];state.collectionEligibleTotal=null;state.saleSelectionCard=null;state.daily=null;render();return}
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
   'Collection momentanément indisponible.':'';
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
  if(state.route==='games')loadRewardStatus();
  if(state.route==='market')loadMarket();
  if(state.route==='collection'){loadCollectionGoal();loadMySales()}
  if(state.route==='community')loadPeople();
  if(state.route==='albums')loadAlbums();
 if(state.route==='profile')loadOfficialSeasons();
 }catch(e){console.error('Session:',e);toast('Connexion au serveur momentanément indisponible.',true)}
 finally{refreshing=false}
}
async function loadOfficialSeasons(){
 if(!state.user){state.officialSeasons=null;state.officialSeasonError='';return}
 const {data,error}=await supa.rpc('my_official_seasons');
 state.officialSeasons=error?null:data||[];
 state.officialSeasonError=error?'Les récompenses officielles attendent leur activation sur Supabase.':'';
 if(['albums','profile'].includes(state.route))render();
}
async function claimOfficialSeason(id){
 if(!state.user){openAuth();return}
 if(state.busy)return;
 state.busy=true;
 try{
  const {data,error}=await supa.rpc('claim_official_season',{p_season_id:id});
  if(error)throw error;
  toast('Saison terminée ! Badge gagné et +'+Number(data||0)+' crédits.');
  await loadSession();await loadOfficialSeasons();
 }catch(e){toast('Saison : '+e.message,true)}
 finally{state.busy=false}
}
async function loadAlbums(){
 if(!state.user){state.personalAlbums=[];state.publicAlbums=[];if(state.route==='albums')render();return}
 const [own,shared,official]=await Promise.all([
  supa.rpc('my_personal_albums'),supa.rpc('public_personal_albums'),supa.rpc('my_official_seasons')
 ]);
 const errors=[own,shared].filter(v=>v.error).map(v=>v.error.message);
 state.albumError=errors.length?'Active la migration SQL V4 des albums : '+errors[0]:'';
 state.personalAlbums=own.data||[];state.publicAlbums=shared.data||[];
 state.officialSeasons=official.error?null:official.data||[];
 state.officialSeasonError=official.error?'Activer la migration SQL V10 des saisons officielles.':'';
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
 const [directory,visuals]=await Promise.all([
  supa.rpc('player_directory'),supa.rpc('public_profile_art')
 ]);
 const {data,error}=directory;
 const art=new Map((visuals.error?[]:visuals.data||[]).map(x=>[String(x.player_id),x]));
 state.players=(data||[]).map(p=>({...p,...art.get(String(p.player_id))}));
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
   ?'Catalogue momentanément indisponible.'
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
 root.innerHTML='<div class="dialog sc5-dialog sc5-loading" role="dialog" aria-modal="true" aria-label="Chargement de la fiche"><button class="close" data-close aria-label="Fermer">×</button><div class="sc5-loader-icon">✧</div><h2>'+esc(label)+'</h2></div>';
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
 const initial=findLocalShow(numeric)||{};
 showDetailLoading('Chargement de la série…');
 const remote=getShowDetails(numeric).catch(()=>null);
 // Re-read the authoritative France verification on every modal open.
 const canonical=supa.from('series')
  .select('id,name,image_url,premiered,genres,rarity,rarity_source,fr_verified,fr_verification_method,fr_evidence_url')
  .eq('id',numeric).maybeSingle();
 const france=getFrenchOffersByShow(numeric).catch(()=>null);
 const casting=getFrenchCastByShow(numeric).catch(()=>null);
 // Un échec du service distant ne doit jamais bloquer l'affichage local.
 let base=initial,providers=null,backup=null;
 try{
  const [proof,watch,actors]=await Promise.all([canonical,france,casting]);
  if(!detailReady(token))return;
  if(!proof.error&&proof.data)base={...base,...proof.data};
  providers=watch;backup=actors;
 }catch(error){
  // Une fiche déjà connue peut être affichée même si un fournisseur ne répond pas.
 }
 let loaded=null;
 try{
  loaded=await Promise.race([remote,new Promise(resolve=>setTimeout(()=>resolve(null),450))]);
 }catch{/* La fiche de base reste accessible. */}
 if(!detailReady(token))return;
 if(!loaded&&!base.name)loaded=await remote;
 if(!detailReady(token))return;
 if(!loaded&&!base.name){
  $('overlay').innerHTML='<div class="dialog sc5-loading" role="dialog" aria-modal="true"><button class="close" data-close aria-label="Fermer">×</button><h2>Série indisponible</h2><p>Réessaie dans quelques instants.</p></div>';
  return;
 }
 const show=loaded||base;
 $('overlay').innerHTML=showDetailHTML(loaded||{},base,{source:'loading'},backup);
 $('overlay').querySelector('[data-close]')?.focus();
 const currentWatch=$('overlay').querySelector('[data-fr-watch]');
 if(currentWatch)currentWatch.innerHTML=renderFranceAvailability(providers,{...show,...base});
 const synopsisInput=stripSummary(show.summary||base.summary);
 getFrenchSynopsis(show,synopsisInput).then(result=>{
  if(!detailReady(token))return;
  const target=$('overlay').querySelector('[data-synopsis]');
  if(target)target.innerHTML=frenchSynopsisHTML(result,show.summary||base.summary);
 }).catch(()=>{
  if(!detailReady(token))return;
  const target=$('overlay').querySelector('[data-synopsis]');
  if(target)target.innerHTML=frenchSynopsisHTML({source:'unavailable',text:''},show.summary||base.summary);
 });
 // TVmaze est facultatif : améliorer le casting seulement si ses crédits arrivent.
 if(!loaded){
  remote.then(details=>{
   if(!detailReady(token)||!details)return;
   const existing=$('overlay').querySelector('[data-cast-section]');
   const template=document.createElement('div');
   template.innerHTML=showDetailHTML(details,base,{source:'loading'},backup);
   const improved=template.querySelector('[data-cast-section]');
   if(existing&&improved&&!improved.hidden&&details._embedded?.cast?.length)
    existing.replaceWith(improved);
   const detailHead=$('overlay').querySelector('.sc5-show-head');
   const improvedHead=template.querySelector('.sc5-show-head');
   if(detailHead&&improvedHead){
    // Les informations diffusées en France restent intactes.
    const oldTag=detailHead.querySelector('.sc5-tagline');
    const newTag=improvedHead.querySelector('.sc5-tagline');
    if(oldTag&&newTag)oldTag.replaceWith(newTag);
   }
  }).catch(()=>{});
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
  $('overlay').innerHTML='<div class="dialog sc5-loading"><button class="close" data-close aria-label="Fermer">×</button><h2>Filmographie indisponible</h2><p>Réessaie dans quelques instants.</p><button class="btn subtle" data-person-back>Retour</button></div>';
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
 openingCards=data;openingStep=0;
 const overlay=$('overlay');overlay.classList.remove('hidden');
 updateOpening();
}
function updateOpening(){
 if(!openingCards)return;
 const reduced=state.reduceMotion||window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const overlay=$('overlay');
 overlay.innerHTML='<div class="dialog opening-dialog" role="dialog" aria-modal="true" aria-label="Cartes du paquet">'+
  '<button class="close" data-close aria-label="Fermer">×</button>'+
  openingFrame(openingCards,openingStep,reduced)+'</div>';
 overlay.querySelector('#openingNext,#openingDone')?.focus({preventScroll:true});
}
function advanceOpening(skip=false){
 if(!openingCards)return;
 openingStep=skip?openingCards.length+1:Math.min(openingCards.length+1,openingStep+1);
 updateOpening();
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
function activeFusionPlan(){
 return fusionPlan(state.cards,state.fusionRank,state.fusionSelected,state.marketActivity,
  state.fusionProtectLast);
}
function previewFusion(){
 if(!state.user){openAuth();return}
 const plan=activeFusionPlan();
 const summary=fusionConfirmation(plan);
 if(!summary){toast('Sélectionne exactement dix cartes admissibles.',true);return}
 const lines=plan.selectedCards.map(c=>'<li>'+esc(c.series?.name||'Série')+
  (c.isLast?' <strong>· dernier exemplaire</strong>':' · doublon')+'</li>').join('');
 const root=$('overlay');root.classList.remove('hidden');
 root.innerHTML='<div class="dialog sc60-confirm" role="dialog" aria-modal="true" aria-labelledby="sc60-confirm-title">'+
  '<button class="close" data-close aria-label="Fermer">×</button><span class="caps">VÉRIFICATION AVANT FUSION</span>'+
  '<h2 id="sc60-confirm-title">'+esc(summary.source)+' → '+esc(summary.target)+'</h2>'+
  '<p>Les dix cartes suivantes seront <strong>définitivement supprimées</strong>. Tu recevras une carte aléatoire du rang supérieur parmi les séries certifiées France.</p>'+
  '<ol>'+lines+'</ol>'+
  (summary.lastCount?'<p class="sc60-danger">Attention : '+summary.lastCount+' dernier(s) exemplaire(s) de série seront perdus.</p>':'<p class="sc60-safe">✓ Tes derniers exemplaires sont préservés.</p>')+
  '<div class="row"><button class="btn subtle" data-close>Annuler</button>'+
  '<button class="btn primary" id="fusionConfirm">Confirmer la fusion définitive</button></div></div>';
 root.querySelector('#fusionConfirm')?.focus();
}
function showFusionSuccess(result,rank){
 const root=$('overlay');
 root.classList.remove('hidden');
 const name=String(result?.name||'Nouvelle carte');
 const img=photo(result?.image_url);
 root.innerHTML='<div class="dialog sc60-fusion-win" role="dialog" aria-modal="true" aria-label="Fusion réussie">'+
  '<div class="sc60-medal">✦</div><span class="caps">FUSION RÉUSSIE · +100 XP</span>'+
  '<h2>Une nouvelle carte !</h2>'+
  (img?'<img src="'+img+'" alt="Affiche de '+esc(name)+'" loading="lazy">':'')+
  '<h3>'+esc(name)+'</h3><span class="sc60-win-rank">'+esc(String(result?.rarity||rank))+'</span>'+
  '<p>Ta nouvelle carte est enregistrée dans ta collection.</p>'+
  '<button class="btn primary" id="fusionResultDone">Voir ma collection →</button></div>';
 root.querySelector('#fusionResultDone')?.focus();
}
async function doFusion(){
 if(!state.user){openAuth();return}
 if(state.busy)return;
 const plan=activeFusionPlan();
 if(!plan.ready){closeModal();toast('La sélection a changé : fusion annulée.',true);return}
 const ids=[...plan.selected];
 state.busy=true;
 const btn=$('fusionConfirm');if(btn){btn.disabled=true;btn.textContent='Fusion en cours…'}
 try{
  const {data,error}=await supa.rpc('fuse_cards',{p_card_ids:ids});
  if(error)throw error;
  closeModal();
  state.fusionSelected=[];
  state.fusionPage=0;
  await loadSession();
  showFusionSuccess(data?.[0],plan.target);
 }catch(e){
  closeModal();toast('Fusion impossible : '+e.message,true);
 }finally{state.busy=false;if(state.route==='fusion')render()}
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
function closeModal(){detailRequestId++;openingCards=null;openingStep=0;const root=$('overlay');root.classList.add('hidden');root.replaceChildren()}
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
async function loadRewardStatus(){
 if(!state.user){state.rewardStatus=offlineChallengeStatus();if(state.route==='games')render();return}
 try{
  const {data,error}=await supa.rpc('rewarded_quiz_status');
  state.rewardStatus=error?offlineChallengeStatus():data?.limit_per_mode_hours===24?data:
    data?.enabled===true?{...data,legacy:true,modes:trainingModeStatus(readTrainingStarts())}:offlineChallengeStatus();
 }catch{state.rewardStatus=offlineChallengeStatus()}
 if(state.route==='games')render();
}
async function startRewardedChallenge(type){
 if(!state.user){openAuth();return}
 if(state.rewardBusy)return;
 state.rewardBusy=true;state.rewardError='';state.rewardQuiz=null;
 state.rewardFeedback=null;state.quiz=null;render();
 try{
  const {data,error}=await supa.rpc('start_rewarded_quiz',{p_mode:type});
  if(error)throw error;
  if(data?.status==='limit'||data?.status==='signin'){
   state.rewardError=data.message||'Plus de parties récompensées aujourd’hui.';
  }else if(data?.status==='active'){
   state.rewardQuiz=data;
   if(state.rewardStatus?.legacy&&!data.resumed){
    const updated=startTraining(readTrainingStarts(),data.mode);
    if(updated){try{localStorage.setItem(TRAINING_KEY,JSON.stringify(updated))}catch{/* stockage facultatif */}}
    state.rewardStatus={...state.rewardStatus,modes:trainingModeStatus(readTrainingStarts())};
   }
  }else{
   state.rewardError='Impossible de commencer ce défi. Réessaie.';
  }
 }catch(error){
  state.rewardError=/PGRST202|function.*not found/i.test(error.message)
   ?'Les récompenses arrivent bientôt. Essaie les défis libres.':
    'Impossible de commencer : '+error.message;
 }finally{
  state.rewardBusy=false;
  if(state.route==='games')render();
 }
}
async function answerRewardedChallenge(id){
 if(!state.rewardQuiz||state.rewardBusy||state.rewardFeedback)return;
 if(!state.rewardQuiz.question?.options?.some(x=>Number(x.id)===Number(id)))return;
 const previous=state.rewardQuiz;
 state.rewardBusy=true;render();
 try{
  const {data,error}=await supa.rpc('submit_rewarded_quiz_answer',{
   p_session:previous.session_id,p_choice:Number(id)
  });
  if(error)throw error;
  if(data?.status==='expired'){
   state.rewardQuiz=null;state.rewardError='Partie expirée. Essaie un nouveau défi.';
   loadRewardStatus();
  }else if(data?.status==='active'||data?.status==='completed'){
   state.rewardQuiz=data.status==='completed'
     ?{...previous,finished:true,score:data.score,credits_earned:data.credits_earned}
     :data;
   state.rewardFeedback={
    previous,answer:Number(id),correct_answer:data.correct_answer,
    correct:data.correct,earned:data.earned,completed:data.status==='completed'
   };
   if(data.status==='completed')loadRewardStatus();
  }else{state.rewardError='Partie indisponible. Réessaie.'}
 }catch(error){
  state.rewardError='Réponse non enregistrée. Réessaie.';
 }finally{state.rewardBusy=false;if(state.route==='games')render()}
}
function nextRewardedQuestion(){
 if(!state.rewardFeedback)return;
 const completed=state.rewardFeedback.completed;
 state.rewardFeedback=null;
 if(completed){
  if(state.user)loadSession();
 }
 if(state.route==='games')render();
}
async function openPixelPreview(){
 // Aucun démarrage de jeu : lecture seule du catalogue certifié France.
 // Ni start_rewarded_quiz, ni localStorage de quota, ni crédits.
 if(state.quiz||state.rewardQuiz){
  toast('Termine ou quitte le défi en cours avant de tester le rendu.',true);
  return;
 }
 state.pixelPreview={items:[],index:0,round:3,revealed:false,loading:true,error:''};
 if(state.route==='games')render();
 try{
  const owned=state.cards.map(c=>c.series).filter(x=>x?.image_url&&/^https:\/\//.test(x.image_url));
  const listed=state.catalog.filter(x=>x?.image_url&&/^https:\/\//.test(x.image_url));
  const {data,error}=await supa.from('series')
    .select('id,name,image_url').eq('fr_verified',true)
    .neq('rarity_source','pending').not('image_url','is',null)
    .order('id',{ascending:false}).limit(50);
  // Un fournisseur temporairement indisponible ne doit pas effacer
  // les affiches déjà possédées ou présentes dans le catalogue.
  const mixed=[...owned,...listed,...(error?[]:(data||[]))]
    .filter(x=>x?.id&&x?.name&&/^https:\/\//.test(x.image_url||''));
  const ids=new Set();
  const items=mixed.filter(x=>{
   if(ids.has(String(x.id)))return false;
   ids.add(String(x.id));return true;
  });
  if(!items.length)throw Error(error?.message||'Aucune affiche française disponible.');
  // Réorganiser les exemples pour ne pas toujours montrer la même affiche.
  for(let i=items.length-1;i>0;i--){
   const j=Math.floor(Math.random()*(i+1));
   [items[i],items[j]]=[items[j],items[i]];
  }
  if(!state.pixelPreview)return;
  state.pixelPreview={items,index:0,round:3,revealed:false,loading:false,error:''};
 }catch(e){
  if(!state.pixelPreview)return;
  state.pixelPreview={...state.pixelPreview,loading:false,error:'Aperçu indisponible : '+e.message};
 }
 if(state.route==='games')render();
}
function changePixelPreviewRound(round){
 if(!state.pixelPreview)return;
 const n=Number(round);
 if(!Number.isInteger(n)||n<1||n>5)return;
 state.pixelPreview={...state.pixelPreview,round:n,revealed:false,error:''};
 render();
}
function advancePixelPreview(){
 const preview=state.pixelPreview;
 if(!preview?.items?.length)return openPixelPreview();
 state.pixelPreview={...preview,index:(preview.index+1)%preview.items.length,revealed:false,error:''};
 render();
}
async function chooseChallenge(type){
 if(!gameModes.includes(type)||state.quizLoading||state.rewardBusy)return;
 if(state.rewardStatus?.enabled===true&&state.rewardStatus?.limit_per_mode_hours===24){await startRewardedChallenge(type);return}
 const starts=readTrainingStarts();
 if(state.rewardStatus?.enabled===true){
  if(!canStartTraining(starts,type)){state.rewardError='Ce défi a déjà été joué sur cet appareil. Reviens dans 24 heures.';render();return}
  await startRewardedChallenge(type);return;
 }
 if(!canStartTraining(starts,type)){
  state.quizError='Ce défi a déjà été joué. Il sera disponible 24 heures après le début de la dernière partie.';
  if(state.route==='games')render();return;
 }
 const request=++quizRequestId;
 state.quizLoading=true;state.quizError='';state.quiz=null;render();
 try{
  // Le jeu ne reprend plus uniquement les 36 premiers titres du catalogue :
  // on choisit un échantillon aléatoire des séries réellement certifiées FR.
  const base=()=>supa.from('series')
   .select('id,name,image_url,premiered,fr_verified')
   .eq('fr_verified',true).neq('rarity_source','pending')
   .not('image_url','is',null).not('premiered','is',null);
  const countRequest=await supa.from('series').select('id',{count:'exact',head:true})
   .eq('fr_verified',true).neq('rarity_source','pending')
   .not('image_url','is',null).not('premiered','is',null);
  if(countRequest.error)throw countRequest.error;
  const total=countRequest.count||0;
  if(total<4)throw Error('Pas encore assez de séries françaises datées.');
  const start=Math.floor(Math.random()*Math.max(1,total-95));
  const {data,error}=await base().order('id').range(start,start+95);
  if(error)throw error;
  if(request!==quizRequestId)return;
  const session=newQuiz(type,(data||[]).filter(x=>x.fr_verified===true));
  if(!session)throw Error('Les séries disponibles ne permettent pas de préparer ce jeu.');
  state.quiz=session;
  const updated=startTraining(starts,type);
  if(updated){try{localStorage.setItem(TRAINING_KEY,JSON.stringify(updated))}catch{/* quota local de confort uniquement */}}
  state.rewardStatus=offlineChallengeStatus();
 }catch(err){
  if(request!==quizRequestId)return;
  state.quizError='Jeu indisponible : '+err.message;
 }finally{
  if(request===quizRequestId){state.quizLoading=false;if(state.route==='games')render()}
 }
}
function changeQuizClue(){
 // Une affiche distante indisponible ne doit pas faire perdre la tentative.
 // Régénérer uniquement l'indice courant, sans modifier score ni numéro de manche.
 const session=state.quiz;
 if(!session||session.answered||session.finished||!['poster','pixel'].includes(session.type))return;
 const excluded=new Set((session.usedIds||[]).map(String));
 const candidates=session.pool.filter(item=>!excluded.has(String(item.id)));
 const pool=candidates.length>=4?candidates:
  session.pool.filter(item=>String(item.id)!==String(session.question?.target?.id));
 const question=quizQuestion(session.type,pool);
 if(!question){state.quizError='Aucune autre image de série disponible pour ce défi.';render();return}
 state.quiz={...session,question,usedIds:[...excluded,...question.items.map(x=>String(x.id))]};
 state.quizError='';
 render();
}
function selectQuizAnswer(id){
 if(!state.quiz||state.quiz.answered||state.quiz.finished)return;
 state.quiz={...answerQuiz(state.quiz,id),choice:String(id)};
 render();
}
function advanceQuiz(){
 if(!state.quiz?.answered)return;
 state.quiz=nextQuiz(state.quiz);
 if(state.quiz?.finished){
  const mode=state.quiz.type;
  state.quizRecords[mode]=Math.max(state.quizRecords[mode]||0,state.quiz.score);
  try{localStorage.setItem('sc-quiz-records-v6',JSON.stringify(state.quizRecords))}catch{/* Jeu hors stockage local autorisé. */}
 }
 render();
}
function globalClick(e){
 if(e.target.closest('[data-pixel-preview]')){openPixelPreview();return}
 if(e.target.closest('[data-pixel-preview-close]')){state.pixelPreview=null;render();return}
 const stage=e.target.closest('[data-pixel-preview-round]');
 if(stage){changePixelPreviewRound(stage.dataset.pixelPreviewRound);return}
 if(e.target.closest('[data-pixel-preview-reveal]')){
  if(state.pixelPreview){
   state.pixelPreview={...state.pixelPreview,revealed:!state.pixelPreview.revealed};
   render();
  }
  return;
 }
 if(e.target.closest('[data-pixel-preview-next]')){advancePixelPreview();return}
 if(e.target.closest('[data-pixel-preview-refresh]')){openPixelPreview();return}
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

 if(e.target.closest('#topSearch')){change('catalog');$('catalogQuery')?.focus({preventScroll:true});return}
 if(e.target.closest('[data-theme-toggle]')){chooseTheme(state.theme==='day'?'night':'day');return}
 const themeChoice=e.target.closest('[data-theme-choice]');if(themeChoice){chooseTheme(themeChoice.dataset.themeChoice);return}
 const route=e.target.closest('[data-route]');if(route){e.preventDefault();change(route.dataset.route);return}
 if(e.target.closest('#menuToggle')){const opened=document.body.classList.toggle('drawer-open');$('menuToggle')?.setAttribute('aria-expanded',String(opened));return}
 if(e.target.closest('#drawerBackdrop')){document.body.classList.remove('drawer-open');$('menuToggle')?.setAttribute('aria-expanded','false');return}
 if(e.target.closest('[data-auth]')){openAuth();return}
 if(e.target.closest('#authLogin')){authenticate(false);return}
 if(e.target.closest('#authRegister')){authenticate(true);return}
 if(e.target.closest('#authSignout')){supa.auth.signOut().then(()=>{closeModal();loadSession();toast('Compte déconnecté.')});return}
 if(e.target.closest('#motionToggle')){state.reduceMotion=!state.reduceMotion;localStorage.setItem('sc-reduced-motion',state.reduceMotion?'yes':'no');render();return}

 if(e.target.closest('#createAlbum')){createAlbum();return}
 const official=e.target.closest('[data-claim-season]');if(official){claimOfficialSeason(official.dataset.claimSeason);return}
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
 if(e.target.closest('#openingNext')){advanceOpening();return}
 if(e.target.closest('#openingSkip')){advanceOpening(true);return}
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
 const fusionRank=e.target.closest('[data-fusion-rank]');
 if(fusionRank){state.fusionRank=fusionRank.dataset.fusionRank;state.fusionSelected=[];state.fusionPage=0;render();return}
 const pickFusion=e.target.closest('[data-fusion-pick]');
 if(pickFusion){
  const id=String(pickFusion.dataset.fusionPick),plan=activeFusionPlan();
  if(!plan.allowed.some(c=>String(c.id)===id))return;
  if(state.fusionSelected.includes(id))state.fusionSelected=state.fusionSelected.filter(x=>x!==id);
  else if(plan.selected.length<10)state.fusionSelected=[...plan.selected,id];
  else toast('La sélection est limitée à dix cartes.',true);
  render();return;
 }
 const turnFusion=e.target.closest('[data-fusion-page]');
 if(turnFusion){state.fusionPage=Math.max(0,state.fusionPage+Number(turnFusion.dataset.fusionPage));render();return}
 if(e.target.closest('#fusionClear')){state.fusionSelected=[];render();return}
 if(e.target.closest('#fusionAuto')){
  state.fusionSelected=autoFusion(activeFusionPlan());render();
  if(state.fusionSelected.length<10)toast('Il manque '+(10-state.fusionSelected.length)+' cartes disponibles à ce rang.');
  return;
 }
 if(e.target.closest('#fusionSubmit')){previewFusion();return}
 if(e.target.closest('#fusionConfirm')){doFusion();return}
 if(e.target.closest('#fusionResultDone')){closeModal();change('collection');return}
 const answerBtn=e.target.closest('[data-quiz-answer]');
 if(answerBtn){selectQuizAnswer(answerBtn.dataset.quizAnswer);return}
 if(e.target.closest('[data-quiz-next]')){advanceQuiz();return}
 if(e.target.closest('[data-quiz-change-clue]')){changeQuizClue();return}
 const restartQuiz=e.target.closest('[data-quiz-restart]');
 if(restartQuiz){chooseChallenge(restartQuiz.dataset.quizRestart);return}
 if(e.target.closest('[data-quiz-home]')){state.quiz=null;state.quizError='';state.rewardQuiz=null;state.rewardFeedback=null;state.rewardError='';render();return}
 const selectedReward=e.target.closest('[data-reward-answer]');
 if(selectedReward){answerRewardedChallenge(selectedReward.dataset.rewardAnswer);return}
 if(e.target.closest('[data-reward-next]')){nextRewardedQuestion();return}
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
 const avatarValue=$('profileAvatar')?.value||null,bannerValue=$('profileBanner')?.value||null;
 const avatarSeriesId=avatarValue?Number(avatarValue):null,bannerSeriesId=bannerValue?Number(bannerValue):null;
 if(bio.length>160||favoriteGenre.length>32){toast('Biographie trop longue.',true);return}
 let {error}=await supa.from('profiles').upsert({id:state.user.id,username:name,bio,favorite_genre:favoriteGenre,avatar_series_id:avatarSeriesId,banner_series_id:bannerSeriesId},{onConflict:'id'});
 if(error&&(/bio|favorite_genre|avatar_series_id|banner_series_id|schema cache|column/i.test(error.message))){const fallback=await supa.from('profiles').upsert({id:state.user.id,username:name},{onConflict:'id'});if(!fallback.error){toast('Pseudonyme enregistré. La biographie n’a pas pu être sauvegardée.');state.username=name;render();return}error=fallback.error}
 if(error){toast(error.code==='23505'?'Ce pseudonyme est déjà utilisé.':error.message,true);return}
 state.username=name;state.bio=bio;state.favoriteGenre=favoriteGenre;state.avatarSeriesId=avatarSeriesId;state.bannerSeriesId=bannerSeriesId;render();toast('Profil et affiches enregistrés.')
}
function globalChange(e){
 const facet={catalogRarity:'catalogRarity',catalogGenre:'catalogGenre',catalogDecade:'catalogDecade',catalogSort:'catalogSort'}[e.target.id];
 if(facet){state[facet]=e.target.value;clearTimeout(searchTimer);loadCatalog(true);return}
 if(e.target.id==='actorOnlyClub'){state.actorOnlyClub=e.target.checked;render();return}
 if(e.target.id==='marketRarity'){state.marketRarity=e.target.value;render();return}
 if(e.target.id==='rarityFilter'){state.rank=e.target.value;state.collectionPage=0;render();return}
 if(e.target.id==='collectionSort'){state.collectionSort=e.target.value;state.collectionPage=0;render();return}
 if(e.target.id==='fusionRank'){state.fusionRank=e.target.value;state.fusionSelected=[];state.fusionPage=0;render();return}
 if(e.target.id==='fusionProtectLast'){
  state.fusionProtectLast=e.target.checked;
  state.fusionSelected=activeFusionPlan().selected;
  state.fusionPage=0;render();return;
 }
 if(e.target.matches('[data-fuse]')){const id=e.target.dataset.fuse;if(e.target.checked){if(state.fusionSelected.length===10){e.target.checked=false;return}state.fusionSelected.push(id)}else state.fusionSelected=state.fusionSelected.filter(x=>x!==id);render();return}
 if(e.target.id==='reduceMotion'){state.reduceMotion=e.target.checked;localStorage.setItem('sc-reduced-motion',state.reduceMotion?'yes':'no');render()}
}
document.addEventListener('click',globalClick);
// Les images TVmaze/TMDB peuvent devenir momentanément indisponibles.
// Ne pas laisser le joueur face à quatre réponses sans indice.
document.addEventListener('error',e=>{
 const img=e.target;
 if(!(img instanceof HTMLImageElement)||!img.classList.contains('sc9-clue-image'))return;
 const visual=img.closest('.sc9-visual');
 if(!visual)return;
 visual.classList.add('is-broken');
 const status=visual.querySelector('.sc9-image-error');
 const retry=visual.querySelector('[data-quiz-change-clue]');
 if(status)status.hidden=false;
 if(retry)retry.hidden=false;
},true);
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
// Délégation dédiée : la croix du booster doit rester actionnable sur mobile
// même si le contenu de la modale est entièrement reconstruit à chaque carte.
$('overlay').addEventListener('click',e=>{
 const close=e.target.closest?.('[data-close]');
 if(close){
  e.preventDefault();e.stopPropagation();closeModal();return;
 }
 if(e.target===$('overlay'))closeModal();
});
supa.auth.onAuthStateChange(()=>setTimeout(loadSession,75));
state.route=safeRoute();render();loadSession();if(state.route==='catalog')loadCatalog(true);if(state.route==='rankings')loadRankings();loadSeasonShows();
clockTimer=setInterval(()=>{if(state.stock&&state.stock.stock<10){if(state.stock.recharge_seconds>0)state.stock.recharge_seconds-=1;else{state.stock.stock=Math.min(10,state.stock.stock+1);state.stock.recharge_seconds=state.stock.stock===10?0:600}
 const t=$('packTimer');if(t)t.textContent=state.stock.stock===10?'Réserve pleine':'Prochain paquet dans '+timecode(state.stock.recharge_seconds)}},1000);
