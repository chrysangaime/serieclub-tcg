/**
 * Collection France : l'inventaire historique reste en base Supabase, mais
 * seules les cartes de séries validées en France sont jouables et comptées.
 * Pas de suppression ni de modification de propriété.
 */
export function frenchPlayable(entry){
 return entry?.series?.fr_verified===true&&entry?.series?.rarity_source!=='pending'&&
 ['tvmaze_fr_origin','streaming_availability_fr'].includes(entry?.series?.fr_verification_method);
}
export function partitionFrenchInventory(cards=[],wishes=[]){
 const allCards=Array.isArray(cards)?cards:[];
 const allWishes=Array.isArray(wishes)?wishes:[];
 const playableCards=allCards.filter(frenchPlayable);
 const playableWishes=allWishes.filter(frenchPlayable);
 return {
  cards:playableCards,
  wishes:playableWishes,
  excludedCardsCount:allCards.length-playableCards.length,
  excludedWishesCount:allWishes.length-playableWishes.length
 };
}
