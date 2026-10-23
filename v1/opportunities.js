/** SériesClubTCG V1.0 — centre d'opportunités calculé à partir des données reçues. */
import {esc,money} from '../v3/views.js?v=5.6.1';
export function opportunityData(state={}){
 const userId=state.user?.id;
 const offers=Array.isArray(state.tradeOffers)?state.tradeOffers:[];
 const listings=Array.isArray(state.marketListings)?state.marketListings:[];
 const wantedIds=new Set((state.wishes||[]).map(w=>Number(w.series_id)).filter(Number.isSafeInteger));
 const received=userId?offers.filter(o=>o.status==='pending'&&o.seller_id===userId):[];
 const sent=userId?offers.filter(o=>o.status==='pending'&&o.proposer_id===userId):[];
 const wanted=userId?listings.filter(l=>wantedIds.has(Number(l.series_id))&&l.seller_id!==userId):[];
 return {received,sent,wanted,count:received.length+wanted.length,hasData:!!userId};
}
export function opportunityPanel(state={}){
 const o=opportunityData(state);
 if(!o.hasData)return '';
 const limitedWanted=o.wanted.slice(0,3);
 return '<section class="sc1-opportunities" id="sc1-opportunities" aria-label="Mes opportunités du club">'+
 '<div class="sc1-opportunities-head"><div><span class="caps">TON CLUB EN DIRECT</span><h2>À ne pas manquer.</h2>'+
 '<p>Des opportunités issues de tes souhaits et de tes propositions d’échange, sans publicité ni suivi externe.</p></div>'+
 '<span class="sc1-opportunities-count">'+money(o.count)+' opportunité'+(o.count>1?'s':'')+'</span></div>'+
 '<div class="sc1-opportunities-grid">'+
 '<article><div class="sc1-opportunities-stat"><span>⇆</span><strong>'+money(o.received.length)+'</strong></div>'+
 '<h3>Offres reçues</h3><p>'+ (o.received.length?'Un autre collectionneur attend une réponse. Consulte la proposition avant de décider.':'Aucune proposition en attente.')+'</p>'+
 '<button type="button" class="btn subtle small" data-opportunities-trades '+(!o.received.length?'disabled':'')+'>Voir mes échanges →</button></article>'+
 '<article><div class="sc1-opportunities-stat"><span>☆</span><strong>'+money(o.wanted.length)+'</strong></div>'+
 '<h3>Souhaits disponibles</h3><p>'+ (o.wanted.length?'Des séries de tes souhaits figurent parmi les dernières annonces affichées.':'Aucune correspondance parmi les dernières annonces chargées.')+'</p>'+
 '<button type="button" class="btn subtle small" data-opportunities-wishes '+(!o.wanted.length?'disabled':'')+'>Voir mes souhaits en vente →</button></article>'+
 '<article><div class="sc1-opportunities-stat"><span>↗</span><strong>'+money(o.sent.length)+'</strong></div>'+
 '<h3>Propositions envoyées</h3><p>'+(o.sent.length?'Ces propositions attendent la décision d’un autre joueur.':'Aucune proposition envoyée en attente.')+'</p>'+
 '<button type="button" class="btn subtle small" data-opportunities-trades '+(!o.sent.length?'disabled':'')+'>Suivre mes propositions →</button></article></div>'+
 (limitedWanted.length?'<div class="sc1-opportunity-matches"><strong>Dans ta liste de souhaits</strong><div>'+
 limitedWanted.map(item=>'<span class="sc1-opportunity-match">'+esc(item.series_name)+'<small>◇ '+money(item.price)+' crédits</small></span>').join('')+
 '</div></div>':'')+
 '<p class="sc1-opportunities-note">Données à la demande : les annonces peuvent disparaître ou changer de prix. Ce panneau ne garantit pas leur disponibilité future.</p></section>';
}
