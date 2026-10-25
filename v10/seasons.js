/**
 * SériesClubTCG · Saisons officielles et Top 20 du Club 2026.
 * Les six défis historiques sont conservés (8 séries).
 * Les six nouveaux Top 20 ont des listes FIXÉES côté PostgreSQL.
 * Jamais de récompense décidée par les données du navigateur.
 */
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const photo=x=>/^https:\/\/[^\s"'<>]+$/i.test(x||'')?esc(x):'';
const classics=[
 ['nineties','Retour dans les années 90','📼 Nostalgie','Collectionne huit séries ayant débuté dans les années 1990.',120],
 ['comedies','Rire ensemble','🎭 Comédie','Huit séries drôles à retrouver.',100],
 ['mysteres','Enquête & mystères','🔍 Enquêteur','Huit séries policières ou mystérieuses.',120],
 ['imaginaire','Vers d’autres mondes','🚀 Explorateur','Huit séries de science-fiction ou fantastiques.',150],
 ['modernes','Nouvelle vague','✨ Avant-garde','Huit séries lancées à partir de 2020.',100],
 ['patrimoine','Les grands classiques','🏆 Historien','Huit séries antérieures à l’an 2000.',150]
];
const top20=[
 ['top20_netflix_2026','Top 20 Netflix France','🎬 Binge Master','20 séries incontournables présentes sur Netflix France, édition 2026 du Club.',300,'netflix'],
 ['top20_prime_2026','Top 20 Prime Video France','🎞️ Prime Explorer','20 séries à retrouver sur Prime Video France, édition 2026 du Club.',300,'prime'],
 ['top20_disney_2026','Top 20 Disney+ France','✨ Disney Collector','20 séries à collectionner parmi les offres Disney+ France, édition 2026 du Club.',300,'disney'],
 ['top20_cultes_2026','Top 20 séries cultes','🏆 Légende TV','20 séries cultes ayant débuté avant l’an 2000.',350,'cultes'],
 ['top20_scifi_2026','Top 20 SF & Fantasy','🚀 Multivers','20 séries de science-fiction et de fantasy sélectionnées par le Club.',350,'scifi'],
 ['top20_thriller_2026','Top 20 thrillers & enquêtes','🔍 Maître enquêteur','20 séries de suspense, crimes et mystères sélectionnées par le Club.',350,'thriller']
];
export const officialSeasonCatalog=[
 ...classics.map(([id,title,badge,description,reward_credits])=>
  Object.freeze({id,title,badge,description,target_count:8,reward_credits,elite:false})),
 ...top20.map(([id,title,badge,description,reward_credits,service])=>
  Object.freeze({id,title,badge,description,target_count:20,reward_credits,elite:true,service}))
];
export function seasonBadges(rows=[]){
 return rows.filter(x=>x.claimed===true).map(x=>({id:x.id,badge:x.badge,title:x.title}));
}
function seasonCard(row,live){
 const isTop=String(row.id).startsWith('top20_');
 const total=isTop?20:Math.max(1,Number(row.target_count)||8);
 const owned=live?Math.max(0,Math.min(total,Number(row.owned)||0)):0;
 const claimed=live&&row.claimed===true,ready=live&&owned>=total;
 const tracked=Array.isArray(row.trackedSeasons)&&row.trackedSeasons.includes(row.id);
 const badge=String(row.badge||'🏆 Collectionneur');
 const icon=badge.split(' ')[0];
 const progress=live?Math.round(owned/total*100):0;
 const status=claimed?'Badge débloqué':!live?'Activation serveur nécessaire':ready?'Objectif atteint':'+'+Number(row.reward_credits||0)+' crédits à gagner';
 return '<article class="sc10-season-card sc19-season-card'+
  (isTop?' sc19-top20 sc19-top20-'+esc(String(row.service||'club')):' sc19-classic')+
  (claimed?' is-claimed':'')+(tracked?' is-tracked':'')+'">'+
  '<div class="sc19-season-top"><span class="sc19-season-icon" aria-hidden="true">'+esc(icon)+'</span>'+
  '<span class="sc19-season-kind">'+(isTop?'TOP 20 · ÉDITION 2026':'SAISON CLASSIQUE')+'</span></div>'+
  '<h3>'+esc(row.title)+'</h3><p>'+esc(row.description)+'</p>'+
  '<div class="sc19-season-counter"><strong>'+(live?owned:'—')+' <small>/ '+total+'</small></strong>'+
  '<span>'+(isTop?'séries distinctes':'séries')+'</span></div>'+
  '<div class="sc10-progress" role="progressbar" aria-label="Progression de '+esc(row.title)+
  '" aria-valuenow="'+owned+'" aria-valuemin="0" aria-valuemax="'+total+'"><span style="width:'+progress+'%"></span></div>'+
  '<small class="sc19-season-status">'+esc(status)+'</small>'+
  (claimed?'<div class="sc10-badge-strip"><span>✓ '+esc(badge)+'</span></div>':
   '<button type="button" class="btn primary sc19-claim" data-claim-season="'+esc(row.id)+'"'+
    (!ready?' disabled':'')+'>'+(ready?'Débloquer '+esc(badge)+' · +'+row.reward_credits+' crédits':
      'Continuer ma collection')+'</button>')+
  (isTop?'<button class="sc19-season-guide" type="button" data-season-details="'+esc(row.id)+'">'+
   'Voir les 20 séries à collectionner <span aria-hidden="true">↗</span></button>'+ '<span class="sc20-follow-caption">'+(tracked?'✓ Suivi automatique actif':'Souhaits et protections automatiques disponibles')+'</span>':'')+
  '</article>';
}
export function officialSeasonHTML(s={}){
 const serverRows=Array.isArray(s.officialSeasons)?s.officialSeasons:[];
 const serverById=new Map(serverRows.map(r=>[r.id,r]));
 const rows=officialSeasonCatalog.map(base=>serverById.has(base.id)?
  {...base,...serverById.get(base.id),trackedSeasons:s.trackedSeasons||[]}:{...base,owned:0,claimed:false,trackedSeasons:s.trackedSeasons||[]});
 const old=rows.slice(0,6).map(r=>seasonCard(r,serverById.has(r.id))).join('');
 const new20=rows.slice(6).map(r=>seasonCard(r,serverById.has(r.id))).join('');
 return '<section class="sc10-season-section sc19-season-section" aria-label="Défis thématiques de collection">'+
 '<div class="sc10-season-heading"><div><span class="caps">DÉFIS DE COLLECTION · OFFICIELS</span>'+
 '<h2>Défis thématiques</h2></div><small>12 défis · collections de 8 ou 20 séries</small></div>'+
 '<p>Collectionne des séries différentes pour progresser. Un badge permanent et des crédits récompensent chaque défi validé une seule fois.</p>'+
 (s.officialSeasonError?'<div class="sc10-season-unavailable" role="status">'+esc(s.officialSeasonError)+'</div>':'')+
 '<div class="sc19-chapter"><div><span class="caps">PREMIÈRE PARTIE</span><h3>Les défis classiques</h3>'+
 '<p>Six collections de 8 séries pour commencer ton parcours.</p></div><span>01 / 02</span></div>'+
 '<div class="sc10-season-grid">'+old+'</div>'+
 '<div class="sc19-chapter sc19-chapter-elite"><div><span class="caps">COLLECTIONS EXPERT · 2026</span>'+
 '<h3>Les Top 20 du Club</h3><p>Six sélections exigeantes, 20 titres précis chacune. Séries diffusées en France, liste fixe pour toute l’édition.</p>'+
 '</div><span>02 / 02</span></div>'+
 '<p class="sc19-editorial-note">Sélections éditoriales classées selon la popularité du catalogue. Il ne s’agit pas des Top 20 officiels de visionnage des plateformes. Les listes sont figées afin de préserver ta progression.</p>'+
 '<div class="sc20-all-toolbar"><div><strong>Préparer mes collections Top 20</strong><small>Les manquantes vont aux souhaits ; un exemplaire possédé est protégé automatiquement.</small></div>'+ '<button class="btn primary" data-sync-all-seasons type="button" '+(!s.user?'disabled':'')+'>✦ Préparer mes 6 Top 20</button></div>'+ '<div class="sc10-season-grid sc19-top20-grid">'+new20+'</div>'+
 '</section>';
}
/** Liste provenant de Supabase : aucun titre inventé dans le client. */
export function officialSeasonDetailsHTML(season,rows=[],options={}){
 const id=esc(season?.id||''),title=esc(season?.title||'Top 20 du Club');
 const valid=Array.isArray(rows)&&rows.length===20&&rows.every(x=>Number.isSafeInteger(Number(x.series_id))&&Number(x.series_id)>0);
 const owned=valid?rows.filter(x=>x.owned===true).length:0;
 const followed=options.tracked===true,authenticated=options.user===true;
 return '<div class="dialog sc19-season-dialog" role="dialog" aria-modal="true" aria-label="Sélection '+title+'">'+
  '<button type="button" class="close" data-close aria-label="Fermer">×</button>'+
  '<span class="caps">TOP 20 DU CLUB · FRANCE · ÉDITION 2026</span><h2>'+title+'</h2>'+
  '<p>Réunis les 20 séries précises de cette édition. Leur présence sur une plateforme était documentée lors de la sélection 2026 et peut évoluer.</p>'+
  (valid?'<div class="sc20-follow-panel"><div><strong>'+(followed?'✓ Suivi intelligent actif':'Préparer automatiquement ma collection')+'</strong><p>'+(followed?'Les futurs tirages seront protégés et les séries manquantes resteront dans tes souhaits.':'Un clic ajoute les titres manquants aux souhaits et protège un seul exemplaire de chaque série possédée.')+'</p></div>'+ (authenticated?'<div class="sc20-follow-buttons"><button class="btn primary" type="button" data-sync-season="'+id+'">'+(followed?'Actualiser les souhaits et protections':'Suivre et préparer la saison')+'</button>'+(followed?'<button class="btn subtle" type="button" data-unfollow-season="'+id+'">Arrêter le suivi</button>':'')+'</div>':'<button class="btn subtle" type="button" data-auth>Se connecter pour suivre</button>')+'</div>'+ '<div class="sc19-detail-progress"><strong>'+owned+' / 20 séries possédées</strong>'+
   '<div class="sc10-progress"><span style="width:'+Math.round(owned/20*100)+'%"></span></div></div>'+
   '<div class="sc19-detail-grid">'+rows.map(r=>'<button type="button" class="sc19-detail-item'+
    (r.owned?' is-owned':'')+'" data-series="'+Number(r.series_id)+'">'+
    '<span class="sc19-detail-poster">'+(photo(r.image_url)?'<img src="'+photo(r.image_url)+'" alt="" loading="lazy">':'<span aria-hidden="true">▣</span>')+
    '<span class="sc19-detail-rank">'+String(Number(r.rank_number)||'?')+'</span></span>'+
    '<strong>'+esc(r.name)+'</strong><small>'+(r.owned?'✓ Dans ta collection':options.wishes?.includes(Number(r.series_id))?'★ Dans mes souhaits':'À collectionner')+'</small></button>').join('')+'</div>':
   '<div class="sc10-season-unavailable" role="status">Cette sélection n’est pas encore activée dans la base du jeu. Les 20 titres seront visibles une fois validés.</div>')+
  '<p class="sc19-detail-foot">Défi fondé sur les séries françaises certifiées du catalogue. Les badges et crédits sont vérifiés par le serveur.</p>'+
 '</div>';
}
