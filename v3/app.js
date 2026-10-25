import{privacyPage,legalPage,supportPage,deletionDialog}from'../v1/privacy.js?v=1.0.0&build=14';
import{rightsPage}from'../v1/rights.js?v=1.0.0&build=3';
import{opportunityData}from'../v1/opportunities.js?v=1.0.0&build=7';
import{candidates,recycleConfirm,LIMIT as RECYCLE_LIMIT}from'../v1/recycling.js?v=1.0.0&build=5';
import{demoCards}from'../v1/onboarding.js?v=1.0.0&build=4';
import{PRODUCT,footerHTML,aboutPage}from'../v1/product.js?v=1.0.0&build=16';
import{creditThemeName}from'../v21/credit-packs.js?v=21.0.0';
import{createClient}from'https://esm.sh/@supabase/supabase-js@2.118.0';
import{storePage}from'../v10/store.js?v=16.2.0&build=5';
import{navigationIcon}from'../v11/icons.js?v=11.0.0';
import{updatePixelClues}from'../v10/pixel-canvas.js?v=10.2.0';
import{quizQuestion,newQuiz,answerQuiz,nextQuiz}from'../v6/games.js?v=10.0.0';
import{openingFrame}from'../v7/booster.js?v=1.0.0&build=9';
import{gameModes}from'../v7/arena.js?v=10.1.1';
import{trainingModeStatus,canStartTraining,startTraining}from'../v8/game-limits.js?v=8.0.0';
import{fusionPlan,autoFusion,fusionConfirmation}from'../v6/fusion.js?v=8.0.0';
import{navItems,ranks,esc,photo,money,monthHalloween,timecode,foil,card,packs,collection,catalogue,wishlist,albums,rankings,fusions,profile,games,rules,settings,placeholder}from'./views.js?v=1.1.0&build=22';
import{getShowDetails,getPersonFilmography,searchPeople,showDetailHTML,actorDetailHTML,frenchSynopsisHTML,stripSummary}from'../v4/series.js?v=6.1.0&build=18';
import{getFrenchSynopsis}from'../v4/synopsis-fr.js?v=5.1.0';
import{getFrenchOffersByShow,renderFranceAvailability}from'../v5/fr-watch.js?v=7.1.2';
import{getFrenchCastByShow}from'../v5/cast-fr.js?v=7.0.0';
import{partitionFrenchInventory}from'../v5/fr-collection.js?v=5.5.1';
import{marketPage,communityPage,questsPage,tradeDialog}from'../v4/club.js?v=1.0.0&build=14';
import{personalAlbumsPage,seriesAlbumDetails,albumDialog,albumSeriesSearchResults}from'../v4/albums.js?v=20.2.1';
import{officialSeasonCatalog,officialSeasonDetailsHTML}from'../v10/seasons.js?v=20.1.0';
import{collectionStudio,collectionCSV,deriveCollection}from'../v5/collection.js?v=1.0.0&build=9';
const supa=createClient('https://anjfidksqbqlaggttdop.supabase.co','sb_publishable_wPFasufNG20maU1rokgPLA_7nyagxY3');
function readQuizRecords(){
 try{
  const stored=JSON.parse(localStorage.getItem('sc-quiz-records-v6')||'{}');
  return Object.fromEntries(['poster','pixel','timeline','year'].map(k=>
   [k,Number.isInteger(stored[k])&&stored[k]>=0&&stored[k]<=5?stored[k]:0]));
 }catch{return {poster:0,pixel:0,timeline:0,year:0}}
}
const $=id=>document.getElementById(id);
let deferredInstallPrompt=null;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstallPrompt=e});
window.addEventListener('appinstalled',()=>{deferredInstallPrompt=null;toast('SériesClubTCG est installé sur cet appareil.')});
async function installClubApp(){
 if(window.matchMedia('(display-mode: standalone)').matches||navigator.standalone){toast('Le jeu est déjà installé sur cet appareil.');return}
 if(deferredInstallPrompt){
  const prompt=deferredInstallPrompt;deferredInstallPrompt=null;
  try{await prompt.prompt();await prompt.userChoice}catch{toast('Installation indisponible dans ce navigateur.',true)}
  return;
 }
 toast('Utilise le menu de ton navigateur, puis « Installer » ou « Sur l’écran d’accueil ».');
}
function savedTheme(){try{return localStorage.getItem('sc10-theme')==='day'?'day':'night'}catch{return 'night'}}
function chooseTheme(next){
 state.theme=next==='day'?'day':'night';
 document.documentElement.dataset.theme=state.theme;
 document.querySelector('meta[name="theme-color"]')?.setAttribute(
  'content',state.theme==='day'?'#f5f8ff':'#07101f');
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

const routes={paquets:'packs',packs:'packs',collection:'collection',catalogue:'catalog',catalog:'catalog',albums:'albums',classement:'rankings',rankings:'rankings',fusions:'fusion',fusion:'fusion',jeux:'games',games:'games',souhaits:'wishlist',wishlist:'wishlist',communaute:'community',community:'community',marche:'market',market:'market',profil:'profile',profile:'profile',parametres:'settings',settings:'settings',premium:'store',boutique:'store',store:'store',regles:'rules',rules:'rules',apropos:'about',about:'about',droits:'rights',rights:'rights',sources:'rights',premiere:'premiere',parrainage:'referral',referral:'referral',confidentialite:'privacy',privacy:'privacy',mentions:'legal',legal:'legal',aide:'support',support:'support',missions:'quests',quetes:'quests',quests:'quests'};
const slug={packs:'paquets',catalog:'catalogue',rankings:'classement',games:'jeux',fusion:'fusions',wishlist:'souhaits',community:'communaute',market:'marche',profile:'profil',settings:'parametres',rules:'regles',about:'apropos',rights:'droits',referral:'parrainage',quests:'missions',store:'premium',privacy:'confidentialite',legal:'mentions',support:'aide'};
const state={route:'packs',creditPacks:null,creditPacksError:'',heroSlide:0,user:null,username:'',cards:[],excludedCardsCount:0,excludedWishesCount:0,frMigrationError:'',wallet:null,stock:null,wishes:[],seasonShows:[],homeShows:[],homeLoading:false,marketListings:[],marketActivity:[],tradeOffers:[],marketError:'',marketQuery:'',marketRarity:'',marketWishOnly:false,jumpToOpportunities:false,players:[],peopleFilter:'',peopleError:'',inviteCode:null,dailyError:'',paymentsMode:'disabled',premiumActive:false,premiumTitle:'collectionneur',premiumFrame:'classic',premiumBadge:'star',avatarPositionX:50,avatarPositionY:50,bannerPositionX:50,bannerPositionY:50,bannerTheme:'poster',paymentBusy:false,personalAlbums:[],publicAlbums:[],albumError:'',officialSeasons:null,seriesCompletion:[],permanentSeriesBadges:[],trackedSeasons:[],officialSeasonError:'',bio:'',favoriteGenre:'',avatarSeriesId:null,bannerSeriesId:null,theme:savedTheme(),daily:null,catalog:[],catalogMode:'series',actorQuery:'',actorMatches:[],actorSelected:null,actorShows:[],actorCatalogueIds:[],actorOnlyClub:false,actorLoading:false,actorError:'',catalogQuery:'',catalogRarity:'',catalogGenre:'',catalogPlatform:'',catalogDecade:'',catalogSort:'name',catalogPage:0,catalogTotal:null,catalogMore:true,catalogLoading:false,catalogError:'',rankings:[],collectionMode:'all',recycleSelection:[],recycleReady:false,recycleRemaining:0,collectionSort:'rarity',collectionPage:0,collectionEligibleTotal:null,saleSelectionCard:null,pack:monthHalloween()?'halloween':'classic',filter:'',rank:'',genre:'',fusionRank:'Commune',fusionSort:'duplicates',fusionSelected:[],fusionProtectLast:true,fusionPage:0,quiz:null,pixelPreview:null,quizLoading:false,quizError:'',rewardStatus:null,rewardQuiz:null,rewardFeedback:null,rewardBusy:false,rewardError:'',quizRecords:readQuizRecords(),reduceMotion:localStorage.getItem('sc-reduced-motion')==='yes',busy:false};
const navName=key=>({about:'À propos',rights:'Sources et droits',privacy:'Confidentialité',legal:'Mentions légales',support:'Assistance'}[key]||navItems.find(x=>x[0]===key)?.[2]||'Règles du jeu');
let openingCards=null,openingStep=0,openingMeta=null;
let toastTimer,clockTimer,searchTimer,catalogRequestId=0,quizRequestId=0,refreshing=false,detailRequestId=0,actorSearchRequestId=0,lastShowForBack=null,personReturnToShow=false;
/** Réponses publiques : ne jamais afficher d'erreurs techniques SQL au joueur. */
function publicError(error){
 const msg=String(error?.message||'');
 if(/crédits insuffisants|solde insuffisant/i.test(msg))return 'Tu ne disposes pas d’assez de crédits.';
 if(/récompense déjà obtenue|déjà.*obtenu/i.test(msg))return 'Cette récompense a déjà été attribuée.';
 if(/saison incomplète/i.test(msg))return 'Il manque encore des séries pour terminer cette Saison.';
 if(/connexion requise|profil requis|authentif/i.test(msg))return 'Connecte-toi pour continuer.';
 if(/catalogue.*insuffisant|catalogue.*actualisation|paquet indisponible/i.test(msg))return 'Ce paquet est temporairement indisponible.';
 return 'Cette opération n’a pas abouti. Réessaie dans quelques instants.';
}
function toast(msg,error=false){const el=$('toast');el.textContent=msg;el.classList.toggle('error',error);el.classList.remove('hidden');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.add('hidden'),5200)}
function safeRoute(){return routes[decodeURIComponent(location.hash.replace(/^#\/?/,'').split('?')[0])||'paquets']||'packs'}
function loadRouteData(route){
 if(route==='packs'&&!state.homeShows.length)loadHomeShows();
 if(route==='packs'&&state.creditPacks===null)loadCreditPacks();
 if(route==='catalog'&&state.catalogMode==='series'&&!state.catalog.length)loadCatalog(true);
 if(route==='rankings')loadRankings();
 if(route==='collection'){loadCollectionGoal();loadRecyclingStatus();if(state.user)loadMySales()}
 if(route==='market'&&state.user)loadMarket();
 if(route==='community'&&state.user){loadPeople();loadInviteCode()}
 if(route==='quests'&&state.user)loadDaily();
 if(route==='albums'&&state.user)loadAlbums();
 if(route==='profile'&&state.user)loadOfficialSeasons();
 if(route==='games')loadRewardStatus();
 if(route==='store')loadPaymentStatus();
}
function change(route){
 clearTimeout(searchTimer);
 const nextRoute=routes[route]||route;if(!nextRoute)return;
 state.route=nextRoute;
 const next='#/'+(slug[nextRoute]||nextRoute);
 if(location.hash!==next)history.pushState(null,'',next);
 render();loadRouteData(nextRoute);
 window.scrollTo({top:0,behavior:'instant'});
 $('page')?.focus({preventScroll:true});
 document.body.classList.remove('drawer-open');
 const button=$('menuToggle');if(button)button.setAttribute('aria-expanded','false');
}
function syncBrowserRoute(){
 state.route=safeRoute();render();loadRouteData(state.route);
 $('page')?.focus({preventScroll:true});
}
window.addEventListener('popstate',syncBrowserRoute);
window.addEventListener('hashchange',()=>{if(safeRoute()!==state.route)syncBrowserRoute()});
function renderChrome(){
 const pending=state.tradeOffers.filter(o=>o.status==='pending'&&o.seller_id===state.user?.id).length;
 const sections={packs:'DÉCOUVRIR',collection:'COLLECTIONNER',market:'LA COMMUNAUTÉ',games:'JOUER',profile:'MON ESPACE'};
 const nav=navItems.map(([key,icon,title])=>(sections[key]?'<div class="side-group-label" role="presentation">'+sections[key]+'</div>':'')+'<button class="side-link '+(state.route===key?'active ':'')+(key==='premiere'?'featured':'')+'" data-route="'+key+'" aria-current="'+(state.route===key?'page':'false')+'"><span class="ico" aria-hidden="true">'+navigationIcon(key,esc(icon))+'</span><span>'+esc(title)+'</span>'+(key==='collection'&&state.cards.length?'<span class="count">'+money(state.cards.length)+'</span>':key==='wishlist'&&state.wishes.length?'<span class="count">'+state.wishes.length+'</span>':key==='market'&&pending?'<span class="count">'+pending+'</span>':'')+'</button>').join('');
 $('sidebar').innerHTML='<a class="logo" href="#/paquets" data-route="packs"><span class="logo-mark" aria-hidden="true">S</span><span class="sc12-logo-word">SÉRIES<strong>CLUB</strong><em>TCG</em></span></a><nav class="side-links" aria-label="Menu principal">'+nav+'</nav>'+(monthHalloween()?'<div class="side-note"><b>✦ NUITS D’OCTOBRE</b>Édition Halloween disponible en octobre, chaque année.</div>':'')+'<div class="side-account" data-route="profile"><div class="avatar sc10-directory-avatar"'+
 (state.avatarSeriesId&&state.cards.some(c=>String(c.series_id)===String(state.avatarSeriesId))?
  ' style="background-image:url(&quot;'+photo(state.cards.find(c=>String(c.series_id)===String(state.avatarSeriesId)).series.image_url)+'&quot;)"':'')+'>'+
 (state.avatarSeriesId&&state.cards.some(c=>String(c.series_id)===String(state.avatarSeriesId))?'':esc((state.username||'S').slice(0,1).toUpperCase()))+'</div><div><b>'+esc(state.username||'Mon compte')+'</b><small>'+money(state.cards.length)+' cartes dans ma collection</small></div></div>';
 $('topbar').innerHTML='<div class="row"><button class="top-btn mobile-menu" id="menuToggle" aria-label="Ouvrir le menu" aria-expanded="false">☰</button><span class="crumb">'+esc(navName(state.route)).toUpperCase()+'</span></div><div class="top-actions"><button id="mobileTopSearch" class="top-btn sc12-mobile-search" data-route="catalog" aria-label="Rechercher une série">'+navigationIcon('catalog')+'</button><form id="globalSearchForm" class="sc12-global-search" role="search" aria-label="Rechercher une série"><span class="sc12-search-icon" aria-hidden="true">'+navigationIcon('catalog')+'</span><input id="globalSearchInput" type="search" autocomplete="off" maxlength="90" placeholder="Rechercher une série, un acteur, un univers…" aria-label="Rechercher dans SériesClubTCG"><button id="topSearch" type="submit" aria-label="Lancer la recherche">→</button></form><button class="sc10-theme-toggle" data-theme-toggle title="Changer le thème" aria-label="Basculer entre jour et nuit"><span class="sc22-theme-icon" aria-hidden="true">'+(state.theme==='day'?'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l2 2m10 10 2 2M19 5l-2 2M7 17l-2 2"/></svg>':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20.4 16.1A8.5 8.5 0 0 1 7.9 3.5 8.5 8.5 0 1 0 20.4 16.1Z"/></svg>')+'</span><span class="sc22-theme-label">'+(state.theme==='day'?'Jour':'Nuit')+'</span></button><button class="top-btn sc4-bell" data-opportunities-open aria-label="Voir mes opportunités du club">✧'+(opportunityData(state).count?'<span class="sc4-bell-number">'+Math.min(opportunityData(state).count,99)+'</span>':'')+'</button><button class="top-btn hide-mobile" data-route="rules">Règles du jeu</button><div class="sc12-balance"><span class="credit-pill">◇ &nbsp;'+money(state.wallet?.credits)+' <span>crédits</span></span><button type="button" class="sc12-add-credit" data-scroll-credit-packs aria-label="Utiliser mes crédits pour des boosters par plateforme">+</button></div><button class="top-btn sc12-account" data-auth><span class="sc12-account-face" aria-hidden="true">'+esc((state.username||'S').slice(0,1).toUpperCase())+'</span><span>'+(state.premiumActive?'✦ Premium':state.user?'Mon compte':'Connexion')+'</span></button><button class="top-btn hide-mobile" id="motionToggle" title="Animations">◐</button><span class="top-btn" aria-label="Langue : français">🇫🇷 FR</span></div>';
 if(monthHalloween()){
  $('topbar').querySelector('.crumb')?.insertAdjacentHTML('afterend','<span class="top-season-tag hide-mobile">☾ LES NUITS D’OCTOBRE</span>');
 }
 const mobile=[['packs','▤','Paquets'],['collection','▣','Collection'],['catalog','⌕','Catalogue'],['wishlist','☆','Souhaits']];
 const bottom=$('mobileNav');
 if(bottom)bottom.innerHTML=mobile.map(([route,icon,label])=>
   '<button type="button" data-route="'+route+'" class="sc59-mobile-link'+(state.route===route?' active':'')+'" aria-current="'+(state.route===route?'page':'false')+'" aria-label="'+label+'"><span aria-hidden="true">'+navigationIcon(route,icon)+'</span><small>'+label+'</small></button>').join('');
}
function render(){
 document.documentElement.dataset.theme=state.theme;
 const focused=document.activeElement;
 const restoreCatalog=state.route==='catalog'&&focused?.id==='catalogQuery';
 const cursor=restoreCatalog?focused.selectionStart:null;
 document.body.classList.toggle('reduce-motion',state.reduceMotion);
 document.body.classList.toggle('season-halloween',monthHalloween());
 renderChrome();
 const view={about:aboutPage,rights:rightsPage,privacy:privacyPage,legal:legalPage,support:supportPage,store:storePage,packs,collection:collectionStudio,catalog:catalogue,wishlist,albums:personalAlbumsPage,rankings,fusion:fusions,profile,games,rules,settings,market:marketPage,community:communityPage,quests:questsPage}[state.route];
 $('page').innerHTML=(view?view(state):placeholder(state.route))+footerHTML();
 updatePixelClues($('page'));
 document.title=navName(state.route)+' — '+PRODUCT.name+' '+PRODUCT.version;
 if(restoreCatalog){const input=$('catalogQuery');if(input){input.focus({preventScroll:true});if(cursor!==null)input.setSelectionRange(cursor,cursor)}}
}
async function ensureProfile(user){
 let {data,error}=await supa.from('profiles').select('username,bio,favorite_genre,avatar_series_id,banner_series_id,premium_title,premium_frame,premium_badge,avatar_position_x,avatar_position_y,banner_position_x,banner_position_y,banner_theme').eq('id',user.id).maybeSingle();
 if(error){const fallback=await supa.from('profiles').select('username,bio,favorite_genre').eq('id',user.id).maybeSingle();if(!fallback.error){data=fallback.data;error=null}}
 if(error){toast(publicError(error),true);return}
 if(data?.username){state.username=data.username;state.bio=data.bio||'';state.favoriteGenre=data.favorite_genre||'';state.avatarSeriesId=data.avatar_series_id??null;state.bannerSeriesId=data.banner_series_id??null;state.premiumTitle=data.premium_title||'collectionneur';state.premiumFrame=data.premium_frame||'classic';state.premiumBadge=data.premium_badge||'star';state.avatarPositionX=data.avatar_position_x??50;state.avatarPositionY=data.avatar_position_y??50;state.bannerPositionX=data.banner_position_x??50;state.bannerPositionY=data.banner_position_y??50;state.bannerTheme=data.banner_theme||'poster';return}
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
  if(!user){state.recycleSelection=[];state.recycleReady=false;state.recycleRemaining=0;state.rewardStatus={enabled:false};state.rewardQuiz=null;state.rewardFeedback=null;state.username='';state.bio='';state.favoriteGenre='';state.avatarSeriesId=null;state.bannerSeriesId=null;state.officialSeasons=null;state.trackedSeasons=[];state.cards=[];state.excludedCardsCount=0;state.excludedWishesCount=0;state.frMigrationError='';state.wallet=null;state.wishes=[];state.stock=null;state.marketListings=[];state.marketActivity=[];state.tradeOffers=[];state.players=[];state.inviteCode=null;state.personalAlbums=[];state.publicAlbums=[];state.collectionEligibleTotal=null;state.saleSelectionCard=null;state.daily=null;state.premiumActive=false;render();return}
  await ensureProfile(user);
  const status=await supa.rpc('get_booster_status');
  if(status.error)console.warn('Réserve:',status.error.message);
  state.stock=status.data?.[0]||null;
  let [w,c,wi,tr]=await Promise.all([
   supa.from('player_wallets').select('*').eq('player_id',user.id).maybeSingle(),
   supa.from('player_cards').select('id,owner_id,series_id,season_number,rarity,locked,reserved_trade_id,obtained_at,series:series_id(id,name,image_url,genres,premiered,rarity,rarity_source,fr_verified,fr_verification_method,fr_evidence_url,content_status)').eq('owner_id',user.id).order('obtained_at',{ascending:false}).limit(3000),
   supa.from('player_wishlist').select('series_id,series:series_id(id,name,image_url,premiered,rarity,rarity_source,fr_verified,fr_verification_method,fr_evidence_url,content_status)').eq('owner_id',user.id).order('created_at',{ascending:false}).limit(500),
   supa.rpc('my_trade_offers')
  ]);
  // A missing France column is an actionable migration error, not a reason
  // to display worldwide historical wishlists.
  // Do not silently fall back to a worldwide inventory if the FR schema is absent.
  state.frMigrationError=c.error&&/fr_verified|schema cache|column/i.test(c.error.message)?
   'Collection momentanément indisponible.':'';
  if(w.error)toast(publicError(w.error),true);
  if(c.error)toast(publicError(c.error),true);
  state.wallet=w.data||null;
  const allCards=c.error?[]:c.data||[];
  const allWishes=wi.error?[]:wi.data||[];
  const france=partitionFrenchInventory(allCards,allWishes);
  // Season art is an optional, independent query: a temporary lookup failure
  // must never hide someone's entire card inventory.
  const seasonMap=new Map();
  const seasonCards=france.cards.filter(card=>Number.isInteger(card.season_number)&&card.season_number>0);
  const seasonIds=[...new Set(seasonCards.map(card=>Number(card.series_id)))];
  for(let offset=0;offset<seasonIds.length;offset+=70){
   try{
    const chunk=seasonIds.slice(offset,offset+70);
    const {data,error}=await supa.from('series_seasons')
      .select('series_id,season_number,season_name,image_url,premiered')
      .in('series_id',chunk).limit(1000);
    if(!error)for(const row of data||[])seasonMap.set(row.series_id+':'+row.season_number,row);
   }catch{/* Affiche de la série disponible en dernier recours. */}
  }
  state.cards=france.cards.map(card=>({
   ...card,season:card.season_number
    ?seasonMap.get(card.series_id+':'+card.season_number)||null:null
  }));
  state.wishes=france.wishes;
  state.excludedCardsCount=france.excludedCardsCount;
  state.excludedWishesCount=france.excludedWishesCount;
  state.fusionSelected=state.fusionSelected.filter(id=>state.cards.some(c=>c.id===id));
  state.tradeOffers=tr.error?[]:tr.data||[];
  if(wi.error&&wi.error.code!=='42P01')console.warn('Wishlist:',wi.error.message);
  render();
  loadPaymentStatus();
  loadDaily();
  if(state.route==='games')loadRewardStatus();
  if(state.route==='market')loadMarket();
  if(state.route==='collection'){loadCollectionGoal();loadMySales();loadRecyclingStatus()}
  if(state.route==='community'){loadPeople();loadInviteCode()}
  if(state.route==='albums')loadAlbums();
 if(state.route==='profile')loadOfficialSeasons();
 }catch(e){console.error('Session:',e);toast('Connexion au serveur momentanément indisponible.',true)}
 finally{refreshing=false}
}
// Seul un webhook Stripe signé peut activer Premium dans Supabase.
async function loadPaymentStatus(){
 try{
  const {data,error}=await supa.functions.invoke('stripe-checkout',{method:'GET'});
  state.paymentsMode=error?'disabled':(data?.mode||'disabled');
 }catch{state.paymentsMode='disabled'}
 if(state.user){
  const {data,error}=await supa.rpc('my_premium_status');
  state.premiumActive=!error&&data?.[0]?.has_access===true;
 }else state.premiumActive=false;
 if(['store','profile'].includes(state.route))render();
}
async function startPremiumCheckout(){
 if(!state.user){openAuth();return}
 if(state.paymentBusy||state.paymentsMode!=='test')return;
 state.paymentBusy=true;
 try{
  const {data,error}=await supa.functions.invoke('stripe-checkout',{method:'POST',body:{sku:'premium_monthly'}});
  if(error||!/^https:\/\/checkout\.stripe\.com\//.test(data?.url||''))throw Error('Stripe Checkout indisponible.');
  location.assign(data.url);
 }catch(e){toast(e.message||'Paiement indisponible.',true)}
 finally{state.paymentBusy=false}
}
async function openPremiumPortal(){
 if(!state.user){openAuth();return}
 if(state.paymentBusy)return;
 state.paymentBusy=true;
 try{
  const {data,error}=await supa.functions.invoke('stripe-portal',{method:'POST',body:{}});
  if(error||!/^https:\/\/billing\.stripe\.com\//.test(data?.url||''))throw Error('Portail indisponible.');
  location.assign(data.url);
 }catch(e){toast(e.message||'Portail indisponible.',true)}
 finally{state.paymentBusy=false}
}

async function loadOfficialSeasons(){
 if(!state.user){state.officialSeasons=null;state.seriesCompletion=[];state.permanentSeriesBadges=[];state.officialSeasonError='';return}
 const seriesResult=await supa.rpc('my_series_completion_badges');
 state.seriesCompletion=seriesResult.error?[]:seriesResult.data||[];
 const badgesResult=await supa.from('v1_eligible_player_series_badges')
  .select('series_id,unlocked_at,series_name,image_url')
  .eq('player_id',state.user.id).order('unlocked_at',{ascending:false}).limit(500);
 state.permanentSeriesBadges=badgesResult.error?[]:badgesResult.data||[];
 const {data,error}=await supa.rpc('my_official_seasons');
 state.officialSeasons=error?null:data||[];
 await loadTrackedSeasons();
 state.officialSeasonError=error?'Les récompenses officielles attendent leur activation sur Supabase.':'';
 if(['albums','profile'].includes(state.route))render();
}
/**
 * Détails Top 20 : lire les 20 membres certifiés dans Supabase.
 * Aucun titre ou progression ne provient d'une approximation locale.
 */
async function openOfficialSeasonDetails(id){
 const item=officialSeasonCatalog.find(x=>x.id===id&&x.elite);
 if(!item)return;
 const overlay=$('overlay');
 overlay.classList.remove('hidden');
 overlay.innerHTML='<div class="dialog sc19-season-dialog" role="dialog" aria-modal="true">'+
  '<button class="close" data-close aria-label="Fermer">×</button>'+
  '<h2>'+esc(item.title)+'</h2><p>Chargement de la sélection française…</p></div>';
 try{
  const {data,error}=await supa.rpc('get_official_season_titles',{p_season_id:id});
  if(error)throw error;
  if(!overlay.classList.contains('hidden'))
   overlay.innerHTML=officialSeasonDetailsHTML(item,data||[],{user:!!state.user,tracked:state.trackedSeasons.includes(id),wishes:state.wishes.map(w=>Number(w.series_id))});
 }catch{
  if(!overlay.classList.contains('hidden'))
   overlay.innerHTML=officialSeasonDetailsHTML(item,[],{user:!!state.user});
 }
}


/** Suivi des saisons : seule la base peut ajouter les souhaits ou protéger les cartes. */
async function loadTrackedSeasons(){
 if(!state.user){state.trackedSeasons=[];return}
 const {data,error}=await supa.rpc('my_tracked_seasons');
 state.trackedSeasons=error?[]:(data||[]).map(x=>x.season_id);
}
async function syncSeasonTargets(id=null){
 if(!state.user){openAuth();return}
 if(state.busy)return;
 state.busy=true;
 try{
  const {data,error}=await supa.rpc('sync_official_collection',{p_season_id:id});
  if(error)throw error;
  const stats=Array.isArray(data)?data[0]:data;
  await loadSession();
  await loadAlbums();
  toast('Suivi activé : '+Number(stats?.wishes_added||0)+' souhait(s) ajouté(s), '+
   Number(stats?.cards_protected||0)+' carte(s) protégée(s), '+
   Number(stats?.series_owned||0)+' série(s) déjà possédée(s).');
  if(id)await openOfficialSeasonDetails(id);
 }catch(e){toast(publicError(e),true)}
 finally{state.busy=false}
}
async function unfollowSeason(id){
 if(!state.user){openAuth();return}
 if(state.busy)return;
 state.busy=true;
 try{
  const {error}=await supa.rpc('unfollow_official_collection',{p_season_id:id});
  if(error)throw error;
  await loadTrackedSeasons();render();
  toast('Suivi arrêté. Les protections existantes sont conservées.');
  await openOfficialSeasonDetails(id);
 }catch(e){toast(publicError(e),true)}
 finally{state.busy=false}
}
async function syncPersonalAlbum(id){
 if(!state.user){openAuth();return}
 if(state.busy)return;
 state.busy=true;
 try{
  const {data,error}=await supa.rpc('sync_personal_album_collection',{p_album_id:id});
  if(error)throw error;
  const stats=Array.isArray(data)?data[0]:data;
  await loadSession();await loadAlbums();await openAlbum(id);
  toast('Saison préparée : '+Number(stats?.wishes_added||0)+' souhait(s), '+
       Number(stats?.cards_protected||0)+' carte(s) nouvellement protégée(s).');
 }catch(e){toast(publicError(e),true)}
 finally{state.busy=false}
}
async function addPersonalTarget(id,seriesId){
 if(!state.user){openAuth();return}
 const {error}=await supa.rpc('add_series_to_personal_album',{
  p_album_id:id,p_series_id:Number(seriesId)});
 if(error){toast(publicError(error),true);return}
 await loadSession();await loadAlbums();await openAlbum(id);
 toast('Série ajoutée : souhait enregistré ou carte protégée.');
}
async function removePersonalTarget(id,seriesId){
 if(!state.user){openAuth();return}
 const {error}=await supa.rpc('remove_series_from_personal_album',{
  p_album_id:id,p_series_id:Number(seriesId)});
 if(error){toast(publicError(error),true);return}
 await openAlbum(id);toast('Titre retiré des objectifs de cette saison.');
}
async function searchPersonalSeries(id){
 const term=($('albumSeriesSearch')?.value||'').trim();
 const target=$('albumSeriesResults');if(!target)return;
 if(term.length<2){target.textContent='Saisis au moins deux caractères.';return}
 target.textContent='Recherche des séries disponibles en France…';
 const {data,error}=await supa.rpc('search_personal_album_series',{p_search:term});
 target.innerHTML=error?'<p class="note">Recherche temporairement indisponible. Réessaie plus tard.</p>':
 albumSeriesSearchResults({album_id:id},data||[]);
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
 }catch(e){toast(publicError(e),true)}
 finally{state.busy=false}
}
async function loadAlbums(){
 if(!state.user){state.personalAlbums=[];state.publicAlbums=[];if(state.route==='albums')render();return}
 const [own,shared,official]=await Promise.all([
  supa.rpc('my_personal_albums'),supa.rpc('public_personal_albums'),supa.rpc('my_official_seasons')
 ]);
 const errors=[own,shared].filter(v=>v.error).map(v=>v.error.message);
 state.albumError=errors.length?'Les Saisons personnelles sont temporairement indisponibles.':'';
 state.personalAlbums=own.data||[];state.publicAlbums=shared.data||[];
 state.officialSeasons=official.error?null:official.data||[];
 const [progressResult,badgeResult]=await Promise.all([
  supa.rpc('my_series_completion_badges'),
  supa.from('v1_eligible_player_series_badges').select('series_id,unlocked_at,series_name,image_url')
   .eq('player_id',state.user.id).limit(500)
 ]);
 state.seriesCompletion=progressResult.error?[]:progressResult.data||[];
 state.permanentSeriesBadges=badgeResult.error?[]:badgeResult.data||[];
 await loadTrackedSeasons();
 state.officialSeasonError=official.error?'Les Saisons officielles sont temporairement indisponibles.':'';
 if(state.route==='albums')render();
}
async function openSeriesAlbum(id){
 if(!state.user){openAuth();return}
 const show=state.seriesCompletion.find(x=>Number(x.series_id)===Number(id));
 if(!show)return;
 const {data,error}=await supa.from('series_seasons')
  .select('series_id,season_number,season_name,image_url,premiered')
  .eq('series_id',Number(id)).lte('premiered',new Date().toISOString().slice(0,10))
  .order('season_number',{ascending:true});
 if(error){toast('Saisons momentanément indisponibles.',true);return}
 const overlay=$('overlay');overlay.classList.remove('hidden');
 overlay.innerHTML=seriesAlbumDetails(show,data||[],state.cards,state.permanentSeriesBadges);
}
async function openAlbum(id){
 if(!state.user){openAuth();return}
 const album=state.personalAlbums.find(a=>a.album_id===id)||state.publicAlbums.find(a=>a.album_id===id);
 if(!album){toast('Album introuvable, actualise la page.',true);return}
 const {data,error}=await supa.rpc('album_card_data',{p_album_id:id});
 if(error){toast(publicError(error),true);return}
 $('overlay').classList.remove('hidden');
 const targets=await supa.rpc('personal_album_targets',{p_album_id:id});
 $('overlay').innerHTML=albumDialog(state,album,data||[],targets.error?[]:targets.data||[]);
}
async function albumMutation(rpc,args,msg,id){
 if(!state.user){openAuth();return}
 if(state.busy)return;
 state.busy=true;
 try{
  const {error}=await supa.rpc(rpc,args);if(error)throw error;
  toast(msg);await loadAlbums();
  if(id)await openAlbum(id);
 }catch(e){toast(publicError(e),true)}
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
/** Le serveur confirme l'activation et le quota : jamais d'achat simulé. */
async function loadRecyclingStatus(){
 if(!state.user){state.recycleReady=false;state.recycleRemaining=0;return}
 const {data,error}=await supa.rpc('my_recycling_status');
 state.recycleReady=!error&&Array.isArray(data)&&data.length>0;
 state.recycleRemaining=state.recycleReady?Math.max(0,Number(data[0].cards_remaining)||0):0;
 if(state.route==='collection')render();
}
function selectedDuplicates(){
 const available=candidates(deriveCollection(state.cards,state.wishes,state.marketActivity));
 const selected=new Set(state.recycleSelection||[]);
 return available.filter(c=>selected.has(c.id)).slice(0,RECYCLE_LIMIT);
}
function previewRecycle(){
 if(!state.recycleReady){toast('Recyclage non activé actuellement.',true);return}
 const selected=selectedDuplicates();
 if(!selected.length||selected.length>state.recycleRemaining){toast('Sélection invalide ou quota journalier atteint.',true);return}
 const modal=$('overlay');modal.classList.remove('hidden');
 modal.innerHTML=recycleConfirm(selected);
 modal.querySelector('[data-recycle-confirm]')?.focus({preventScroll:true});
}
async function confirmRecycle(){
 if(state.busy||!state.user||!state.recycleReady)return;
 const selected=selectedDuplicates();
 if(!selected.length||selected.length>state.recycleRemaining){toast('Sélection ou quota invalide.',true);return}
 state.busy=true;
 const button=document.querySelector('[data-recycle-confirm]');
 if(button){button.disabled=true;button.textContent='Recyclage en cours…'}
 try{
  const {data,error}=await supa.rpc('recycle_duplicate_cards',{p_card_ids:selected.map(x=>x.id)});
  if(error)throw error;
  const result=Array.isArray(data)?data[0]:null;
  if(Number(result?.cards_recycled)!==selected.length)throw Error('Réponse inattendue du serveur');
  state.recycleSelection=[];closeModal();
  await loadSession();await loadRecyclingStatus();
  toast(selected.length+' doublon(s) recyclé(s) · +'+Number(result.credits_earned)+' crédits.');
 }catch(e){toast(publicError(e),true);closeModal()}
 finally{state.busy=false}
}
async function loadCollectionGoal(){
 if(state.collectionEligibleTotal!==null)return;
 if(loadCollectionGoal.pending)return;
 loadCollectionGoal.pending=true;
 try{
  const {count,error}=await supa.from('series').select('id',{count:'exact',head:true})
   .neq('rarity_source','pending').eq('fr_verified',true).eq('content_status','series').in('fr_verification_method',['tvmaze_fr_origin','streaming_availability_fr']).not('image_url','is',null);
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
 state.marketError=errors.length?'Le Comptoir est temporairement indisponible.':'';
 state.marketListings=feed.data||[];
 state.marketActivity=activity.data||[];
 state.tradeOffers=offers.data||[];
 if(state.route==='market'){
  render();
  if(state.jumpToOpportunities){
   state.jumpToOpportunities=false;
   document.getElementById('sc1-opportunities')?.scrollIntoView({block:'start',behavior:state.reduceMotion?'auto':'smooth'});
  }
 }
}
/** Chaque code de club n'autorise qu'un abonnement, jamais l'authentification. */
async function loadInviteCode(){
 if(!state.user){state.inviteCode=null;return}
 const {data,error}=await supa.rpc('my_club_invite_code');
 state.inviteCode=!error&&/^[A-F0-9]{10}$/.test(String(data||''))?data:null;
 if(state.route==='community')render();
}
async function followClubCode(){
 if(!state.user){openAuth();return}
 if(!state.inviteCode){toast('Les codes joueurs ne sont pas encore actifs.',true);return}
 const code=String($('friendCodeInput')?.value||'').trim().toUpperCase();
 if(!/^[A-F0-9]{10}$/.test(code)){toast('Le code doit contenir 10 caractères hexadécimaux.',true);return}
 const {data,error}=await supa.rpc('follow_player_by_code',{p_code:code});
 if(error){toast('Code introuvable ou suivi impossible.',true);return}
 const result=Array.isArray(data)?data[0]:null;
 toast(result?.added?'Tu suis désormais '+result.username+'.':'Tu suis déjà ce joueur.');
 await loadPeople();
}
async function copyClubCode(){
 if(!state.inviteCode)return;
 const field=$('myClubCode');field?.focus();field?.select();
 try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(state.inviteCode);toast('Code joueur copié.');}
 else toast('Code sélectionné, tu peux le copier.')}
 catch{toast('Code sélectionné, copie-le manuellement.')}
}
async function loadPeople(){
 if(!state.user){state.players=[];if(state.route==='community')render();return}
 const [directory,visuals]=await Promise.all([
  supa.rpc('player_directory'),supa.rpc('public_profile_art')
 ]);
 const {data,error}=directory;
 const art=new Map((visuals.error?[]:visuals.data||[]).map(x=>[String(x.player_id),x]));
 state.players=(data||[]).map(p=>({...p,...art.get(String(p.player_id))}));
 state.peopleError=error?'La communauté est temporairement indisponible.':'';
 if(state.route==='community')render();
}
async function loadDaily(){
 if(!state.user){state.daily=null;return}
 const {data,error}=await supa.rpc('get_daily_progress');
 state.daily=error?null:data?.[0]||null;
 state.dailyError=error?'Les missions sont temporairement indisponibles.':'';
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
 }catch(e){toast(publicError(e),true)}
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
    .eq('fr_verified',true).eq('content_status','series').in('fr_verification_method',['tvmaze_fr_origin','streaming_availability_fr']).neq('rarity_source','pending')
    .not('image_url','is',null);
  if(state.catalogPlatform){
   const lookup=await supa.rpc('catalog_provider_series_ids',{p_platform:state.catalogPlatform});
   if(lookup.error)throw lookup.error;
   const ids=Array.isArray(lookup.data)?lookup.data:[];
   if(!ids.length){state.catalog=[];state.catalogTotal=0;state.catalogMore=false;state.catalogLoading=false;render();return}
   query=query.in('id',ids);
  }
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
  // Une édition de catalogue par saison TVmaze ; source et visuel propres à l'édition.
  const ids=(data||[]).map(x=>x.id);
  let editions=[];
  if(ids.length){
   const lookup=await supa.from('series_seasons')
    .select('series_id,season_number,season_name,image_url,premiered')
    .in('series_id',ids).order('season_number',{ascending:true}).limit(800);
   if(lookup.error)console.warn('Saisons temporairement indisponibles',lookup.error.message);
   else editions=lookup.data||[];
  }
  if(request!==catalogRequestId)return;
  const bySeries=new Map();
  for(const e of editions){
   if(!Number.isInteger(e.season_number)||e.season_number<1)continue;
   if(!bySeries.has(e.series_id))bySeries.set(e.series_id,[]);
   bySeries.get(e.series_id).push(e);
  }
  const expanded=(data||[]).flatMap(show=>{
   const available=bySeries.get(show.id)||[];
   return available.length?available.map(e=>({
    ...show,season_number:e.season_number,
    season:{image_url:e.image_url||show.image_url,premiered:e.premiered},
    season_name:e.season_name
   })):[{...show,seasons_pending:true}];
  });
  state.catalog=reset?expanded:state.catalog.concat(expanded);
  state.catalogTotal=Number.isSafeInteger(count)?count:null;
  state.catalogMore=(data||[]).length===36 && (state.catalogTotal===null||(page+1)*36<state.catalogTotal);
  state.catalogPage=page+1;
 }catch(e){
  if(request!==catalogRequestId)return;
  state.catalogError=/fr_verified|schema cache|column/i.test(e.message)
   ?'Catalogue momentanément indisponible.'
   :'Catalogue temporairement indisponible. Réessaie plus tard.';
 }finally{
  if(request===catalogRequestId){
   state.catalogLoading=false;
   if(state.route==='catalog'&&state.catalogMode==='series')render();
  }
 }
}
async function loadHomeShows(){
 if(state.homeLoading||state.homeShows.length)return;
 state.homeLoading=true;
 try{
  const featured=['Stranger Things','The Walking Dead','Breaking Bad','Lost','Wednesday','Friends',
   'The Last of Us','Game of Thrones','The Office','Sherlock','Dark','Outlander',
   'Doctor Who','The X-Files','The Mandalorian','24'];
  const opts=()=>supa.from('series').select('id,name,image_url,genres,premiered')
    .eq('fr_verified',true).eq('content_status','series').in('fr_verification_method',['tvmaze_fr_origin','streaming_availability_fr']).neq('rarity_source','pending')
    .not('image_url','is',null);
  const [curated,popular]=await Promise.all([
   opts().in('name',featured).limit(22),
   opts().order('popularity_weight',{ascending:false,nullsFirst:false}).limit(28)
  ]);
  const all=[...(curated.error?[]:curated.data||[]),...(popular.error?[]:popular.data||[])];
  const ids=new Set();
  state.homeShows=all.filter(x=>{
   if(!x?.id||!/^https:\/\//.test(x.image_url||'')||ids.has(String(x.id)))return false;
   ids.add(String(x.id));return true;
  }).slice(0,36);
  if(state.route==='packs')render();
 }catch(e){console.warn('Sélection des séries France temporairement indisponible',e?.message)}
 finally{state.homeLoading=false}
}
function submitGlobalSearch(){
 const query=($('globalSearchInput')?.value||'').trim().slice(0,90);
 if(query){
  state.catalogQuery=query;state.catalog=[];state.catalogPage=0;
  state.catalogRarity='';state.catalogGenre='';state.catalogPlatform='';state.catalogDecade='';
 }
 change('catalog');$('catalogQuery')?.focus({preventScroll:true});
}
async function loadSeasonShows(){
 if(!monthHalloween())return;
 try{
  const desired=['Wednesday','Stranger Things','The Haunting of Hill House','Midnight Mass','From','American Horror Story','The Last of Us','Penny Dreadful','The Walking Dead'];
  const [curated,genre]=await Promise.all([
   supa.from('series').select('id,name,image_url,premiered,genres').in('name',desired).eq('fr_verified',true).eq('content_status','series').in('fr_verification_method',['tvmaze_fr_origin','streaming_availability_fr']).neq('rarity_source','pending').not('image_url','is',null).limit(12),
   supa.from('series').select('id,name,image_url,premiered,genres').overlaps('genres',['Horror','Thriller','Supernatural','Mystery']).eq('fr_verified',true).eq('content_status','series').in('fr_verification_method',['tvmaze_fr_origin','streaming_availability_fr']).neq('rarity_source','pending').not('image_url','is',null).order('premiered',{ascending:false}).limit(30)
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
  const {data,error}=await supa.from('series').select('id').in('id',ids).eq('fr_verified',true).eq('content_status','series').in('fr_verification_method',['tvmaze_fr_origin','streaming_availability_fr']).neq('rarity_source','pending');
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
   // Les métadonnées TVmaze peuvent arriver après l'ouverture du dialogue.
   // Injecter les vraies affiches de saison sans redessiner le dialogue ni
   // toucher au casting et à l'inventaire existants.
   const seasonGallery=template.querySelector('.sc-season-gallery');
   if(seasonGallery&&!$('overlay').querySelector('.sc-season-gallery')){
    const castSection=$('overlay').querySelector('[data-cast-section]');
    if(castSection)castSection.before(seasonGallery);
   }
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
   .eq('id',id).eq('fr_verified',true).eq('content_status','series').in('fr_verification_method',['tvmaze_fr_origin','streaming_availability_fr']).neq('rarity_source','pending').maybeSingle();
  if(check.error||!check.data){toast('Cette série attend une preuve de diffusion française avant d’être ajoutée aux souhaits.',true);return}
 }
 const reply=exists?await supa.from('player_wishlist').delete().eq('owner_id',state.user.id).eq('series_id',id):await supa.from('player_wishlist').insert({owner_id:state.user.id,series_id:id});
 if(reply.error){toast('Liste de souhaits : '+reply.error.message,true);return}
 const {data}=await supa.from('player_wishlist').select('series_id,series:series_id(id,name,image_url,premiered,rarity,rarity_source,fr_verified,fr_verification_method)').eq('owner_id',state.user.id).order('created_at',{ascending:false});
 state.wishes=partitionFrenchInventory([],(data||[])).wishes;toast(exists?'Série retirée des souhaits.':'Série ajoutée à tes souhaits.');render();
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
function showOpening(data,meta=null){
 openingCards=data;openingStep=0;openingMeta=meta;
 const overlay=$('overlay');overlay.classList.remove('hidden');
 updateOpening();
}
function updateOpening(){
 if(!openingCards)return;
 const reduced=state.reduceMotion||window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const overlay=$('overlay');
 overlay.innerHTML='<div class="dialog opening-dialog" role="dialog" aria-modal="true" aria-label="Cartes du paquet">'+
  '<button class="close" data-close aria-label="Fermer">×</button>'+
  openingFrame(openingCards,openingStep,reduced,openingMeta)+'</div>';
 overlay.querySelector('#openingNext,#openingDone')?.focus({preventScroll:true});
}
function advanceOpening(skip=false){
 if(!openingCards)return;
 openingStep=skip?openingCards.length+1:Math.min(openingCards.length+1,openingStep+1);
 updateOpening();
}
/**
 * Le serveur seul fournit le prix et autorise la dépense de crédits.
 * Sans migration Supabase, les quatre boutons restent inactifs.
 */
async function loadCreditPacks(){
 if(state.creditPacks!==null)return;
 state.creditPacks=[];
 try{
  const {data,error}=await supa.rpc('list_credit_boosters');
  if(error)throw error;
  state.creditPacks=Array.isArray(data)?data:[];
  state.creditPacksError='';
 }catch{
  state.creditPacks=[];state.creditPacksError='Les boosters par plateforme attendent leur activation.';
 }
 if(state.route==='packs')render();
}
function confirmCreditPack(key){
 if(!state.user){openAuth();return}
 const offer=state.creditPacks?.find(x=>x.pack_key===key&&x.available===true);
 const cost=Number(offer?.price_credits);
 if(!offer||!Number.isInteger(cost)||cost<=0){toast('Ce booster est indisponible.',true);return}
 if(Number(state.wallet?.credits||0)<cost){toast('Crédits insuffisants.',true);return}
 const after=Number(state.wallet?.credits||0)-cost;
 const modal=$('overlay');modal.classList.remove('hidden');
 modal.innerHTML='<div class="dialog sc21-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="creditTitle">'+
 '<button class="close" type="button" data-close aria-label="Fermer">×</button>'+
 '<span class="caps">BOOSTER TV/SVOD · FRANCE</span><h2 id="creditTitle">'+esc(creditThemeName(key))+'</h2>'+
 '<p>Ouvrir cinq cartes de séries de cette plateforme ? La rareté officielle reste inchangée et la réserve de paquets gratuits n’est pas consommée.</p>'+
 '<p><strong>Prix : '+cost+' crédits</strong> · Nouveau solde estimé : '+after+' crédits.</p>'+
 '<p>Achat définitif en monnaie du jeu, sans paiement bancaire.</p>'+
 '<div class="sc21-confirm-actions"><button class="btn subtle" type="button" data-close>Annuler</button>'+
 '<button class="btn primary" type="button" data-confirm-credit-pack="'+key+'">Confirmer l’ouverture →</button></div></div>';
}
async function buyCreditPack(key){
 if(!state.user){openAuth();return}
 if(state.busy)return;
 const offer=state.creditPacks?.find(x=>x.pack_key===key&&x.available===true);
 if(!offer){toast('Booster non disponible.',true);return}
 state.busy=true;
 const btn=document.querySelector('[data-confirm-credit-pack]');
 if(btn){btn.disabled=true;btn.textContent='Attribution des cartes…'}
 try{
  const {data,error}=await supa.rpc('buy_credit_booster',{p_pack_key:key});
  if(error)throw error;
  if(!Array.isArray(data)||data.length!==5)throw Error('Le serveur n’a pas retourné cinq cartes.');
  showOpening(data,{kind:'credit',price:Number(offer.price_credits),label:creditThemeName(key)});
  await loadSession();
 }catch(e){toast(publicError(e),true);closeModal();render()}
 finally{state.busy=false}
}

function openDemoPack(){
 if(state.user){toast('Ton compte possède déjà l’accès aux paquets réels.');return}
 const cards=demoCards(state.homeShows);
 if(cards.length!==5){toast('La démonstration est temporairement indisponible.',true);return}
 showOpening(cards,{kind:'demo'});
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
  showOpening(data,state.pack==='halloween'?{kind:'halloween'}:null);await loadSession();
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
  '<div class="row"><button class="btn primary" id="fusionResultBack">Retour à la fusion</button><button class="btn subtle" id="fusionResultDone">Voir ma collection →</button></div></div>';
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
 root.innerHTML='<div class="dialog" role="dialog" aria-modal="true" aria-label="Compte joueur"><button class="close" data-close aria-label="Fermer">×</button><div class="caps">BIENVENUE DANS LE CLUB</div><h2>MON COMPTE</h2>'+(state.user?'<p>Connecté : '+esc(state.user.email)+'</p><button class="btn primary wide" data-route="profile" data-close>Gérer mon profil</button><button class="btn subtle wide" id="authSignout" style="margin-top:10px">Me déconnecter</button>':'<p>Connecte-toi ou crée un compte gratuit pour sauvegarder tes cartes.</p><input class="input" id="authEmail" type="email" autocomplete="email" placeholder="E-mail"><input class="input" id="authPassword" type="password" autocomplete="current-password" placeholder="Mot de passe (12 caractères à l’inscription)"><input class="input" id="authUsername" maxlength="24" autocomplete="nickname" placeholder="Pseudonyme pour l’inscription"><div class="row"><button class="btn primary" id="authLogin">Connexion</button><button class="btn subtle" id="authRegister">Créer un compte</button></div><button type="button" class="btn subtle wide" id="authForgotPassword">Mot de passe oublié ?</button>')+'<p class="feedback" id="authFeedback" role="status"></p></div>';
 $('authEmail')?.focus();
}
async function authenticate(register){
 const email=$('authEmail')?.value.trim(),password=$('authPassword')?.value,username=$('authUsername')?.value.trim();
 if(!email||!password||(register&&(password.length<12||username.length<3||username.length>24))){$('authFeedback').textContent=register?'Pour créer un compte : e-mail, mot de passe d’au moins 12 caractères et pseudonyme de 3 à 24 caractères.':'Renseigne ton e-mail et ton mot de passe.';return}
 $('authFeedback').textContent='Connexion au club…';
 const result=register?await supa.auth.signUp({email,password,options:{emailRedirectTo:location.origin+location.pathname,data:{username}}}):await supa.auth.signInWithPassword({email,password});
 if(result.error){$('authFeedback').textContent=result.error.message;return}
 if(register&&!result.data.session){$('authFeedback').textContent='Inscription enregistrée. Vérifie ton e-mail pour confirmer le compte.';return}
 $('overlay').classList.add('hidden');await loadSession();toast('Bienvenue dans le club !')
}
async function requestPasswordReset(){
 const email=($('authEmail')?.value||'').trim();
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){if($('authFeedback'))$('authFeedback').textContent='Saisis ton e-mail pour recevoir un lien de réinitialisation.';return}
 const feedback=$('authFeedback');if(feedback)feedback.textContent='Envoi du lien de réinitialisation…';
 const {error}=await supa.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});
 if(feedback)feedback.textContent=error?'Envoi indisponible. Réessaie plus tard.':'Si cette adresse possède un compte, un lien de réinitialisation vient d’être envoyé.';
}
function openPasswordReset(){
 const overlay=$('overlay');overlay.classList.remove('hidden');
 overlay.innerHTML='<div class="dialog" role="dialog" aria-modal="true" aria-labelledby="passwordResetTitle">'+
  '<button class="close" data-close aria-label="Fermer">×</button><span class="caps">SÉCURITÉ DU COMPTE</span>'+
  '<h2 id="passwordResetTitle">Choisir un nouveau mot de passe</h2>'+
  '<p>Utilise au moins 12 caractères différents de tes anciens mots de passe.</p>'+
  '<input class="input" id="resetNewPassword" type="password" autocomplete="new-password" placeholder="Nouveau mot de passe" minlength="12">'+
  '<input class="input" id="resetConfirmPassword" type="password" autocomplete="new-password" placeholder="Confirmer le mot de passe" minlength="12">'+
  '<button class="btn primary wide" type="button" id="authPasswordResetSave">Enregistrer le mot de passe</button>'+
  '<p class="feedback" id="resetPasswordFeedback" role="status"></p></div>';
 $('resetNewPassword')?.focus({preventScroll:true});
}
async function savePasswordReset(){
 const password=$('resetNewPassword')?.value||'';
 const confirmPassword=$('resetConfirmPassword')?.value||'';
 const feedback=$('resetPasswordFeedback');
 if(password.length<12||password!==confirmPassword){if(feedback)feedback.textContent='Entre au moins 12 caractères et une confirmation identique.';return}
 const button=$('authPasswordResetSave');if(button){button.disabled=true;button.textContent='Enregistrement…'}
 try{
  const {error}=await supa.auth.updateUser({password});
  if(error)throw error;
  closeModal();toast('Mot de passe mis à jour. Ton compte est sécurisé.');
  await loadSession();
 }catch{if(feedback)feedback.textContent='Impossible de modifier le mot de passe. Demande un nouveau lien.'}
 finally{if(button?.isConnected){button.disabled=false;button.textContent='Enregistrer le mot de passe'}}
}
function closeModal(){
 // Restituer le focus au contenu après fermeture d'une fenêtre modale.
 detailRequestId++;openingCards=null;openingStep=0;openingMeta=null;
 const root=$('overlay');const wasOpen=!root.classList.contains('hidden');
 root.classList.add('hidden');root.replaceChildren();
 if(wasOpen)$('page')?.focus({preventScroll:true});
}
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
 if(!state.user){openAuth();return}
 if(state.busy)return;
 state.busy=true;
 try{
  const {data,error}=await supa.rpc('export_my_account_data');
  if(error)throw error;
  if(!data||data.account_id!==state.user.id)throw Error('Données du compte indisponibles');
  const payload={...data,email:state.user.email||null,export_format:'SériesClubTCG V1.0'};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json;charset=utf-8'});
  const url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download='seriesclub-mes-donnees-'+new Date().toISOString().slice(0,10)+'.json';
  document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),5000);
  toast('Export des données du jeu téléchargé.');
 }catch(e){toast('Export indisponible. Réessaie plus tard.',true)}
 finally{state.busy=false}
}
function openDeleteAccount(){
 if(!state.user){openAuth();return}
 const root=$('overlay');root.classList.remove('hidden');
 root.innerHTML=deletionDialog(state.user.email||'');
 root.querySelector('#deleteAccountPhrase')?.focus({preventScroll:true});
}
async function confirmDeleteAccount(){
 if(state.busy||!state.user)return;
 const email=$('deleteAccountEmail')?.value?.trim()||'';
 const pass=$('deleteAccountPassword')?.value||'';
 const phrase=$('deleteAccountPhrase')?.value?.trim()||'';
 const feedback=$('deleteAccountFeedback');
 if(email.toLowerCase()!==String(state.user.email||'').toLowerCase()||pass.length<1||phrase!=='SUPPRIMER'){
  if(feedback)feedback.textContent='Vérifie ton e-mail, ton mot de passe actuel et le mot SUPPRIMER.';
  return;
 }
 state.busy=true;
 const button=document.querySelector('[data-delete-account-confirm]');
 if(button){button.disabled=true;button.textContent='Vérification du compte…'}
 try{
  const login=await supa.auth.signInWithPassword({email,password:pass});
  if(login.error||login.data?.user?.id!==state.user.id){
   if(feedback)feedback.textContent='Mot de passe incorrect : suppression annulée.';
   return;
  }
  if(button)button.textContent='Fermeture du compte…';
  const {data,error}=await supa.functions.invoke('account-delete',{
   body:{email,confirmation:'SUPPRIMER'}
  });
  if(error||data?.deleted!==true)throw Error('Fermeture non confirmée');
  try{await supa.auth.signOut({scope:'local'})}catch{/* compte déjà effacé */}
  for(const key of ['sc-quiz-records-v6','sc8-quiz-cooldowns','sc8.1-pixel-visibility-restored']){
   try{localStorage.removeItem(key)}catch{/* données facultatives */}
  }
  closeModal();await loadSession();change('packs');
  toast('Ton compte et ta collection ont été supprimés.');
 }catch{
  if(feedback){feedback.textContent='Suppression non confirmée. Tu peux demander un examen manuel sans supprimer immédiatement ton compte.';feedback.insertAdjacentHTML('beforeend',' <button class="btn subtle" type="button" data-delete-review>Demander un examen manuel →</button>')}
 }finally{
  state.busy=false;
  if(button?.isConnected){button.disabled=false;button.textContent='Supprimer mon compte'}
 }
}
async function requestDeletionReview(){
 if(!state.user||state.busy){return}
 const feedback=$('deleteAccountFeedback');state.busy=true;
 try{
  const {error}=await supa.rpc('request_account_deletion');
  if(error)throw error;
  if(feedback)feedback.textContent='Demande enregistrée pour examen. Ton compte reste actif jusqu’au traitement confirmé.';
 }catch{if(feedback)feedback.textContent='Impossible d’enregistrer la demande. Réessaie plus tard.'}
 finally{state.busy=false}
}
async function submitReport(){
 if(!state.user){openAuth();return}
 if(state.busy)return;
 const targetType=$('reportTargetType')?.value;
 const targetRef=$('reportTargetRef')?.value?.trim()||'';
 const reason=$('reportReason')?.value;
 const details=$('reportDetails')?.value?.trim()||'';
 if(!['player','listing','series'].includes(targetType)||!['abuse','fraud','offensive','copyright','other'].includes(reason)
 ||targetRef.length<1||targetRef.length>48||details.length<15||details.length>600){
  toast('Vérifie le type, l’identifiant et le descriptif (15 à 600 caractères).',true);return;
 }
 state.busy=true;
 const btn=$('reportSubmitButton');if(btn){btn.disabled=true;btn.textContent='Envoi sécurisé…'}
 try{
  const {error}=await supa.rpc('submit_player_report',{
   p_target_type:targetType,p_target_ref:targetRef,p_reason:reason,p_details:details
  });
  if(error)throw error;
  if($('reportDetails'))$('reportDetails').value='';
  toast('Signalement enregistré pour examen.');
 }catch{toast('Signalement non transmis. Vérifie l’identifiant ou le quota de 5 par jour.',true)}
 finally{state.busy=false;if(btn){btn.disabled=false;btn.textContent='Envoyer le signalement →'}}
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
 state.pixelPreview={items:[],index:0,round:2,revealed:false,loading:true,error:''};
 if(state.route==='games')render();
 try{
  const owned=state.cards.map(c=>c.series).filter(x=>x?.image_url&&/^https:\/\//.test(x.image_url));
  const listed=state.catalog.filter(x=>x?.image_url&&/^https:\/\//.test(x.image_url));
  const {data,error}=await supa.from('series')
    .select('id,name,image_url').eq('fr_verified',true).eq('content_status','series').in('fr_verification_method',['tvmaze_fr_origin','streaming_availability_fr'])
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
   .eq('fr_verified',true).eq('content_status','series').in('fr_verification_method',['tvmaze_fr_origin','streaming_availability_fr']).neq('rarity_source','pending')
   .not('image_url','is',null).not('premiered','is',null);
  const countRequest=await supa.from('series').select('id',{count:'exact',head:true})
   .eq('fr_verified',true).eq('content_status','series').in('fr_verification_method',['tvmaze_fr_origin','streaming_availability_fr']).neq('rarity_source','pending')
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
 const railShift=e.target.closest('[data-rail-shift]');
 if(railShift){
  const [id,direction]=String(railShift.dataset.railShift||'').split(':');
  const rail=['sc13-genre-rail','sc13-show-rail'].includes(id)?document.getElementById(id):null;
  if(rail){
   rail.scrollBy({left:(Number(direction)<0?-1:1)*Math.max(240,rail.clientWidth*.77),
    behavior:state.reduceMotion?'instant':'smooth'});
  }
  return;
 }
 const heroControl=e.target.closest('[data-hero-slide]');
 if(heroControl){state.heroSlide=Number(heroControl.dataset.heroSlide)||0;render();return}
 if(e.target.closest('[data-hero-slide-next]')){state.heroSlide=(state.heroSlide+1)%3;render();return}
 if(e.target.closest('[data-hero-slide-prev]')){state.heroSlide=(state.heroSlide+2)%3;render();return}
 const heroAction=e.target.closest('[data-hero-action]');
 if(heroAction){
  const choice=heroAction.dataset.heroAction;
  if(choice==='catalog'||choice==='albums'){change(choice);return}
  if(monthHalloween())state.pack='halloween';
  render();document.getElementById('svod-packs')?.scrollIntoView({block:'start',behavior:state.reduceMotion?'auto':'smooth'});return;
 }
 if(e.target.closest('[data-home-event]')){
  if(monthHalloween())state.pack='halloween';
  render();
  document.getElementById('svod-packs')?.scrollIntoView({
   block:'start',behavior:state.reduceMotion?'auto':'smooth'
  });
  return;
 }
 const homeGenre=e.target.closest('[data-home-genre]');
 if(homeGenre){
  state.catalogGenre=homeGenre.dataset.homeGenre;state.catalogPlatform='';
  state.catalogQuery='';state.catalogDecade='';state.catalogRarity='';
  state.catalog=[];state.catalogPage=0;change('catalog');return;
 }
 const homeEra=e.target.closest('[data-home-decade]');
 if(homeEra){
  state.catalogDecade=homeEra.dataset.homeDecade;state.catalogPlatform='';
  state.catalogGenre='';state.catalogQuery='';state.catalogRarity='';
  state.catalog=[];state.catalogPage=0;change('catalog');return;
 }
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

 if(e.target.closest('#topSearch')){e.preventDefault();submitGlobalSearch();return}
 if(e.target.closest('[data-install-app]')){installClubApp();return}
 if(e.target.closest('[data-delete-account-start]')){openDeleteAccount();return}
 if(e.target.closest('[data-delete-account-confirm]')){confirmDeleteAccount();return}
 if(e.target.closest('[data-delete-review]')){requestDeletionReview();return}
 const reportTarget=e.target.closest('[data-report-player],[data-report-listing],[data-report-series]');
 if(reportTarget){
  const type=reportTarget.hasAttribute('data-report-player')?'player':
   reportTarget.hasAttribute('data-report-listing')?'listing':'series';
  const id=reportTarget.getAttribute('data-report-'+type);
  closeModal();change('support');
  if($('reportTargetType'))$('reportTargetType').value=type;
  if($('reportTargetRef')){$('reportTargetRef').value=id;$('reportTargetRef').focus({preventScroll:true})}
  return;
 }
 if(e.target.closest('[data-theme-toggle]')){chooseTheme(state.theme==='day'?'night':'day');return}
 const themeChoice=e.target.closest('[data-theme-choice]');if(themeChoice){chooseTheme(themeChoice.dataset.themeChoice);return}
 const route=e.target.closest('[data-route]');if(route){e.preventDefault();change(route.dataset.route);return}
 if(e.target.closest('#menuToggle')){const opened=document.body.classList.toggle('drawer-open');$('menuToggle')?.setAttribute('aria-expanded',String(opened));return}
 if(e.target.closest('#drawerBackdrop')){document.body.classList.remove('drawer-open');$('menuToggle')?.setAttribute('aria-expanded','false');return}
 if(e.target.closest('[data-premium-checkout]')){startPremiumCheckout();return}
 if(e.target.closest('[data-premium-portal]')){openPremiumPortal();return}
 if(e.target.closest('[data-auth]')){openAuth();return}
 if(e.target.closest('#authLogin')){authenticate(false);return}
 if(e.target.closest('#authRegister')){authenticate(true);return}
 if(e.target.closest('#authForgotPassword')){requestPasswordReset();return}
 if(e.target.closest('#authPasswordResetSave')){savePasswordReset();return}
 if(e.target.closest('#authSignout')){supa.auth.signOut().then(()=>{closeModal();loadSession();toast('Compte déconnecté.')});return}
 if(e.target.closest('#motionToggle')){state.reduceMotion=!state.reduceMotion;localStorage.setItem('sc-reduced-motion',state.reduceMotion?'yes':'no');render();return}

 if(e.target.closest('#createAlbum')){createAlbum();return}
 if(e.target.closest('[data-sync-all-seasons]')){syncSeasonTargets(null);return}
 const syncSeason=e.target.closest('[data-sync-season]');if(syncSeason){syncSeasonTargets(syncSeason.dataset.syncSeason);return}
 const unfollow=e.target.closest('[data-unfollow-season]');if(unfollow){unfollowSeason(unfollow.dataset.unfollowSeason);return}
 const seasonDetail=e.target.closest('[data-season-details]');if(seasonDetail){openOfficialSeasonDetails(seasonDetail.dataset.seasonDetails);return}
 const official=e.target.closest('[data-claim-season]');if(official){claimOfficialSeason(official.dataset.claimSeason);return}
 const seriesAlbum=e.target.closest('[data-series-album]');if(seriesAlbum){openSeriesAlbum(seriesAlbum.dataset.seriesAlbum);return}
 const viewAlbum=e.target.closest('[data-view-album]');if(viewAlbum){openAlbum(viewAlbum.dataset.viewAlbum);return}
 const deleteAlb=e.target.closest('[data-delete-album]');if(deleteAlb){deleteAlbum(deleteAlb.dataset.deleteAlbum);return}
 const syncAlb=e.target.closest('[data-sync-personal-album]');if(syncAlb){syncPersonalAlbum(syncAlb.dataset.syncPersonalAlbum);return}
 const searchAlb=e.target.closest('[data-album-search]');if(searchAlb){searchPersonalSeries(searchAlb.dataset.albumSearch);return}
 const addTarget=e.target.closest('[data-add-album-target]');if(addTarget){addPersonalTarget(addTarget.dataset.albumId,addTarget.dataset.addAlbumTarget);return}
 const removeTarget=e.target.closest('[data-remove-album-target]');if(removeTarget){removePersonalTarget(removeTarget.dataset.albumId,removeTarget.dataset.removeAlbumTarget);return}
 const addAlb=e.target.closest('#albumAddCard');if(addAlb){addAlbumCard(addAlb.dataset.albumId);return}
 const removeAlb=e.target.closest('[data-album-remove]');if(removeAlb){removeAlbumCard(removeAlb.dataset.albumId,removeAlb.dataset.albumRemove);return}
 if(e.target.closest('#createListing')){createListing();return}
 if(e.target.closest('[data-market-wishes]')){state.marketWishOnly=!state.marketWishOnly;render();return}
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
 if(e.target.closest('[data-copy-club-code]')){copyClubCode();return}
 if(e.target.closest('[data-follow-club-code]')){followClubCode();return}
 if(e.target.closest('[data-opportunities-open]')){state.jumpToOpportunities=true;if(state.route==='market'){render();document.getElementById('sc1-opportunities')?.scrollIntoView({block:'start',behavior:'smooth'})}else change('market');return}
 if(e.target.closest('[data-opportunities-trades]')){document.getElementById('sc1-trades')?.scrollIntoView({block:'start',behavior:'smooth'});return}
 if(e.target.closest('[data-opportunities-wishes]')){state.marketWishOnly=true;render();document.getElementById('sc1-market-listings')?.scrollIntoView({block:'start',behavior:'smooth'});return}
 const follow=e.target.closest('[data-follow]');if(follow){toggleFollow(follow.dataset.follow);return}
 const claim=e.target.closest('[data-claim-quest]');if(claim){claimQuest(claim.dataset.claimQuest);return}
 if(e.target.closest('[data-scroll-credit-packs]')){if(state.route!=='packs')change('packs');document.getElementById('svod-credit-packs')?.scrollIntoView({block:'start',behavior:'smooth'});return}
 const pack=e.target.closest('[data-pack]');if(pack){if(pack.disabled)return;state.pack=pack.dataset.pack;render();document.getElementById('svod-packs')?.scrollIntoView({block:'start',behavior:'auto'});return}
 const themePack=e.target.closest('[data-credit-pack]');if(themePack){if(!themePack.disabled)confirmCreditPack(themePack.dataset.creditPack);return}
 const purchase=e.target.closest('[data-confirm-credit-pack]');if(purchase){buyCreditPack(purchase.dataset.confirmCreditPack);return}
 if(e.target.closest('[data-demo-pack]')){openDemoPack();return}
 if(e.target.closest('#openPack')){openPack();return}
 if(e.target.closest('[data-daily]')){claimDaily();return}
 if(e.target.closest('#openingNext')){advanceOpening();return}
 if(e.target.closest('#openingSkip')){advanceOpening(true);return}
 if(e.target.closest('#openingDone')){const demo=openingMeta?.kind==='demo';closeModal();if(demo)openAuth();else change('collection');return}
 if(e.target.closest('[data-export-collection]')){exportCollection();return}
 const switchMode=e.target.closest('[data-collection-mode]');
 if(switchMode){state.collectionMode=switchMode.dataset.collectionMode;state.collectionPage=0;render();return}
 const rankChip=e.target.closest('[data-collection-rank]');
 if(rankChip){state.rank=state.rank===rankChip.dataset.collectionRank?'':rankChip.dataset.collectionRank;state.collectionPage=0;render();return}
 const item=e.target.closest('[data-recycle-item]');if(item){const id=item.dataset.recycleItem;const selected=new Set(state.recycleSelection);if(selected.has(id))selected.delete(id);else if(selected.size<RECYCLE_LIMIT)selected.add(id);state.recycleSelection=[...selected];render();return}
 if(e.target.closest('[data-recycle-all]')){const all=candidates(deriveCollection(state.cards,state.wishes,state.marketActivity));state.recycleSelection=all.slice(0,Math.min(RECYCLE_LIMIT,state.recycleRemaining)).map(x=>x.id);render();return}
 if(e.target.closest('[data-recycle-preview]')){previewRecycle();return}
 if(e.target.closest('[data-recycle-confirm]')){confirmRecycle();return}
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
 if(e.target.closest('#fusionResultBack')){closeModal();change('fusion');return}
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
 const premiumTitle=state.premiumActive?($('premiumTitle')?.value||'collectionneur'):'collectionneur';
 const premiumFrame=state.premiumActive?($('premiumFrame')?.value||'classic'):'classic';
 const premiumBadge=state.premiumActive?($('premiumBadge')?.value||'star'):'star';
 const safePosition=id=>Math.max(0,Math.min(100,Number($(id)?.value)||0));
 const avatarPositionX=safePosition('avatarPositionX'),avatarPositionY=safePosition('avatarPositionY');
 const bannerPositionX=safePosition('bannerPositionX'),bannerPositionY=safePosition('bannerPositionY');
 const bannerTheme=['poster','midnight','aurora','cinema'].includes($('bannerTheme')?.value)?$('bannerTheme').value:'poster';
 const avatarSeriesId=avatarValue?Number(avatarValue):null,bannerSeriesId=bannerValue?Number(bannerValue):null;
 if(bio.length>160||favoriteGenre.length>32){toast('Biographie trop longue.',true);return}
 let {error}=await supa.from('profiles').upsert({id:state.user.id,username:name,bio,favorite_genre:favoriteGenre,avatar_series_id:avatarSeriesId,banner_series_id:bannerSeriesId,premium_title:premiumTitle,premium_frame:premiumFrame,premium_badge:premiumBadge,avatar_position_x:avatarPositionX,avatar_position_y:avatarPositionY,banner_position_x:bannerPositionX,banner_position_y:bannerPositionY,banner_theme:bannerTheme},{onConflict:'id'});
 if(error&&(/bio|favorite_genre|avatar_series_id|banner_series_id|schema cache|column/i.test(error.message))){const fallback=await supa.from('profiles').upsert({id:state.user.id,username:name},{onConflict:'id'});if(!fallback.error){toast('Pseudonyme enregistré. La biographie n’a pas pu être sauvegardée.');state.username=name;render();return}error=fallback.error}
 if(error){toast(error.code==='23505'?'Ce pseudonyme est déjà utilisé.':error.message,true);return}
 state.username=name;state.bio=bio;state.favoriteGenre=favoriteGenre;state.avatarSeriesId=avatarSeriesId;state.bannerSeriesId=bannerSeriesId;state.premiumTitle=premiumTitle;state.premiumFrame=premiumFrame;state.premiumBadge=premiumBadge;state.avatarPositionX=avatarPositionX;state.avatarPositionY=avatarPositionY;state.bannerPositionX=bannerPositionX;state.bannerPositionY=bannerPositionY;state.bannerTheme=bannerTheme;render();toast('Profil et affiches enregistrés.')
}
function globalChange(e){
 const facet={catalogRarity:'catalogRarity',catalogGenre:'catalogGenre',catalogPlatform:'catalogPlatform',catalogDecade:'catalogDecade',catalogSort:'catalogSort'}[e.target.id];
 if(facet){state[facet]=e.target.value;clearTimeout(searchTimer);loadCatalog(true);return}
 if(e.target.id==='profileAvatar'||e.target.id==='profileBanner'){
  const raw=e.target.selectedOptions?.[0]?.dataset.image||'';
  const element=document.querySelector(e.target.id==='profileAvatar'?'.sc10-profile-avatar':'.sc10-profile-banner');
  if(element)element.style.backgroundImage=/^https:\/\//.test(raw)?'url('+JSON.stringify(raw)+')':'none';
  return;
 }
 if(e.target.id==='bannerTheme'){const el=document.querySelector('.sc10-profile-banner');if(el){el.classList.remove('sc-v1-banner-poster','sc-v1-banner-midnight','sc-v1-banner-aurora','sc-v1-banner-cinema');el.classList.add('sc-v1-banner-'+e.target.value)}return}
 if(e.target.id==='actorOnlyClub'){state.actorOnlyClub=e.target.checked;render();return}
 if(e.target.id==='marketRarity'){state.marketRarity=e.target.value;render();return}
 if(e.target.id==='rarityFilter'){state.rank=e.target.value;state.collectionPage=0;render();return}
 if(e.target.id==='collectionSort'){state.collectionSort=e.target.value;state.collectionPage=0;render();return}
 if(e.target.id==='fusionSort'){state.fusionSort=e.target.value;state.fusionPage=0;render();return}
 if(e.target.id==='fusionRank'){state.fusionRank=e.target.value;state.fusionSelected=[];state.fusionPage=0;render();return}
 if(e.target.id==='fusionProtectLast'){
  state.fusionProtectLast=e.target.checked;
  state.fusionSelected=activeFusionPlan().selected;
  state.fusionPage=0;render();return;
 }
 if(e.target.matches('[data-fuse]')){const id=e.target.dataset.fuse;if(e.target.checked){if(state.fusionSelected.length===10){e.target.checked=false;return}state.fusionSelected.push(id)}else state.fusionSelected=state.fusionSelected.filter(x=>x!==id);render();return}
 if(e.target.id==='reduceMotion'){state.reduceMotion=e.target.checked;localStorage.setItem('sc-reduced-motion',state.reduceMotion?'yes':'no');render()}
}
document.addEventListener('submit',event=>{
 if(event.target?.id==='clubReportForm'){event.preventDefault();submitReport();return}
 if(event.target?.id==='globalSearchForm'){
  event.preventDefault();submitGlobalSearch();
 }
});
document.addEventListener('click',globalClick);
// Les images TVmaze/TMDB peuvent devenir momentanément indisponibles.
// Ne pas laisser le joueur face à quatre réponses sans indice.
document.addEventListener('error',e=>{
 const img=e.target;
 if(img instanceof HTMLImageElement&&img.classList.contains('sc11-preview-source')){
  if(state.pixelPreview){
   state.pixelPreview={...state.pixelPreview,error:'Cette affiche ne peut pas se charger. Utilise Réessayer pour en sélectionner une autre.'};
   if(state.route==='games')render();
  }
  return;
 }
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
 if(e.target.id==='profileArtSearch'){
  const term=e.target.value.trim().toLocaleLowerCase('fr');
  for(const id of ['profileAvatar','profileBanner']){
   const field=$(id);if(!field)continue;
   for(const opt of field.options)opt.hidden=Boolean(term)&&opt.value!==''&&!opt.textContent.toLocaleLowerCase('fr').includes(term);
  }
 }
 if(['avatarPositionX','avatarPositionY','bannerPositionX','bannerPositionY'].includes(e.target.id)){
  const avatar=document.querySelector('.sc10-profile-avatar'),banner=document.querySelector('.sc10-profile-banner');
  if(avatar)avatar.style.backgroundPosition=($('avatarPositionX')?.value||50)+'% '+($('avatarPositionY')?.value||50)+'%';
  if(banner)banner.style.backgroundPosition=($('bannerPositionX')?.value||50)+'% '+($('bannerPositionY')?.value||50)+'%';
 }
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
 // Conserver le parcours clavier dans la fenêtre affichée (dialogue ARIA).
 if(e.key==='Tab'){
  const modal=$('overlay');
  if(modal&&!modal.classList.contains('hidden')){
   const focusables=Array.from(modal.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'))
    .filter(el=>el.getClientRects().length>0);
   if(!focusables.length){e.preventDefault();return}
   const first=focusables[0],last=focusables[focusables.length-1],active=document.activeElement;
   if(!modal.contains(active)){e.preventDefault();(e.shiftKey?last:first).focus();return}
   if(e.shiftKey&&active===first){e.preventDefault();last.focus();return}
   if(!e.shiftKey&&active===last){e.preventDefault();first.focus();return}
  }
 }
 if(e.key==='Escape'){
  // La fenêtre modale est prioritaire sur le tiroir de navigation mobile.
  if(!$('overlay').classList.contains('hidden')){e.preventDefault();closeModal()}
  else if(document.body.classList.contains('drawer-open')){document.body.classList.remove('drawer-open');$('menuToggle')?.setAttribute('aria-expanded','false')}
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
if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js',{scope:'./'}).catch(e=>console.warn('Installation hors ligne indisponible:',e)))}
supa.auth.onAuthStateChange((event)=>{if(event==='PASSWORD_RECOVERY')setTimeout(openPasswordReset,120);setTimeout(loadSession,75)});
state.route=safeRoute();render();loadCreditPacks();loadSession();if(state.route==='catalog')loadCatalog(true);if(state.route==='rankings')loadRankings();loadSeasonShows();if(state.route==='packs')loadHomeShows();
clockTimer=setInterval(()=>{if(state.stock&&state.stock.stock<10){if(state.stock.recharge_seconds>0)state.stock.recharge_seconds-=1;else{state.stock.stock=Math.min(10,state.stock.stock+1);state.stock.recharge_seconds=state.stock.stock===10?0:600}
 const t=$('packTimer');if(t)t.textContent=state.stock.stock===10?'Réserve pleine':'Prochain paquet dans '+timecode(state.stock.recharge_seconds)}},1000);
