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
   title:x.series?.name||seriesBadges.find(v=>String(v.series_id)===String(x.series_id))?.title||'Série complète',
   unlocked_at:x.unlocked_at
 }));
 const progress=seriesBadges.filter(x=>!x.unlocked);
 const initial=esc((s.username||'S').slice(0,1).toUpperCase());
 const avatarStyle=avatar?' style="background-image:url(&quot;'+esc(avatar.image_url)+'&quot;)"':'';
 const bannerStyle=banner?' style="background-image:linear-gradient(0deg,#12192388,#1219232a),url(&quot;'+esc(banner.image_url)+'&quot;)"':'';
 const options=selected=>'<option value="">Aucune affiche</option>'+cards.map(c=>
  '<option value="'+esc(c.id)+'"'+(String(selected)===c.id?' selected':'')+'>'+esc(c.name)+'</option>').join('');
 return '<div class="sc10-profile-hero">'+
  '<div class="sc10-profile-banner"'+bannerStyle+' role="img" aria-label="Bannière de la série '+esc(banner?.name||'SériesClubTCG')+'"></div>'+
  '<div class="sc10-profile-row"><div class="sc10-profile-avatar"'+avatarStyle+' aria-label="Avatar du profil">'+(avatar?'':initial)+'</div>'+
  '<div><h2>'+esc(s.username||'Mon profil')+'</h2><p>Personnalise ton identité avec tes affiches débloquées.</p>'+
   (badges.length?'<div class="sc10-badge-strip">'+badges.map(x=>'<span title="'+esc(x.title)+'">'+esc(x.badge)+'</span>').join('')+'</div>':'')+
  '</div></div></div>'+
  (s.user?'<div class="panel sc-v1-series-badges"><h2>Albums de séries · Mes succès</h2>'+
   '<p>Chaque série est un album. Collecte une édition de chaque saison diffusée pour obtenir son badge définitif. Les doublons ne comptent pas ; les badges restent acquis après un échange.</p>'+
   (unlockedSeries.length?'<div class="sc-v1-badges">'+unlockedSeries.map(x=>
    '<span class="sc-v1-series-badge" title="'+esc(x.owned_seasons)+' saisons collectionnées">✦ '+esc(x.title)+'</span>').join('')+'</div>':
    '<p>Ton premier badge de série complète reste à débloquer.</p>')+
   (progress.length?'<div class="sc-v1-progress">'+
    progress.slice(0,8).map(x=>
     '<p><strong>'+esc(x.title)+'</strong> · '+Number(x.owned_seasons)+' / '+Number(x.required_seasons)+' saisons</p>').join('')+
    '</div>':'')+'</div>':'')+
  (s.user?'<div class="panel"><h2>Mes affiches de profil</h2>'+
   '<p>Choisis ton avatar et ta bannière parmi les affiches des séries présentes dans ta collection. Aucune image à téléverser.</p>'+
   '<div class="sc10-profile-art-pickers"><label>Avatar de profil<select class="input" id="profileAvatar">'+options(s.avatarSeriesId)+'</select></label>'+
   '<label>Bannière de profil<select class="input" id="profileBanner">'+options(s.bannerSeriesId)+'</select></label></div>'+
   '<small>'+(cards.length?cards.length+' affiches débloquées disponibles. Les modifications sont enregistrées avec ton profil.':'Ouvre des paquets pour débloquer tes premières affiches.')+'</small></div>':'');
}
