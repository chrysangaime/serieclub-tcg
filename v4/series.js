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

export function showDetailHTML(source = {},base = {}) {
  const show = {...base,...source};
  const name = show.name||base.name||'Série';
  const summary = stripSummary(show.summary||base.summary);
  const short = miniSummary(summary);
  const overflow = summary.length>short.length;
  const cast = Array.isArray(show._embedded?.cast)?show._embedded.cast:[];
  const seasons = Array.isArray(show._embedded?.seasons)?show._embedded.seasons.length:null;
  const imdb = show.externals?.imdb && /^[a-z0-9]+$/i.test(show.externals.imdb)
    ? 'https://www.imdb.com/title/'+show.externals.imdb+'/':null;
  const channel = show.webChannel?.name||show.network?.name||'';
  const year = formatYear(show.premiered);
  const poster = show.image?.original||show.image?.medium||show.image_url||base.image_url;
  const status = show.status||'';
  const rating = Number(show.rating?.average);
  const castCards = cast.slice(0,18).filter(c=>c.person?.id&&c.person?.name).map(c=> {
    const person=c.person;
    return '<button class="sc5-cast-card" data-person="'+person.id+'" aria-label="Voir les autres séries de '+escapeHTML(person.name)+'">'+
      photo(person.image?.medium||person.image?.original,person.name,'sc5-cast-photo')+
      '<b>'+escapeHTML(person.name)+'</b>'+
      (c.character?.name?'<span>'+escapeHTML(c.character.name)+'</span>':'')+
      '</button>';
  }).join('');
  const facts=[
    ['Première diffusion',show.premiered||year],
    ['Statut',status],
    ['Saisons',seasons==null?'':String(seasons)],
    ['Chaîne / service d’origine',channel],
    ['Langue originale',show.language],
    ['Durée d’un épisode',(show.averageRuntime||show.runtime)?(show.averageRuntime||show.runtime)+' min':''],
    ['Note TVmaze',Number.isFinite(rating)&&rating>0?rating+'/10':'']
  ].filter(([,v])=>v).map(([label,val])=>
    '<div><small>'+escapeHTML(label)+'</small><strong>'+escapeHTML(val)+'</strong></div>').join('');
  const tooltip = status==='Ended'?'Terminée':status==='Running'?'En cours':status==='To Be Determined'?'À confirmer':status||'Série TV';
  return '<div class="dialog sc5-dialog" role="dialog" aria-modal="true" aria-label="Fiche de '+escapeHTML(name)+'">'+
    '<button class="close" data-close aria-label="Fermer">×</button>'+
    '<div class="sc5-show-head">'+photo(poster,'Affiche de '+name,'sc5-poster')+
    '<div class="sc5-show-intro"><span class="caps">SÉRIECLUB · FICHE SÉRIE</span><h2>'+escapeHTML(name)+'</h2>'+
    '<div class="sc5-tagline"><span>'+escapeHTML(tooltip)+'</span>'+(year?'<span>'+year+'</span>':'')+
    (seasons!=null?'<span>'+seasons+' saison'+(seasons>1?'s':'')+'</span>':'')+'</div>'+
    '<div class="detail-tags">'+genrePills(show.genres||base.genres)+'</div>'+
    '<h3>L’histoire en quelques mots</h3>'+
    (summary?'<p class="sc5-summary-short">'+escapeHTML(short)+'</p>'+
      (overflow?'<p class="sc5-summary-long hidden">'+escapeHTML(summary)+'</p><button class="sc5-text-btn" data-summary-toggle aria-expanded="false">Lire le résumé complet ↓</button>':''):
      '<p class="sc5-muted">Résumé non disponible pour cette série sur TVmaze.</p>')+
    '<div class="sc5-source">Synopsis fourni par TVmaze, généralement en anglais. Nous conservons le texte original plutôt que de proposer une traduction automatique trompeuse.</div>'+
    externalLinks(name)+'</div></div>'+
    (facts?'<div class="sc5-facts">'+facts+'</div>':'')+
    '<section class="sc5-cast-section"><div class="sc5-section-head"><div><span class="caps">DISTRIBUTION</span><h3>Les visages de la série</h3></div><span class="sc5-muted">Clique sur un acteur pour découvrir ses autres séries</span></div>'+
    (castCards?'<div class="sc5-cast-list">'+castCards+'</div>':
      '<div class="sc5-empty">Distribution non renseignée sur TVmaze pour cette série.</div>')+
    '</section><div class="sc5-bottom"><a href="'+tvmazeLink(show.url)+
    '" target="_blank" rel="noopener noreferrer">Source et crédits : TVmaze ↗</a>'+
    (imdb?'<a href="'+imdb+'" target="_blank" rel="noopener noreferrer">Fiche IMDb ↗</a>':'')+
    '</div></div>';
}

export function actorDetailHTML(person,shows=[],catalogueIds=new Set(),fromShow=false) {
  const name=person?.name||'Artiste';
  const birth=person?.birthday?new Date(person.birthday+'T12:00:00').toLocaleDateString('fr-FR'):'';
  const country=person?.country?.name||'';
  const rows=shows.map(show=>
    '<button class="sc5-credit-card" data-series="'+show.id+'" aria-label="Ouvrir la série '+escapeHTML(show.name)+'">'+
      photo(show.image?.medium||show.image?.original,show.name,'sc5-credit-poster')+
      '<span><b>'+escapeHTML(show.name)+'</b><small>'+escapeHTML(formatYear(show.premiered))+
      (show.role?' · '+escapeHTML(show.role):'')+'</small>'+
      (catalogueIds.has(show.id)?'<em>Dans SérieClub</em>':'<em class="sc5-not-collected">Référence TVmaze</em>')+
      '</span></button>').join('');
  return '<div class="dialog sc5-dialog sc5-actor-dialog" role="dialog" aria-modal="true" aria-label="Acteur '+escapeHTML(name)+'">'+
    '<button class="close" data-close aria-label="Fermer">×</button><button class="sc5-back" data-person-back>← '+(fromShow?'Retour à la série':'Fermer la fiche')+'</button>'+
    '<div class="sc5-actor-head">'+photo(person.image?.original||person.image?.medium,name,'sc5-actor-portrait')+
    '<div><span class="caps">SÉRIECLUB · VISAGES DES SÉRIES</span><h2>'+escapeHTML(name)+'</h2>'+
    '<p>'+[birth?('Né(e) le '+birth):'',country].filter(Boolean).map(escapeHTML).join(' · ')+'</p>'+
    '<strong>'+shows.length+' série'+(shows.length>1?'s':'')+' référencée'+(shows.length>1?'s':'')+' dans sa filmographie TVmaze</strong>'+
    '<div class="sc5-actor-actions"><button class="btn primary" data-filter-actor="'+validId(person.id)+'">Filtrer le catalogue par cet acteur →</button>'+
    (person.url?'<a class="btn subtle" target="_blank" rel="noopener noreferrer" href="'+tvmazeLink(person.url)+'">Source TVmaze ↗</a>':'')+
    '</div></div></div>'+
    '<div class="sc5-section-head"><div><span class="caps">FILMOGRAPHIE</span><h3>Ses autres séries</h3></div>'+
    '<span class="sc5-muted">Sélectionne une série pour ouvrir sa fiche</span></div>'+
    (rows?'<div class="sc5-credits">'+rows+'</div>':'<div class="sc5-empty">Aucun crédit de série disponible sur TVmaze.</div>')+
    '</div>';
}

export function actorCatalogueView(state) {
  const chosen=state.actorSelected;
  const q=state.actorQuery||'';
  const people=state.actorMatches||[];
  const shows=state.actorShows||[];
  const inCatalogue=new Set(state.actorCatalogueIds||[]);
  return '<div class="page-content sc5-catalog"><div class="page-title"><span class="caps">SÉRIECLUB · LA DISTRIBUTION</span><h1>Recherche par acteur</h1><p>Retrouve les séries dans lesquelles joue un acteur ou une actrice, même si elles ne figurent pas encore dans les boosters.</p></div>'+
    '<div class="sc5-mode"><button class="btn subtle" data-catalog-mode="series">▦ Par série</button>'+
    '<button class="btn primary" data-catalog-mode="actors">♙ Par acteur</button></div>'+
    '<div class="sc5-actor-search"><input class="input" id="actorSearchQuery" type="search" maxlength="75" placeholder="Nom de l’acteur ou actrice…" value="'+escapeHTML(q)+'">'+
    '<button class="btn primary" id="actorSearchSubmit">Rechercher</button>'+
    (chosen?'<button class="btn subtle" data-actor-reset>Effacer le filtre</button>':'')+'</div>'+
    (state.actorLoading?'<div class="sc5-empty">Recherche de la distribution en cours…</div>':'')+
    (state.actorError?'<div class="notice">'+escapeHTML(state.actorError)+'</div>':'')+
    (!state.actorLoading&&people.length?'<div class="sc5-person-results">'+people.map(person=>
      '<button class="sc5-person-result" data-select-actor="'+person.id+'">'+
      photo(person.image?.medium,person.name,'sc5-person-thumb')+
      '<span><b>'+escapeHTML(person.name)+'</b>'+
      (person.country?.name?'<small>'+escapeHTML(person.country.name)+'</small>':'')+'</span>'+
      '<span class="sc5-person-arrow">Voir ses séries →</span></button>').join('')+'</div>':'')+
    (chosen?'<div class="sc5-filmography-top"><div><span class="caps">FILTRÉ PAR ARTISTE</span><h2>'+escapeHTML(chosen.name)+'</h2><p>'+shows.length+' série'+(shows.length>1?'s':'')+' trouvée'+(shows.length>1?'s':'')+' sur TVmaze. Les mentions « Dans SérieClub » concernent le catalogue jouable.</p></div>'+
      '<button class="btn subtle" data-person="'+chosen.id+'">Voir sa fiche complète ↗</button></div>'+
      (shows.length?'<div class="sc5-filmography-grid">'+shows.map(show=>
        '<article class="sc5-filmography-item"><button data-series="'+show.id+'" class="sc5-filmography-image">'+photo(show.image?.medium,show.name,'')+'</button>'+
        '<div><b>'+escapeHTML(show.name)+'</b><small>'+escapeHTML(formatYear(show.premiered))+'</small>'+
        (inCatalogue.has(show.id)?'<span class="sc5-available">◈ Dans SérieClub</span>':'<span class="sc5-remote">Source TVmaze</span>')+
        '<button class="sc5-text-btn" data-series="'+show.id+'">Voir la fiche →</button></div></article>').join('')+'</div>':'<div class="sc5-empty">Aucune série référencée pour cet acteur.</div>')+
      '</div>':'')+
    (!chosen&&!state.actorLoading&&!people.length?'<div class="sc5-search-invitation"><span>✧</span><h2>Toutes les séries, un visage à la fois.</h2><p>Saisis un nom pour retrouver les artistes et accéder à leur filmographie.</p></div>':'')+
    '<p class="sc5-api-credit">Les biographies, distributions et filmographies sont fournies par <a href="https://www.tvmaze.com/" target="_blank" rel="noopener noreferrer">TVmaze ↗</a>. Les crédits peuvent être incomplets.</p></div>';
}
