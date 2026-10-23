/**
 * V1 · Consultation libre des disponibilités françaises (sans API TMDB
 * ni copie d'offres JustWatch). Le catalogue TVmaze reste la source des séries.
 *
 * Un lien général vers JustWatch est une navigation externe, et non une
 * intégration partenaire ni une promesse d'offres effectivement disponibles.
 */
const ROOT='https://www.justwatch.com/fr';
export const platformLogoUsageApproved=false;
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({
 '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'
}[c]));
export function getFrenchOriginChannel(show={}){
 const channels=[show.network,show.webChannel];
 return [...new Set(channels.filter(c=>c?.country?.code==='FR'&&typeof c.name==='string')
  .map(c=>c.name.trim()).filter(Boolean))];
}
/** Aucun ancien relevé TMDB / JustWatch ne doit être présenté comme une offre. */
export function normalizeFranceOffers(_historicalRecord){return null;}
/** Le jeu n'envoie plus de requêtes vers les caches de plateformes. */
export async function getFrenchOffersByShow(_tvmazeId){return null;}
export function renderFranceAvailability(_historicalRecord=null,show={}){
 const origin=getFrenchOriginChannel(show);
 const tvmazeVerified=show.fr_verification_method==='tvmaze_fr_origin'||origin.length>0;
 const announcement=tvmazeVerified&&origin.length>0&&
  /^\d{4}-\d{2}-\d{2}$/.test(show.premiered||'')&&
  Date.parse(show.premiered+'T00:00:00Z')>Date.now();
 const detail=announcement?'Chaîne française annoncée : ': 'Diffuseur d’origine en France : ';
 const note=origin.length
  ?'<span class="sc56-origin">'+detail+origin.map(esc).join(', ')+'</span>'
  :'';
 const source=tvmazeVerified
  ?'Origine française documentée par TVmaze · offres actuelles non vérifiées'
  :'Les offres actuelles ne sont pas renseignées par le jeu';
 return '<section class="sc56-where" aria-label="Consulter les offres en France">'+
   '<div class="sc56-main"><strong class="sc56-label">Où regarder en France ?</strong>'+
   '<span class="sc56-no-offers">Offres de streaming non confirmées</span></div>'+
   '<div class="sc56-foot"><span>'+esc(source)+'</span>'+
   '<a href="'+ROOT+'" target="_blank" rel="noopener noreferrer">'+
   'Vérifier sur JustWatch France ↗</a>'+note+'</div></section>';
}
export function justwatchFranceUrl(){return ROOT;}
