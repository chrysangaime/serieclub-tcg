/**
 * Planification SANS risque de fusion : seules les cartes du joueur avec preuve
 * de diffusion en France et rang officiel cohérent sont candidates.
 * L'option « protéger la dernière copie » est activée par défaut.
 * Supabase reste l'autorité finale : rien n'est supprimé côté navigateur.
 */
export const fusionRanks=['Commune','Peu commune','Rare','Épique','Légendaire','Mythique','Unique'];
export const nextFusionRank=rank=>fusionRanks[fusionRanks.indexOf(rank)+1]||null;
export function fusionPlan(cards=[],rank='Commune',selected=[],marketActivity=[],protectLast=true){
 const listed=new Set(marketActivity.filter(a=>a.status==='active').map(a=>String(a.card_id)));
 const copies=new Map();
 for(const c of cards)copies.set(String(c.series_id),(copies.get(String(c.series_id))||0)+1);
 const eligible=cards.filter(c=>{
  const s=c.series||{};
  return c.rarity===rank&&s.rarity===rank&&s.fr_verified===true&&
   s.rarity_source!=='pending'&&Boolean(s.image_url)&&!c.locked&&
   !c.reserved_trade_id&&!listed.has(String(c.id));
 });
 const groups=new Map();
 for(const c of eligible){
  const id=String(c.series_id);
  if(!groups.has(id))groups.set(id,[]);
  groups.get(id).push(c);
 }
 const duplicate=[],last=[];
 for(const [seriesId,items] of groups){
  // Garder au moins une carte de chaque série, si possible.
  const spare=Math.max(0,items.length-1);
  const remaining=Number(copies.get(seriesId)||0);
  for(let i=0;i<items.length;i++){
   const meta={...items[i],isLast:i>=spare&&remaining===items.length};
   (i<spare||remaining>items.length?duplicate:last).push(meta);
  }
 }
 const all=duplicate.concat(last).sort((a,b)=>a.isLast-b.isLast||
  String(a.series?.name||'').localeCompare(String(b.series?.name||''),'fr'));
 const allowed=protectLast?all.filter(c=>!c.isLast):all;
 const known=new Set(allowed.map(c=>String(c.id)));
 const unique=[...new Set(selected.map(String))].filter(id=>known.has(id)).slice(0,10);
 return {rank,target:nextFusionRank(rank),eligible:all,allowed,selected:unique,
  selectedCards:unique.map(id=>all.find(c=>String(c.id)===id)),
  duplicates:all.filter(c=>!c.isLast).length,
  uniqueOnly:all.filter(c=>c.isLast).length,
  missing:Math.max(0,10-unique.length),ready:unique.length===10&&Boolean(nextFusionRank(rank)),
  protectLast};
}
export function autoFusion(plan){
 // Ne pas vider aveuglément les doublons d'une même série avant les autres.
 // 1. Doublons sûrs; 2. Derniers exemplaires seulement si autorisés.
 // Dans chaque catégorie, un exemplaire par série et par passage,
 // les plus anciens en premier. Aucun gain aléatoire simulé ici.
 if(!plan?.allowed?.length)return [];
 const chosen=[],seen=new Set();
 for(const tier of [false,true]){
  const groups=new Map();
  for(const card of plan.allowed.filter(c=>Boolean(c.isLast)===tier)){
   const key=String(card.series_id);
   if(!groups.has(key))groups.set(key,[]);
   groups.get(key).push(card);
  }
  for(const copies of groups.values())
   copies.sort((a,b)=>(Date.parse(a.obtained_at)||0)-(Date.parse(b.obtained_at)||0));
  while(chosen.length<10){
   let changed=false;
   for(const copies of groups.values()){
    const card=copies.shift();
    if(!card)continue;
    const id=String(card.id);
    if(!seen.has(id)){chosen.push(id);seen.add(id);changed=true}
    if(chosen.length>=10)break;
   }
   if(!changed)break;
  }
  if(chosen.length>=10)break;
 }
 return chosen;
}
export function fusionConfirmation(plan){
 if(!plan?.ready)return null;
 const last=plan.selectedCards.filter(c=>c.isLast);
 return {source:plan.rank,target:plan.target,
  consumed:plan.selectedCards.length,
  lastCount:last.length,
  lastNames:last.map(c=>c.series?.name||'Série'),
  text:'10 cartes '+plan.rank+' supprimées définitivement en échange d’une carte '+plan.target+'.'};
}
