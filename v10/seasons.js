const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const builtin=[
 ['nineties','Retour dans les années 90','📼 Nostalgie','Collectionne huit séries ayant débuté dans les années 1990.',120],
 ['comedies','Rire ensemble','🎭 Comédie','Huit séries drôles à retrouver.',100],
 ['mysteres','Enquête & mystères','🔍 Enquêteur','Huit séries policières ou mystérieuses.',120],
 ['imaginaire','Vers d’autres mondes','🚀 Explorateur','Huit séries de science-fiction ou fantastiques.',150],
 ['modernes','Nouvelle vague','✨ Avant-garde','Huit séries lancées à partir de 2020.',100],
 ['patrimoine','Les grands classiques','🏆 Historien','Huit séries antérieures à l’an 2000.',150]
];
export const officialSeasonCatalog=builtin.map(([id,title,badge,description,reward_credits])=>
 Object.freeze({id,title,badge,description,target_count:8,reward_credits}));
export function seasonBadges(rows=[]){
 return rows.filter(x=>x.claimed===true).map(x=>({id:x.id,badge:x.badge,title:x.title}));
}
export function officialSeasonHTML(s){
 const rows=Array.isArray(s.officialSeasons)?s.officialSeasons:officialSeasonCatalog;
 const live=Array.isArray(s.officialSeasons);
 return '<section class="sc10-season-section" aria-label="Saisons officielles">'+
 '<div class="sc10-season-heading"><div><span class="caps">DÉFIS DE COLLECTION · OFFICIELS</span><h2>Les Saisons à compléter</h2></div>'+
 '<small>6 saisons · badges et crédits après validation</small></div>'+
 '<p>Collectionne des séries différentes du thème pour progresser. Chaque saison terminée débloque un badge permanent et des crédits une seule fois.</p>'+
 (s.officialSeasonError?'<div class="sc10-season-unavailable" role="status">Les récompenses seront activées dès que la migration « Saisons officielles » sera installée sur Supabase. La collection reste utilisable.</div>':'')+
 '<div class="sc10-season-grid">'+rows.map(row=>{
  const total=Math.max(1,Number(row.target_count)||8),owned=Math.min(total,Number(row.owned)||0);
  const claimed=row.claimed===true,ready=owned>=total;
  return '<article class="sc10-season-card'+(claimed?' is-claimed':'')+'"><span aria-hidden="true">'+esc(row.badge.split(' ')[0])+'</span>'+
   '<h3>'+esc(row.title)+'</h3><p>'+esc(row.description)+'</p>'+
   '<div class="sc10-progress" role="progressbar" aria-label="Progression de '+esc(row.title)+'" aria-valuenow="'+(live?owned:0)+'" aria-valuemin="0" aria-valuemax="'+total+'"><span style="width:'+(live?Math.round(owned/total*100):0)+'%"></span></div>'+
   '<small>'+(live?owned+'/'+total:'—/'+total)+' séries · '+(claimed?'Badge débloqué':ready?'Objectif atteint':'+'+row.reward_credits+' crédits à gagner')+'</small>'+
   (claimed?'<div class="sc10-badge-strip"><span>✓ '+esc(row.badge)+'</span></div>':
    '<button class="btn primary" data-claim-season="'+esc(row.id)+'"'+(!ready||!live?' disabled':'')+'>'+
     (ready&&live?'Obtenir mon badge et +'+row.reward_credits+' crédits':'Continuer ma collection')+'</button>')+
   '</article>';
 }).join('')+'</div></section>';
}
