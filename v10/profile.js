/** Avatar et bannière choisis parmi les séries effectivement collectionnées. */
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const safeImage=x=>/^https:\/\//i.test(x||'')?x:'';
function uniqueCards(cards=[]){
 const map=new Map();
 for(const c of cards){
  const s=c.series;
  if(s?.id!=null&&safeImage(s.image_url)&&!map.has(String(s.id)))
   map.set(String(s.id),{id:String(s.id),name:s.name||'Série',image_url:s.image_url});
 }
 return [...map.values()].sort((a,b)=>a.name.localeCompare(b.name,'fr'));
}
export function profileArtPanel(s){
 const cards=uniqueCards(s.cards);
 const avatar=cards.find(c=>c.id===String(s.avatarSeriesId));
 const banner=cards.find(c=>c.id===String(s.bannerSeriesId));
 const owned=s.officialSeasons||[];
 const badges=owned.filter(x=>x.claimed===true);
 const seriesBadges=Array.isArray(s.seriesCompletion)?s.seriesCompletion:[];
 const permanent=Array.isArray(s.permanentSeriesBadges)?s.permanentSeriesBadges:[];
 const unlockedSeries=permanent.map(x=>({
   title:x.series_name||seriesBadges.find(v=>String(v.series_id)===String(x.series_id))?.title||'Série complète',
   unlocked_at:x.unlocked_at,image_url:x.image_url
 }));
 const progress=seriesBadges.filter(x=>!x.unlocked);
 const initial=esc((s.username||'S').slice(0,1).toUpperCase());
 const avatarStyle=avatar?' style="background-image:url(&quot;'+esc(avatar.image_url)+'&quot;);background-position:'+Number(s.avatarPositionX??50)+'% '+Number(s.avatarPositionY??50)+'%"':'';
 const bannerTheme=['poster','midnight','aurora','cinema'].includes(s.bannerTheme)?s.bannerTheme:'poster';
 const bannerStyle=banner&&bannerTheme==='poster'?' style="background-image:linear-gradient(0deg,#12192388,#1219232a),url(&quot;'+esc(banner.image_url)+'&quot;);background-position:'+Number(s.bannerPositionX??50)+'% '+Number(s.bannerPositionY??50)+'%"':'';
 const options=selected=>'<option value="">Aucune affiche</option>'+cards.map(c=>
  '<option value="'+esc(c.id)+'" data-image="'+esc(c.image_url)+'"'+(String(selected)===c.id?' selected':'')+'>'+esc(c.name)+'</option>').join('');
 const premium=s.premiumActive===true;
 const frame=premium&&['gold','neon','cinema'].includes(s.premiumFrame)?s.premiumFrame:'classic';
 const titles={collectionneur:'Collectionneur',archiviste:'Archiviste des séries',legende:'Légende du Club',curateur:'Curateur de saisons'};
 const title=premium?(titles[s.premiumTitle]||titles.collectionneur):titles.collectionneur;
 const marks={star:'✦',crown:'♛',diamond:'◆',spotlight:'✺'};
 const premiumMark=premium?(marks[s.premiumBadge]||marks.star):'';
 return '<div class="sc10-profile-hero sc-premium-frame-'+frame+'">'+
  '<div class="sc10-profile-banner sc-v1-banner-'+esc(bannerTheme)+'"'+bannerStyle+' role="img" aria-label="Bannière de la série '+esc(banner?.name||'SériesClubTCG')+'"></div>'+
  '<div class="sc10-profile-row"><div class="sc10-profile-avatar"'+avatarStyle+' aria-label="Avatar du profil">'+(avatar?'':initial)+'</div>'+
  '<div><h2>'+esc(s.username||'Mon profil')+'</h2><p>'+esc(title)+(premium?' · '+premiumMark+' Premium':'')+'</p>'+
   (badges.length?'<div class="sc10-badge-strip">'+badges.map(x=>'<span title="'+esc(x.title)+'">'+esc(x.badge)+'</span>').join('')+'</div>':'')+
  '</div></div></div>'+
  (s.user?'<div class="panel sc-v1-series-badges"><h2>Albums de séries · Mes succès</h2>'+
   '<p>Chaque série est un album. Collecte une édition de chaque saison d’une série ayant au moins 3 saisons diffusées pour obtenir son badge définitif. Les doublons ne comptent pas ; les badges restent acquis après un échange.</p>'+
   (unlockedSeries.length?'<div class="sc-v1-badges">'+unlockedSeries.map(x=>
    '<span class="sc-v1-series-badge sc-v1-earned-poster-badge" title="Badge de collection obtenu">'+
    (safeImage(x.image_url)?'<img src="'+esc(x.image_url)+'" loading="lazy" alt="">':'<span class="sc-v1-badge-noimage">✦</span>')+
    '<span><b>ALBUM COMPLÉTÉ</b>'+esc(x.title)+'</span></span>').join('')+'</div>':
    '<p>Ton premier badge de série complète reste à débloquer.</p>')+
   (progress.length?'<div class="sc-v1-progress">'+
    progress.slice(0,8).map(x=>
     '<p><strong>'+esc(x.title)+'</strong> · '+Number(x.owned_seasons)+' / '+Number(x.required_seasons)+' saisons</p>').join('')+
    '</div>':'')+'</div>':'')+
  (s.user?'<div class="panel sc-premium-personalization"><h2>Personnalisation du profil</h2>'+
   '<p>'+(premium?'Choisis ton titre et ton cadre exclusif Premium.':'Les titres et cadres exclusifs sont réservés au Premium. Tu conserves gratuitement tes badges de séries et tes affiches de profil.')+'</p>'+
   (premium?'<div class="sc-premium-pickers"><label>Titre affiché<select id="premiumTitle" class="input">'+
    Object.entries(titles).map(([v,l])=>'<option value="'+v+'"'+(s.premiumTitle===v?' selected':'')+'>'+esc(l)+'</option>').join('')+
    '</select></label><label>Cadre du profil<select id="premiumFrame" class="input">'+
    [['classic','Classique'],['gold','Doré'],['neon','Néon'],['cinema','Cinéma']].map(([v,l])=>
    '<option value="'+v+'"'+(s.premiumFrame===v?' selected':'')+'>'+esc(l)+'</option>').join('')+
    '</select></label><label>Insigne Premium<select id="premiumBadge" class="input">'+
    [['star','✦ Étoile'],['crown','♛ Couronne'],['diamond','◆ Diamant'],['spotlight','✺ Projecteur']].map(([v,l])=>
    '<option value="'+v+'"'+(s.premiumBadge===v?' selected':'')+'>'+esc(l)+'</option>').join('')+
    '</select></label></div><small>Enregistre tes choix avec le bouton « Enregistrer mon profil » plus bas.</small>':
    '<button type="button" class="btn subtle" data-route="store">Découvrir Premium · 3,99 € / mois</button>')+
   '</div>':'')+
  (s.user?'<section class="panel sc-editor"><div class="sc-editor-head"><span class="caps">STUDIO DU COLLECTIONNEUR</span><h2>Personnalise ton profil</h2><p>Choisis une affiche en image, puis cadre-la directement sur ton aperçu. Les réglages sont gratuits.</p></div>'+
   '<div class="sc-editor-preview"><div class="sc-editor-banner sc-v1-banner-'+esc(bannerTheme)+'" id="profileBannerPreview"'+bannerStyle+'></div>'+
   '<div class="sc-editor-avatar" id="profileAvatarPreview"'+avatarStyle+'>'+(avatar?'':initial)+'</div><strong>'+esc(s.username||'Mon profil')+'</strong></div>'+
   '<div class="sc-editor-targets" role="group" aria-label="Choisir ce que tu souhaites modifier">'+
   '<button type="button" class="sc-editor-target active" data-editor-target="avatar" aria-pressed="true">◉ Avatar</button>'+
   '<button type="button" class="sc-editor-target" data-editor-target="banner" aria-pressed="false">▧ Bannière</button></div>'+
   '<label class="sc-editor-search-label">Rechercher une affiche parmi mes cartes<input class="input" id="profileArtSearch" type="search" placeholder="Ex. True Detective…" autocomplete="off"></label>'+
   '<div class="sc-editor-gallery" id="profileArtGallery" role="group" aria-label="Affiches disponibles">'+
   cards.map(c=>'<button type="button" class="sc-editor-poster" data-editor-art="'+esc(c.id)+'" data-editor-image="'+esc(c.image_url)+'" data-editor-name="'+esc(c.name)+'" title="'+esc(c.name)+'">'+
    '<img src="'+esc(c.image_url)+'" loading="lazy" alt="'+esc(c.name)+'"><small>'+esc(c.name)+'</small></button>').join('')+
   '</div>'+
   '<div class="sc-editor-legacy" hidden><select id="profileAvatar">'+options(s.avatarSeriesId)+'</select><select id="profileBanner">'+options(s.bannerSeriesId)+'</select></div>'+
   '<div class="sc-editor-crop"><h3>Repositionner le visuel</h3><p>Déplace directement l’image dans l’aperçu, ou ajuste finement son cadrage.</p>'+
   '<div class="sc-editor-positions"><label>Horizontal<input type="range" id="avatarPositionX" min="0" max="100" value="'+Number(s.avatarPositionX??50)+'"></label>'+
   '<label>Vertical<input type="range" id="avatarPositionY" min="0" max="100" value="'+Number(s.avatarPositionY??50)+'"></label>'+
   '<label hidden>Horizontal bannière<input type="range" id="bannerPositionX" min="0" max="100" value="'+Number(s.bannerPositionX??50)+'"></label>'+
   '<label hidden>Vertical bannière<input type="range" id="bannerPositionY" min="0" max="100" value="'+Number(s.bannerPositionY??50)+'"></label></div></div>'+
   '<label class="sc-editor-theme">Ou utiliser une bannière graphique originale<select id="bannerTheme" class="input">'+
    [['poster','Affiche de ma collection'],['midnight','Nuit bleue'],['aurora','Aurore'],['cinema','Cinéma']].map(([v,n])=>'<option value="'+v+'"'+(bannerTheme===v?' selected':'')+'>'+n+'</option>').join('')+'</select></label>'+
   '<p class="sc-editor-help">Tes modifications sont enregistrées avec le bouton « Enregistrer mon profil ».</p></section>':'');;
}
