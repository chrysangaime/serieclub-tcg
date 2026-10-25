import{esc,photo,money,heading}from'../v3/views.js?v=5.6.1';
import {genreFR} from '../v5/fr-text.js?v=5.3.1';
import {officialSeasonHTML} from '../v10/seasons.js?v=20.1.0';
function seriesLibrary(s){
 const progress=(Array.isArray(s.seriesCompletion)?s.seriesCompletion:[]).filter(x=>Number(x.required_seasons)>=3);
 const allowed=new Set(progress.map(x=>String(x.series_id)));
 const earned=new Map((s.permanentSeriesBadges||[]).filter(b=>allowed.has(String(b.series_id))).map(b=>[String(b.series_id),b]));
 const items=progress.slice().sort((a,b)=>Number(earned.has(String(b.series_id)))-Number(earned.has(String(a.series_id)))||Number(b.owned_seasons)/Math.max(1,Number(b.required_seasons))-Number(a.owned_seasons)/Math.max(1,Number(a.required_seasons)));
 const tile=x=>{
  const count=Number(x.owned_seasons)||0,total=Math.max(1,Number(x.required_seasons)||1),win=earned.has(String(x.series_id));
  const poster=(earned.get(String(x.series_id))?.image_url||(s.cards||[]).find(c=>Number(c.series_id)===Number(x.series_id))?.series?.image_url)||'';
  return '<button type="button" class="sc-v1-series-album" data-series-album="'+esc(x.series_id)+'" aria-label="Voir les saisons de '+esc(x.title)+'">'+
   '<div class="sc-v1-series-album-head">'+(poster&&/^https:\/\//.test(poster)?
    '<img class="sc-v1-album-poster" loading="lazy" src="'+esc(poster)+'" alt="">':
    '<span class="sc-v1-series-emblem" aria-hidden="true">'+(win?'🏅':'▣')+'</span>')+
    '<div><strong>'+esc(x.title)+'</strong><small>'+(win?'🏅 Badge de série obtenu · ':'')+count+' / '+total+' saisons</small></div></div>'+
   '<div class="sc-v1-series-track" role="progressbar" aria-label="Progression de '+esc(x.title)+'" aria-valuemin="0" aria-valuemax="'+total+'" aria-valuenow="'+Math.min(count,total)+'"><span style="width:'+Math.min(100,Math.round(count/total*100))+'%"></span></div>'+
   '<span class="sc-v1-series-album-more">Afficher les saisons et les cartes manquantes ↗</span></button>';
 };
 const completed=items.filter(x=>earned.has(String(x.series_id))).length;
 return '<section class="sc-v1-series-library" aria-label="Albums de séries"><div class="section-head"><div><span class="caps">OBJECTIF PRINCIPAL</span><h2>Mes albums de séries</h2><p>Albums à partir de 3 saisons diffusées. Une carte par saison. Complète un album pour gagner définitivement le badge portant le nom de la série.</p></div><strong>'+completed+' badge'+(completed>1?'s':'')+' débloqué'+(completed>1?'s':'')+'</strong></div>'+
 (items.length?'<div class="sc-v1-series-library-grid">'+items.map(tile).join('')+'</div>':
 '<div class="empty">Ouvre ton premier booster pour commencer un album de série.</div>')+'</section>';
}
export function seriesAlbumDetails(show,seasons,cards,badges){
 const owned=new Set((cards||[]).filter(c=>Number(c.series_id)===Number(show.series_id)&&Number.isInteger(c.season_number)).map(c=>Number(c.season_number)));
 const done=(badges||[]).some(b=>String(b.series_id)===String(show.series_id));
 return '<div class="dialog sc-v1-series-dialog" role="dialog" aria-modal="true" aria-label="Album '+esc(show.title)+'"><button type="button" class="close" data-close aria-label="Fermer">×</button><span class="caps">ALBUM DE SÉRIE</span><h2>'+esc(show.title)+'</h2><p>'+(done?'🏅 Badge définitivement obtenu. ':'')+owned.size+' saison(s) possédée(s) · '+(seasons||[]).length+' saison(s) diffusée(s).</p>'+
 '<div class="sc-v1-series-slots">'+(seasons||[]).map(v=>{
  const has=owned.has(Number(v.season_number));
  return '<article class="sc-v1-series-slot '+(has?'is-owned':'is-missing')+'">'+
   (has&&v.image_url?'<img loading="lazy" src="'+esc(v.image_url)+'" alt="Affiche de la saison '+v.season_number+'">':'<div class="sc-v1-slot-empty" aria-hidden="true">'+(has?'✦':'?')+'</div>')+
   '<strong>Saison '+Number(v.season_number)+'</strong><small>'+esc(v.season_name||'')+'</small><span>'+(has?'✓ Possédée':'☆ À obtenir')+'</span></article>';
 }).join('')+'</div><p class="sc-v1-album-source">Affiches et saisons : <a href="https://www.tvmaze.com/shows/'+Number(show.series_id)+'" target="_blank" rel="noopener noreferrer">TVmaze</a> et sources éditoriales. Les visuels proviennent de leurs ayants droit respectifs.</p></div>';
}
export function personalAlbumsPage(s){
 const genreCounts=new Map();
 for(const c of s.cards)for(const g of c.series?.genres||[])genreCounts.set(g,(genreCounts.get(g)||0)+1);
 const own=s.personalAlbums||[],publicAlbums=s.publicAlbums||[];
 return '<div class="page-content sc4-page"><div class="sc4-hero sc4-album-hero"><span class="caps">SÉRIESCLUBTCG · ALBUMS DE SÉRIES</span><h1>UNE SÉRIE.<br><em>UN ALBUM À COMPLÉTER.</em></h1><p>Collectionne une carte par saison, complète les albums des séries et débloque des badges permanents. Les collections personnalisées restent disponibles plus bas.</p></div>'+
 seriesLibrary(s)+
 (s.albumError?'<div class="notice">'+esc(s.albumError)+'</div>':'')+
 officialSeasonHTML(s)+
 '<div class="sc4-split"><section class="sc4-box"><span class="caps">CRÉATION</span><h2>Créer un album libre</h2><p>Un album personnel contient jusqu’à 100 cartes et peut rester privé ou être visible par tous les collectionneurs.</p>'+
 '<label for="newAlbumTitle">Nom de l’album</label><input class="input" id="newAlbumTitle" maxlength="48" placeholder="Ex. Mes séries cultes, Nuit blanche…">'+
 '<label for="newAlbumDescription">Description</label><input class="input" id="newAlbumDescription" maxlength="160" placeholder="Pourquoi cette sélection ?">'+
 '<label class="row" style="margin:13px 0"><input type="checkbox" id="newAlbumPublic" style="width:auto"> Rendre cet album public</label>'+
 '<button class="btn primary" id="createAlbum" '+(!s.user?'disabled':'')+'>Créer un album +</button></section>'+
 '<section class="sc4-box"><span class="caps">LE CLUB DES SÉRIES</span><h2>Ma collection à mon image</h2><div class="sc4-guide-item"><b>01</b><div><strong>Crée une sélection</strong><p>Réunis les cartes des séries qui te ressemblent.</p></div></div><div class="sc4-guide-item"><b>02</b><div><strong>Remplis-la à ton rythme</strong><p>Ajoute et retire des cartes sans modifier tes possessions.</p></div></div><div class="sc4-guide-item"><b>03</b><div><strong>Partage tes découvertes</strong><p>Rends l’album public si tu souhaites le présenter au club.</p></div></div></section></div>'+
 '<section class="sc4-box" style="margin-top:23px"><div class="section-head"><div><span class="caps">MES CRÉATIONS</span><h2>Mes albums personnalisés</h2></div><small>'+own.length+'/20 albums</small></div>'+
 (own.length?'<div class="sc4-album-grid">'+own.map(a=>'<article class="sc4-album"><div class="sc4-album-top"><span class="caps">'+(a.visibility==='public'?'◉ PUBLIC':'◈ PRIVÉ')+'</span><span>▦ '+money(a.cards_count)+'/100</span></div><h3>'+esc(a.title)+'</h3><p>'+esc(a.description||'Un univers à compléter, carte après carte.')+'</p><div class="row"><button class="btn small primary" data-view-album="'+esc(a.album_id)+'">Ouvrir l’album</button><button class="btn small subtle" data-delete-album="'+esc(a.album_id)+'">Supprimer</button></div></article>').join('')+'</div>':'<div class="empty">Ton premier album personnalisé reste à créer.</div>')+'</section>'+
 '<section style="margin-top:28px"><div class="section-head"><div><span class="caps">SÉLECTIONS DU CLUB</span><h2>Albums partagés par les joueurs</h2></div></div>'+
 (publicAlbums.length?'<div class="sc4-album-grid">'+publicAlbums.map(a=>'<button class="sc4-album sc4-album-public" data-view-album="'+esc(a.album_id)+'"><div class="sc4-album-top"><span class="caps">◉ PUBLIC</span><span>▦ '+money(a.cards_count)+'</span></div><h3>'+esc(a.title)+'</h3><p>Par '+esc(a.username)+'</p><span class="sc4-album-open">Parcourir cette saison ↗</span></button>').join('')+'</div>':'<div class="empty">Aucun album public pour le moment. Sois le premier à partager ta sélection !</div>')+'</section>'+
 '<section style="margin-top:29px"><div class="section-head"><div><span class="caps">AUTOMATIQUES</span><h2>Mes univers par genre</h2></div></div>'+
 (genreCounts.size?'<div class="sc4-album-grid">'+[...genreCounts].sort((a,b)=>b[1]-a[1]).map(([genre,n])=>'<button class="sc4-album sc4-album-public" data-album="'+esc(genre)+'"><span class="caps">GENRE</span><h3>'+esc(genreFR(genre))+'</h3><p>▦ '+n+' cartes à retrouver</p><span class="sc4-album-open">Explorer ↗</span></button>').join('')+'</div>':'<div class="empty">Ouvre ton premier booster pour remplir tes albums de genre.</div>')+'</section></div>';
}
export function albumDialog(s,a,data=[],targets=[]){
 const own=(s.personalAlbums||[]).some(x=>x.album_id===a.album_id);
 const already=new Set(data.map(x=>x.card_id));
 const candidates=s.cards.filter(c=>!already.has(c.id));
 return '<div class="dialog sc4-album-dialog" role="dialog" aria-modal="true" aria-label="Album '+esc(a.title)+'"><button class="close" data-close aria-label="Fermer">×</button><div class="caps">'+(own?'MON ALBUM PERSONNALISÉ':'ALBUM PUBLIC DU CLUB')+'</div><h2>'+esc(a.title)+'</h2><p>'+esc(a.description||'Une saison créée par un passionné de séries.')+'</p><small>'+data.length+' cartes</small>'+
 (own?'<div class="row sc4-album-add"><select class="input" id="albumCardSelect"><option value="">Choisir une carte à ajouter…</option>'+candidates.map(c=>'<option value="'+esc(c.id)+'">'+esc(c.series?.name||'Série')+' · '+esc(c.rarity)+'</option>').join('')+'</select><button class="btn primary small" id="albumAddCard" data-album-id="'+esc(a.album_id)+'" '+(!candidates.length?'disabled':'')+'>Ajouter</button></div>':'')+
 (own?'<section class="sc20-album-targets"><div class="section-head"><div><span class="caps">SÉRIES À COLLECTIONNER</span><h3>Préparer ma saison sans avoir les cartes</h3></div><span>'+targets.length+' titres choisis</span></div>'+
 '<div class="sc20-album-search"><input class="input" id="albumSeriesSearch" placeholder="Rechercher une série diffusée en France…" minlength="2" maxlength="80">'+
 '<button class="btn small primary" data-album-search="'+esc(a.album_id)+'" type="button">Rechercher</button></div>'+
 '<div class="sc20-album-search-results" id="albumSeriesResults" aria-live="polite"></div>'+
 '<div class="sc20-album-target-grid">'+targets.map(t=>'<div class="sc20-album-target"><strong>'+esc(t.name)+'</strong><span>'+(t.owned?(t.locked?'🔒 Carte protégée':'✓ Possédée'):'☆ Dans mes souhaits')+'</span><button type="button" class="btn subtle small" data-remove-album-target="'+esc(t.series_id)+'" data-album-id="'+esc(a.album_id)+'">Retirer</button></div>').join('')+'</div>'+
 '<button class="btn small primary" data-sync-personal-album="'+esc(a.album_id)+'" type="button">☆ Synchroniser souhaits et cartes protégées</button>'+
 '<p class="sc20-album-disclaimer">Les séries manquantes sont suivies automatiquement et un nouvel exemplaire sera protégé, sans bloquer tes doublons.</p></section>':'')+
 (data.length?'<div class="sc4-album-cards">'+data.map(c=>'<div class="sc4-album-card"><img src="'+photo(c.image_url)+'" alt="" loading="lazy"><div><b>'+esc(c.series_name)+'</b><small>'+esc(c.rarity)+'</small>'+(own?'<button class="btn subtle small" data-album-remove="'+esc(c.card_id)+'" data-album-id="'+esc(a.album_id)+'">Retirer</button>':'')+'</div></div>').join('')+'</div>':'<div class="empty">Cet album ne contient pas encore de carte.</div>')+'</div>';
}

/** Seuls les résultats France reconnus du serveur sont rendus, sans HTML externe. */
export function albumSeriesSearchResults(a,rows=[]){
 const id=esc(a?.album_id||'');
 if(!rows.length)return '<p class="note">Aucune série française correspondante dans le catalogue.</p>';
 return rows.map(s=>'<button type="button" class="sc20-search-result" data-add-album-target="'+esc(s.series_id)+'" data-album-id="'+id+'">'+
 (photo(s.image_url)?'<img src="'+photo(s.image_url)+'" alt="" loading="lazy">':'<span aria-hidden="true">▣</span>')+
 '<strong>'+esc(s.name)+'</strong><span>＋ Ajouter à mon album</span></button>').join('');
}
