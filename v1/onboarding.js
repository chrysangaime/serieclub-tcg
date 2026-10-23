// V1.0 : aperçu de cinq cartes, uniquement en mémoire (aucun crédit ni carte attribué).
export const demoCards = (shows=[]) => {
 const seen=new Set();
 return shows.filter(s=>{if(!s?.id||!/^https:\/\//.test(s.image_url||'')||seen.has(s.id))return false;seen.add(s.id);return true})
 .slice(0,5).map((s,i)=>({series_id:s.id,name:s.name,image_url:s.image_url,rarity:['Commune','Peu commune','Rare','Commune','Épique'][i],demo:true}));
};
export const demoHTML=(s={})=>s.user?'':('<div class="sc1-demo-intro"><div><strong>Découvre un paquet sans inscription</strong><p>5 séries, aucune carte ou crédit attribué : tu peux essayer librement.</p></div><button type="button" data-demo-pack '+(demoCards(s.homeShows).length===5?'':'disabled')+'>'+(demoCards(s.homeShows).length===5?'Essayer un paquet →':'Chargement des séries…')+'</button></div>');
