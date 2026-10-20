import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
const db=createClient('https://anjfidksqbqlaggttdop.supabase.co','sb_publishable_wPFasufNG20maU1rokgPLA_7nyagxY3');
const css=document.createElement('style');css.textContent=`
:root{--aqua:#55e6d1;--gold:#e8c879}
body{background:radial-gradient(ellipse at 18% 0,#172c4c,#090d18 65%)}
.hero{background:linear-gradient(120deg,#192b4c,#263a63 65%,#17465a);box-shadow:0 15px 50px #0004}
.card{transition:transform .2s,border-color .2s,box-shadow .2s;position:relative}.card:hover{transform:translateY(-5px);border-color:#6ae4d18c;box-shadow:0 12px 35px #0008}
.card img{display:block}.card .info{background:#132038}
.rare-card{border-color:#d9b45e!important;box-shadow:0 0 25px #d9b45e22}
.rare-card .tag{background:#7c5729;color:#ffe6a0}
.game-nav{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 24px}
.game-nav button{background:#15233d}
.game-panel{border:1px solid #ffffff24;background:#121e32;border-radius:20px;padding:24px;margin:0 0 22px}
.game-panel h2{margin-top:0}.game-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:12px}
.game-stat{border:1px solid #ffffff22;border-radius:15px;background:#ffffff08;padding:17px}
.game-stat b{font-size:27px;display:block;color:#7be4d7}
.game-subtle{font-size:13px;color:#b1bfd5}.game-action{margin:8px 8px 8px 0}
#gameMessage{min-height:24px;color:#7be4d7}
#gameResults{display:grid;grid-template-columns:repeat(auto-fit,minmax(135px,1fr));gap:14px}
#gameResults .card{max-width:220px}
#gameResults .card img{width:100%}
#gameLeaderboard{width:100%;border-collapse:collapse}
#gameLeaderboard td,#gameLeaderboard th{padding:12px;border-bottom:1px solid #ffffff1c;text-align:left}
#gameCollectionGrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:14px}
.game-disabled{opacity:.55;pointer-events:none}
@media(max-width:650px){.game-panel{padding:16px}.game-nav button{font-size:12px;padding:9px}}
`;document.head.appendChild(css);
const root=document.createElement('section');root.id='game';root.className='hidden';root.innerHTML=`
<div style="margin-bottom:24px"><div style="color:#70e8d7;font-weight:800;font-size:12px;letter-spacing:2px">L'UNIVERS SÉRIECLUB</div><h1 style="margin:8px 0">Mon espace joueur</h1><p>Collection en ligne, récompenses et classements. Les cartes sont attribuées et conservées sur le serveur.</p></div>
<div class="game-nav"><button data-game="dashboard">Tableau de bord</button><button data-game="cards">Mes cartes</button><button data-game="albums">Albums</button><button data-game="rankings">Classements</button><button data-game="market">Marché & échanges</button></div>
<div id="gameMessage" role="status"></div>
<div id="gameDashboard" class="game-view">
<div class="game-stats"><div class="game-stat"><b id="gCards">—</b>Cartes</div><div class="game-stat"><b id="gUnique">—</b>Séries uniques</div><div class="game-stat"><b id="gCredits">—</b>Crédits</div><div class="game-stat"><b id="gXP">—</b>Expérience</div></div>
<div class="game-panel" style="margin-top:20px"><h2>✦ Booster gratuit</h2><p>5 cartes, 7 raretés et 25 crédits par ouverture. Rechargement toutes les 10 minutes. Tirage sécurisé côté serveur.</p><button class="primary game-action" id="gBooster">Ouvrir un booster</button><span id="gCooldown" class="game-subtle"></span><div id="gameResults"></div></div>
<div class="game-panel"><h2>☀ Récompense quotidienne</h2><p>Récupère 100 crédits virtuels une fois toutes les 24 heures.</p><button id="gDaily" class="primary">Récupérer ma récompense</button></div></div>
<div id="gameCards" class="game-view hidden"><div class="game-panel"><h2>Ma collection en ligne</h2><p>Chaque exemplaire et sa rareté sont conservés sur ton compte.</p><div class="tools"><input id="gFilter" placeholder="Filtrer par titre ou rareté…"><select id="gRarity"><option value="">Toutes les raretés</option><option>Commune</option><option>Peu commune</option><option>Rare</option><option>Épique</option><option>Légendaire</option><option>Mythique</option><option>Unique</option></select></div><div id="gameCollectionGrid"></div></div></div>
<div id="gameAlbums" class="game-view hidden"><div class="game-panel"><h2>Albums de collection</h2><p>Retrouve tes séries par genre et suis la diversité de ta collection.</p><div id="gAlbums"></div></div></div>
<div id="gameRankings" class="game-view hidden"><div class="game-panel"><h2>Classement des collectionneurs</h2><p>Classement public des profils selon le nombre de cartes possédées.</p><table id="gameLeaderboard"><thead><tr><th>#</th><th>Joueur</th><th>Cartes</th><th>Séries</th></tr></thead><tbody></tbody></table></div></div>
<div id="gameMarket" class="game-view hidden"><div class="game-panel"><h2>Marché, échanges et enchères</h2><p>Ce module nécessite des transactions serveur atomiques, des contrôles anti-triche et des règles de modération. Il n'est pas encore ouvert : aucune transaction fictive n'est proposée.</p><p class="game-subtle">Prochaine étape après validation des boosters et de l'inventaire synchronisé.</p></div></div>`;
document.querySelector('main').insertBefore(root,document.querySelector('main .notice'));
const nav=document.createElement('button');nav.textContent='Espace joueur';nav.dataset.page='game';document.querySelector('header nav').appendChild(nav);
nav.addEventListener('click',()=>{document.querySelectorAll('main>section').forEach(s=>s.classList.toggle('hidden',s.id!=='game'));window.scrollTo(0,0);refresh()});
const $=id=>document.getElementById(id);let cards=[],wallet=null,me=null;
function message(s,err=false){$('gameMessage').textContent=s;$('gameMessage').style.color=err?'#ffabab':'#7be4d7'}
function view(name){document.querySelectorAll('.game-view').forEach(x=>x.classList.toggle('hidden',x.id!=='game'+name[0].toUpperCase()+name.slice(1)));if(name==='rankings')rankings();if(name==='albums')albums()}
document.querySelectorAll('[data-game]').forEach(b=>b.onclick=()=>view(b.dataset.game));
async function refresh(){const {data:{user}}=await db.auth.getUser();me=user;if(!me){message('Connecte-toi avec le bouton Connexion, puis crée ton pseudonyme pour activer cet espace.');root.querySelectorAll('.game-action,#gDaily').forEach(x=>x.disabled=true);return}root.querySelectorAll('.game-action,#gDaily').forEach(x=>x.disabled=false);message('Chargement de ton profil…');const [w,c]=await Promise.all([db.from('player_wallets').select('*').eq('player_id',me.id).maybeSingle(),db.from('player_cards').select('id,rarity,obtained_at,series:series_id(id,name,image_url,genres,premiered)').eq('owner_id',me.id).order('obtained_at',{ascending:false}).limit(1000)]);if(w.error||c.error){message('Base non initialisée : exécute supabase/schema.sql puis supabase/game.sql dans Supabase SQL Editor.',true);return}wallet=w.data;cards=c.data||[];const missing=[...new Set(cards.filter(x=>x.series&&!x.series.image_url).map(x=>x.series.id))];await Promise.all(missing.slice(0,40).map(async id=>{try{const r=await fetch('https://api.tvmaze.com/shows/'+id);if(!r.ok)return;const v=await r.json();for(const x of cards){if(x.series?.id===id){x.series.image_url=v.image?.medium||'';x.series.genres=v.genres||[]}}}catch{}}));$('gCards').textContent=cards.length;$('gUnique').textContent=new Set(cards.map(x=>x.series?.id)).size;$('gCredits').textContent=wallet?.credits??0;$('gXP').textContent=wallet?.experience??0;const next=wallet?.last_booster_at?new Date(wallet.last_booster_at).getTime()+600000:0;$('gCooldown').textContent=next>Date.now()?'Disponible dans '+Math.ceil((next-Date.now())/60000)+' min':'Disponible maintenant';renderCards();message('Compte connecté — progression synchronisée.')}
function item(c){const s=c.series||{};const a=document.createElement('article');a.className='card';if(['Légendaire','Mythique','Unique'].includes(c.rarity))a.classList.add('rare-card');const img=document.createElement('img');img.loading='lazy';img.alt=s.name||'Série';img.src=s.image_url||'';img.onerror=()=>{img.style.display='none'};const info=document.createElement('div');info.className='info';const title=document.createElement('strong');title.textContent=s.name||'Série';const tag=document.createElement('span');tag.className='tag';tag.textContent=c.rarity;info.append(title,tag);a.append(img,info);return a}
function renderCards(){const q=$('gFilter').value.toLowerCase().trim(),rar=$('gRarity').value;const list=cards.filter(c=>(!rar||c.rarity===rar)&&((c.series?.name||'').toLowerCase().includes(q)||c.rarity.toLowerCase().includes(q)));$('gameCollectionGrid').replaceChildren(...list.map(item));if(!list.length)$('gameCollectionGrid').textContent='Aucune carte correspondante.'}
$('gFilter').oninput=renderCards;$('gRarity').onchange=renderCards;
$('gBooster').onclick=async()=>{if(!me)return message('Connecte-toi.',true);$('gBooster').disabled=true;message('Ouverture du booster…');const {data,error}=await db.rpc('open_starter_booster');if(error){message(error.message,true)}else{const result=await Promise.all((data||[]).map(async x=>{let image=x.image_url; if(!image){try{const r=await fetch('https://api.tvmaze.com/shows/'+x.series_id);if(r.ok)image=(await r.json()).image?.medium}catch{}}return {rarity:x.rarity,series:{id:x.series_id,name:x.name,image_url:image}}}));$('gameResults').replaceChildren(...result.map(item));message('Booster ouvert : '+result.length+' cartes ajoutées à ton compte !');await refresh()}$('gBooster').disabled=false};
$('gDaily').onclick=async()=>{if(!me)return;const {data,error}=await db.rpc('claim_daily_reward');message(error?error.message:'Récompense récupérée ! Nouveau solde : '+data+' crédits',!!error);if(!error)await refresh()};
async function rankings(){const {data,error}=await db.rpc('get_leaderboard');const body=$('gameLeaderboard').querySelector('tbody');body.replaceChildren();if(error){message('Classement indisponible : '+error.message,true);return}(data||[]).forEach((p,i)=>{const tr=document.createElement('tr');[i+1,p.username,p.card_count,p.unique_series].forEach(v=>{const td=document.createElement('td');td.textContent=v;tr.append(td)});body.append(tr)})}
function albums(){const m=new Map();for(const c of cards){for(const g of c.series?.genres||[]){m.set(g,(m.get(g)||0)+1)}}const el=$('gAlbums');el.replaceChildren();if(!m.size){el.textContent='Ouvre des boosters pour constituer tes premiers albums.';return}[...m.entries()].sort((a,b)=>b[1]-a[1]).forEach(([g,n])=>{const row=document.createElement('div');row.className='game-stat';row.style.margin='10px 0';row.textContent=g+' — '+n+' cartes';el.append(row)})}
db.auth.onAuthStateChange(()=>{if(!root.classList.contains('hidden'))setTimeout(refresh,0)});
