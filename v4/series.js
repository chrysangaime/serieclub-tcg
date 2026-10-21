/**
 * SérieClub — Fiches enrichies et recherche par distribution.
 *
 * TVmaze : https://www.tvmaze.com/api
 * Aucun secret / aucune clé dans le navigateur. Les fiches d'acteurs,
 * résumés et crédits sont chargés uniquement à la demande.
 */
import {whereToWatchLink,amazonSearchLink,amazonIsAffiliate} from '../v3/discovery.js?v=3.1.0';

const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({
  '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
}[c]));
const imageURL = value => /^https:\/\//i.test(value || '') ? escapeHTML(value) : '';
const tvmazeLink = value => {
  try {
    const u=new URL(String(value||''));
    return u.protocol==='https:'&&(u.hostname==='tvmaze.com'||u.hostname==='www.tvmaze.com')
      ? escapeHTML(u.href) : 'https://www.tvmaze.com/';
  } catch { return 'https://www.tvmaze.com/'; }
};
const validId = value => Number.isSafeInteger(Number(value)) && Number(value) > 0 ? Number(value) : null;
const apiRoot = 'https://api.tvmaze.com';
const cache = new Map();
const freshFor = 30 * 60 * 1000;
const MAX_SHOWS = 120;

export function stripSummary(raw = '') {
  const entities = {
    amp:'&', lt:'<', gt:'>', quot:'"', apos:"'",
    nbsp:' ', hellip:'…', rsquo:'’', lsquo:'‘', ldquo:'“', rdquo:'”',
    ndash:'–', mdash:'—', eacute:'é', egrave:'è', agrave:'à',
    ecirc:'ê', euml:'ë', ugrave:'ù', ccedil:'ç', Eacute:'É'
  };
  return String(raw ?? '')
    .replace(/<\s*br\s*\/?>/gi, ' ')
    .replace(/<\/(?:p|div|li)>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(#(?:x[\da-f]+|\d+)|[a-z]+);/gi, (whole,key) => {
      if (key[0] === '#') {
        const hex = /^#x/i.test(key);
        const n = Number.parseInt(key.slice(hex?2:1),hex?16:10);
        return Number.isInteger(n) && n > 0 && n <= 0x10ffff && !(n >= 0xd800 && n <= 0xdfff)
          ? String.fromCodePoint(n) : ' ';
      }
      return Object.hasOwn(entities,key) ? entities[key] : whole;
    })
    .replace(/\s+/g, ' ').trim();
}
export function miniSummary(text, limit = 310) {
  const value = stripSummary(text);
  if (value.length <= limit) return value;
  const cut = value.slice(0,limit);
  return cut.replace(/\s+\S*$/,'') + '…';
}
const formatYear = value => /^\d{4}/.test(value || '') ? String(value).slice(0,4) : '';
const photo = (value, alt, className = '') => {
  const url = imageURL(value);
  return url ? '<img class="'+escapeHTML(className)+'" loading="lazy" src="'+url+'" alt="'+escapeHTML(alt)+'">'
    : '<div class="sc5-photo-fallback '+escapeHTML(className)+'" aria-label="'+escapeHTML(alt)+'">✧</div>';
};
const display = value => value != null && value !== '' ? String(value) : '—';
const genrePills = (genres=[]) => (Array.isArray(genres)?genres:[])
  .slice(0,8).map(g=>'<span>'+escapeHTML(g)+'</span>').join('');

async function getJSON(path, allow404=false) {
  const hit = cache.get(path);
  if (hit && Date.now() < hit.expires) return hit.promise;
  const promise = (async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9500);
    try {
      const response = await fetch(apiRoot + path, {headers:{Accept:'application/json'},signal:controller.signal});
      if(response.status === 404 && allow404) return null;
      if(!response.ok) {
        if(response.status===429) throw new Error('TVmaze est temporairement saturé. Réessaie dans quelques instants.');
        throw new Error('TVmaze est momentanément indisponible (HTTP '+response.status+').');
      }
      return response.json();
    } catch(error) {
      if(error.name === 'AbortError') throw new Error('La réponse de TVmaze prend trop de temps. Réessaie.');
      throw error;
    } finally { clearTimeout(timeout); }
  })();
  cache.set(path,{promise,expires:Date.now()+freshFor});
  promise.catch(()=>{if(cache.get(path)?.promise === promise)cache.delete(path)});
  if(cache.size>250)cache.delete(cache.keys().next().value);
  return promise;
}
export async function getShowDetails(id) {
  const value = validId(id);
  if(!value) throw new Error('Identifiant de série invalide');
  return getJSON('/shows/'+value+'?embed%5B%5D=cast&embed%5B%5D=seasons',true);
}
export async function searchPeople(query) {
  const q=String(query||'').trim().slice(0,75);
  if(q.length<2) return [];
  const values=await getJSON('/search/people?q='+encodeURIComponent(q));
  return (Array.isArray(values)?values:[])
    .map(x=>x.person).filter(x=>x?.id&&x?.name).slice(0,16);
}
export async function getPersonFilmography(id) {
  const value=validId(id);
  if(!value) throw new Error('Identifiant d’acteur invalide');
  const [person,credits]=await Promise.all([
    getJSON('/people/'+value,true),
    getJSON('/people/'+value+'/castcredits?embed=show')
  ]);
  if(!person) throw new Error('Acteur introuvable');
  const seen=new Set();
  const shows=(Array.isArray(credits)?credits:[])
    .map(credit=>({
      ...(credit._embedded?.show||{}),
      role:credit._embedded?.character?.name||''
    }))
    .filter(show=>show?.id&&show?.name&&!seen.has(show.id)&&seen.add(show.id))
    .sort((a,b)=>(b.premiered||'').localeCompare(a.premiered||''))
    .slice(0,MAX_SHOWS);
  return {person,shows};
}
function externalLinks(title){
  return '<div class="sc5-external">'+
    '<a class="btn primary" target="_blank" rel="noopener noreferrer" href="'+whereToWatchLink(title)+'">Où regarder ? ↗</a>'+
    '<a class="btn subtle" target="_blank" rel="noopener noreferrer" href="'+amazonSearchLink(title)+'">Rechercher un coffret ↗</a>'+
    '</div><p class="ad-label">'+(amazonIsAffiliate()
      ? 'Lien marchand pouvant générer une commission pour SérieClub.'
      : 'Liens de recherche non affiliés pour le moment.')+
    ' Les disponibilités de streaming ne sont pas vérifiées. SérieClub est indépendant des diffuseurs.</p>';
}

export function frenchSynopsisHTML(result={source:'loading',text:''},english=''){
 if(result.source==='loading'){
  return '<p class="sc5-synopsis-wait" role="status">Recherche du résumé en français…</p>';
 }
 if(result.text){
  const full=stripSummary(result.text),short=miniSummary(full,225);
  const attribution=result.source==='wikipedia'
   ? '<p class="sc5-synopsis-source">Extrait abrégé des contributeurs de <a href="'+
       (/^https:\/\/fr\.wikipedia\.org\/\?curid=\d+$/.test(result.sourceUrl||'')?escFR(result.sourceUrl):'https://fr.wikipedia.org/')+
       '" target="_blank" rel="noopener noreferrer">Wikipédia en français ↗</a> · <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.fr" target="_blank" rel="noopener noreferrer">CC BY-SA 4.0</a> (texte abrégé).</p>'
   :result.source==='translated'
    ?'<p class="sc5-synopsis-source">Traduction automatique de données <a href="https://www.tvmaze.com/api#licensing" target="_blank" rel="noopener noreferrer">TVmaze (CC BY-SA) ↗</a>. Des imprécisions sont possibles.</p>'
    :'<p class="sc5-synopsis-source">Résumé original SérieClub.</p>';
  return '<p class="sc5-summary-short">'+escFR(short)+'</p>'+
   (short.length<full.length?'<p class="sc5-summary-long hidden">'+escFR(full)+'</p>'+
     '<button class="sc5-text-btn" data-summary-toggle aria-expanded="false">Lire la suite ↓</button>':'')+
   attribution;
 }
 return '<p class="sc5-synopsis-unavailable">Aucun résumé français fiable n’est disponible actuellement pour cette série.</p>'+
  (english?'<details class="sc5-english-original"><summary>Consulter le synopsis original en anglais</summary><p>'+escFR(stripSummary(english))+'</p></details>':'');
}
const escFR=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function showDetailHTML(source={},base={},french={source:'loading'}){
 const show={...base,...source},name=show.name||'Série';
 const summary=stripSummary(show.summary||base.summary);
 const cast=Array.isArray(show._embedded?.cast)?show._embedded.cast:[];
 const seasons=Array.isArray(show._embedded?.seasons)?show._embedded.seasons.length:null;
 const year=formatYear(show.premiered),status=show.status==='Ended'?'Terminée':show.status==='Running'?'En cours':show.status||'';
 const officialRarity=base.rarity&&base.rarity_source!=='pending'?base.rarity:null;
 const poster=show.image?.medium||show.image?.original||show.image_url||base.image_url;
 const castRows=cast.filter(x=>x.person?.id&&x.person?.name).slice(0,24).map(x=>
  '<button class="sc5-cast-row" data-person="'+x.person.id+'" aria-label="Voir les séries de '+escapeHTML(x.person.name)+'">'+photo(x.person.image?.medium||x.person.image?.original,x.person.name,'sc5-cast-thumb')+'<b>'+escapeHTML(x.person.name)+'</b>'+
  (x.character?.name?'<small>'+escapeHTML(x.character.name)+'</small>':'')+'<span class="sc5-row-arrow" aria-hidden="true">↗</span></button>').join('');
 const more=[
  ['Diffusion',show.webChannel?.name||show.network?.name],['Langue',show.language],
  ['Épisode',show.averageRuntime||show.runtime?(show.averageRuntime||show.runtime)+' min':''],
  ['Note TVmaze',Number(show.rating?.average)>0?show.rating.average+'/10':'']
 ].filter(([,v])=>Boolean(v));
 const imdb=show.externals?.imdb&&/^[a-z0-9]+$/i.test(show.externals.imdb)?'https://www.imdb.com/title/'+show.externals.imdb+'/':null;
 return '<div class="dialog sc5-dialog sc5-compact-dialog" role="dialog" aria-modal="true" aria-label="Fiche de '+escapeHTML(name)+'">'+
  '<button class="close" data-close aria-label="Fermer">×</button>'+
  '<div class="sc5-show-head">'+photo(poster,'Affiche de '+name,'sc5-poster')+
  '<div class="sc5-show-intro"><span class="caps">SÉRIECLUB · LA SÉRIE</span><h2>'+escapeHTML(name)+'</h2>'+
  '<div class="sc5-tagline">'+[year,status,seasons!=null?seasons+' saison'+(seasons>1?'s':''):null].filter(Boolean).map(v=>'<span>'+escapeHTML(v)+'</span>').join('')+'</div>'+
  '<div class="detail-tags">'+genrePills(show.genres||base.genres)+(officialRarity?'<span class="sc5-official-rarity">✦ '+escapeHTML(officialRarity)+' · officielle</span>':'')+'</div>'+
  '<h3>En quelques mots</h3><div class="sc5-synopsis" data-synopsis>'+frenchSynopsisHTML(french,summary)+'</div>'+
  '</div></div>'+
  (more.length?'<details class="sc5-meta-more"><summary>Informations complémentaires</summary><div class="sc5-facts">'+more.map(([label,val])=>'<div><small>'+escapeHTML(label)+'</small><strong>'+escapeHTML(val)+'</strong></div>').join('')+'</div></details>':'')+
  '<section class="sc5-cast-section"><div class="sc5-section-head"><div><span class="caps">DISTRIBUTION</span><h3>Acteurs et personnages</h3></div><span class="sc5-muted">Clique sur un nom pour ses autres séries</span></div>'+
  (castRows?'<div class="sc5-cast-list">'+castRows+'</div>':'<p class="sc5-muted">Distribution non renseignée.</p>')+'</section>'+
  '<div class="sc5-compact-footer">'+externalLinks(name)+
  '<div class="sc5-bottom"><a href="'+tvmazeLink(show.url)+'" target="_blank" rel="noopener noreferrer">Source TVmaze ↗</a>'+
  (imdb?'<a href="'+imdb+'" target="_blank" rel="noopener noreferrer">IMDb ↗</a>':'')+'</div></div></div>';
}
export function actorDetailHTML(person,shows=[],catalogueIds=new Set(),fromShow=false){
 const name=person?.name||'Artiste';
 const birth=person?.birthday?new Date(person.birthday+'T12:00:00').toLocaleDateString('fr-FR'):'';
 const rows=shows.map(show=>
  '<button class="sc5-credit-row" data-series="'+show.id+'" aria-label="Ouvrir la série '+escapeHTML(show.name)+'">'+
  photo(show.image?.medium||show.image?.original,show.name,'sc5-credit-thumb')+'<b>'+escapeHTML(show.name)+'</b>'+
  (formatYear(show.premiered)?'<small>'+escapeHTML(formatYear(show.premiered))+'</small>':'')+
  (show.role?'<small class="sc5-credit-role">'+escapeHTML(show.role)+'</small>':'')+
  (catalogueIds.has(show.id)?'<em>Dans SérieClub</em>':'')+
  '<span class="sc5-row-arrow" aria-hidden="true">↗</span></button>').join('');
 return '<div class="dialog sc5-dialog sc5-actor-dialog sc5-compact-dialog" role="dialog" aria-modal="true" aria-label="Acteur '+escapeHTML(name)+'">'+
  '<button class="close" data-close aria-label="Fermer">×</button><button class="sc5-back" data-person-back>← '+(fromShow?'Retour à la série':'Fermer')+'</button>'+
  '<div class="sc5-actor-head">'+photo(person.image?.medium||person.image?.original,name,'sc5-actor-portrait')+
  '<div><span class="caps">SÉRIECLUB · ACTEUR</span><h2>'+escapeHTML(name)+'</h2>'+
  ([birth,person?.country?.name].filter(Boolean).length?'<p>'+[birth,person?.country?.name].filter(Boolean).map(escapeHTML).join(' · ')+'</p>':'')+
  '<p class="sc5-muted">'+shows.length+' série'+(shows.length>1?'s':'')+' sur TVmaze</p>'+
  '<button class="sc5-text-btn" data-filter-actor="'+validId(person.id)+'">Filtrer le catalogue par cet acteur →</button></div></div>'+
  '<section class="sc5-actor-series"><div class="sc5-section-head"><h3>Ses séries</h3><span class="sc5-muted">Clique sur un titre pour sa fiche</span></div>'+
  (rows?'<div class="sc5-credits">'+rows+'</div>':'<div class="sc5-empty">Aucune série référencée.</div>')+
  '</section><div class="sc5-bottom"><a href="'+tvmazeLink(person.url)+'" target="_blank" rel="noopener noreferrer">Source TVmaze ↗</a></div></div>';
}

export function actorCatalogueView(state) {
  const chosen=state.actorSelected;
  const q=state.actorQuery||'';
  const people=state.actorMatches||[];
  const shows=state.actorShows||[];
  const inCatalogue=new Set(state.actorCatalogueIds||[]);
  const onlyClub=Boolean(state.actorOnlyClub);
  const visibleShows=onlyClub?shows.filter(show=>inCatalogue.has(show.id)):shows;
  return '<div class="page-content sc5-catalog"><div class="page-title"><span class="caps">SÉRIECLUB · LA DISTRIBUTION</span><h1>Recherche par acteur</h1><p>Retrouve les séries dans lesquelles joue un acteur ou une actrice, même si elles ne figurent pas encore dans les boosters.</p></div>'+
    '<div class="sc5-mode"><button class="btn subtle" data-catalog-mode="series">▦ Par série</button>'+
    '<button class="btn primary" data-catalog-mode="actors">♙ Par acteur</button></div>'+
    '<div class="sc5-actor-search"><input class="input" id="actorSearchQuery" type="search" maxlength="75" placeholder="Nom de l’acteur ou actrice…" value="'+escapeHTML(q)+'">'+
    '<button class="btn primary" id="actorSearchSubmit">Rechercher</button>'+
    (chosen?'<button class="btn subtle" data-actor-reset>Effacer le filtre</button>':'')+'</div>'+
    (state.actorLoading?'<div class="sc5-empty">Recherche de la distribution en cours…</div>':'')+
    (state.actorError?'<div class="notice">'+escapeHTML(state.actorError)+'</div>':'')+
    (!state.actorLoading&&people.length?'<div class="sc5-person-results">'+people.map(person=>
      '<button class="sc5-person-result" data-select-actor="'+person.id+'">'+photo(person.image?.medium||person.image?.original,person.name,'sc5-search-thumb')+'<span><b>'+escapeHTML(person.name)+'</b>'+
      (person.country?.name?'<small>'+escapeHTML(person.country.name)+'</small>':'')+'</span>'+
      '<span class="sc5-person-arrow">Voir ses séries →</span></button>').join('')+'</div>':'')+
    (chosen?'<div class="sc5-filmography-top"><div><span class="caps">FILTRÉ PAR ARTISTE</span><h2>'+escapeHTML(chosen.name)+'</h2><p>'+shows.length+' série'+(shows.length>1?'s':'')+' trouvée'+(shows.length>1?'s':'')+' sur TVmaze. Les mentions « Dans SérieClub » concernent le catalogue jouable.</p></div>'+
      '<div class="sc5-actor-controls"><label><input type="checkbox" id="actorOnlyClub" '+(onlyClub?'checked':'')+'> Dans SérieClub uniquement</label><button class="btn subtle" data-person="'+chosen.id+'">Fiche acteur ↗</button></div></div>'+
      (visibleShows.length?'<div class="sc5-filmography-grid">'+visibleShows.map(show=>
        '<button class="sc5-filmography-item" data-series="'+show.id+'">'+photo(show.image?.medium||show.image?.original,show.name,'sc5-list-thumb')+'<b>'+escapeHTML(show.name)+'</b><small>'+escapeHTML(formatYear(show.premiered))+'</small>'+
        (inCatalogue.has(show.id)?'<span class="sc5-available">Dans SérieClub</span>':'')+
        '<span class="sc5-row-arrow" aria-hidden="true">↗</span></button>').join('')+'</div>':'<div class="sc5-empty">'+(onlyClub?'Aucune série présente dans le catalogue SérieClub. Désactive le filtre pour voir sa filmographie TVmaze.':'Aucune série référencée pour cet acteur.')+'</div>')+
      '</div>':'')+
    (!chosen&&!state.actorLoading&&!people.length?'<div class="sc5-search-invitation"><span>✧</span><h2>Toutes les séries, un visage à la fois.</h2><p>Saisis un nom pour retrouver les artistes et accéder à leur filmographie.</p></div>':'')+
    '<p class="sc5-api-credit">Les biographies, distributions et filmographies sont fournies par <a href="https://www.tvmaze.com/" target="_blank" rel="noopener noreferrer">TVmaze ↗</a>. Les crédits peuvent être incomplets.</p></div>';
}
