/* SérieClub TCG — unified player navigation, visual polish and card presentation */
(()=>{const css=document.createElement('style');css.textContent=`
:root{--sc-ink:#101319;--sc-amber:#ffba64;--sc-card:#202733}
body{overflow-x:hidden}header{box-shadow:0 8px 28px #0003}
nav button[data-page="boosters"],nav button[data-page="collection"]{display:none}
nav button[data-page="game"]{background:#f4b76d;color:#18191c;font-weight:900}
#catalog,#game,#games,#club{animation:sc-enter .3s ease}
@keyframes sc-enter{from{opacity:.5;transform:translateY(7px)}to{opacity:1;transform:none}}
#catalog>h1,#game h1,#games>h1{font-size:clamp(45px,7vw,86px);margin:20px 0}
#catalog .tools{background:#1b222b;padding:16px;border-radius:14px;border:1px solid #ffffff16}
#catalog .grid,#gameCollectionGrid{grid-template-columns:repeat(auto-fill,minmax(165px,1fr));gap:17px}
#catalog .card,#gameCollectionGrid .card,#gameResults .card{background:#202733;border-radius:13px;overflow:hidden;position:relative;isolation:isolate}
#catalog .card img,#gameCollectionGrid .card img,#gameResults .card img{aspect-ratio:2/3;object-fit:cover;width:100%;background:#343c48}
#catalog .card .info,#gameCollectionGrid .card .info,#gameResults .card .info{background:#202733;padding:13px}
#catalog .card strong,#gameCollectionGrid .card strong{font-size:14px;line-height:1.4}
#catalog .card .tag{background:#343b49;color:#d1d5dc}
#gameCollectionGrid .card .tag,#gameResults .card .tag{background:#414a58}
#gameCollectionGrid .card[data-rarity="Rare"],#gameResults .card[data-rarity="Rare"]{border-color:#59c3e8}
#gameCollectionGrid .card[data-rarity="Épique"],#gameResults .card[data-rarity="Épique"]{border-color:#b18cff}
#gameCollectionGrid .card[data-rarity="Légendaire"],#gameResults .card[data-rarity="Légendaire"]{border-color:#ffb857;box-shadow:0 0 20px #ffb85720}
#gameCollectionGrid .card[data-rarity="Mythique"],#gameResults .card[data-rarity="Mythique"]{border-color:#ff719f;box-shadow:0 0 24px #ff719f25}
#gameCollectionGrid .card[data-rarity="Unique"],#gameResults .card[data-rarity="Unique"]{border-color:#f7d77c;box-shadow:0 0 25px #ffdd7540}
#gameResults{margin-top:22px}
#gameResults .card{animation:sc-reveal .5s cubic-bezier(.2,.7,.2,1) both}
#gameResults .card:nth-child(2){animation-delay:.08s}#gameResults .card:nth-child(3){animation-delay:.16s}#gameResults .card:nth-child(4){animation-delay:.24s}#gameResults .card:nth-child(5){animation-delay:.32s}
@keyframes sc-reveal{from{opacity:0;transform:translateY(22px) scale(.93) rotateY(25deg)}to{opacity:1;transform:none}}
#game .game-stat{background:#202733;border-color:#ffffff19}
#game .game-stat b{color:#f5ba70}
#game .game-panel{background:#1b222c;border-color:#ffffff1c}
#game .game-nav button{background:#222b38;border:1px solid #ffffff19}
#game .game-nav button:hover{background:#3b4553}
#game .game-nav button.sc-active{background:#f5b970;color:#171a20}
#game .game-stats{margin-top:18px}
#game .game-stat{min-height:112px}
#game .game-panel h2{font-size:38px}
#gameLeaderboard tr:hover{background:#ffffff08}
.sc-state-banner{background:#322b20;color:#f7d6a0;border:1px solid #aa874d;border-radius:12px;padding:13px 17px;margin:12px 0 20px;font-size:13px}
.sc-player-intro{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap}
.sc-player-intro small{color:#b3bac4}
.sc-level{font-size:13px;border:1px solid #d8a96480;background:#403124;border-radius:99px;padding:9px 14px;color:#ffd497;font-weight:800}
@media(max-width:700px){#catalog .grid,#gameCollectionGrid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}#game .game-nav{display:grid;grid-template-columns:repeat(2,1fr)}#game .game-nav button{padding:11px 7px}#game .game-stats{grid-template-columns:repeat(2,minmax(0,1fr))}}
`;document.head.appendChild(css);
function navigate(page){const b=document.querySelector('header nav [data-page="'+page+'"]');if(b)b.click()}
for(const old of ['boosters','collection']){const button=document.querySelector('header nav [data-page="'+old+'"]');if(button)button.setAttribute('aria-hidden','true')}
const redirect=document.createElement('div');redirect.className='sc-state-banner';redirect.textContent='La collection officielle et les boosters synchronisés sont désormais réunis dans ton Espace joueur. Les anciennes cartes locales restent exportables depuis la sauvegarde du navigateur.';const game=document.getElementById('game');if(game){const panel=game.querySelector('#gameMessage');if(panel)panel.after(redirect)}
const btn=document.createElement('button');btn.textContent='Ma collection en ligne';btn.className='primary';btn.style.margin='12px 0';const cat=document.getElementById('catalog');if(cat){cat.querySelector('h1')?.after(btn);btn.onclick=()=>navigate('game')}
const oldBooster=document.getElementById('boosters');if(oldBooster){const open=oldBooster.querySelector('#openBooster');if(open){open.disabled=true;open.textContent='Utilise ton Espace joueur';open.onclick=()=>navigate('game')}}
const oldCollection=document.getElementById('collection');if(oldCollection){const c=document.createElement('button');c.className='primary';c.textContent='Voir ma collection en ligne';c.onclick=()=>navigate('game');oldCollection.querySelector('h1')?.after(c)}
const navButtons=document.querySelectorAll('#game .game-nav button');navButtons.forEach(b=>b.addEventListener('click',()=>{navButtons.forEach(x=>x.classList.remove('sc-active'));b.classList.add('sc-active')}));navButtons[0]?.classList.add('sc-active');
const player=document.querySelector('#game > div:first-child');if(player){player.classList.add('sc-player-intro');const badge=document.createElement('span');badge.className='sc-level';badge.textContent='✦ COLLECTIONNEUR';player.append(badge)}
const grid=document.getElementById('gameCollectionGrid');const results=document.getElementById('gameResults');
function enhance(root){if(!root)return;root.querySelectorAll('.card').forEach(c=>{const rarity=c.querySelector('.tag')?.textContent||'';c.dataset.rarity=rarity})}
for(const el of [grid,results]){if(el){const observer=new MutationObserver(()=>enhance(el));observer.observe(el,{childList:true});enhance(el)}}
const hero=document.querySelector('.sc-hero');if(hero){const action=hero.querySelector('[data-sc="game"]');if(action)action.textContent='Commencer à collectionner ↗'}
const foot=document.querySelector('footer');if(foot)foot.textContent='© SérieClub TCG — Projet indépendant · Données : TVmaze · Visuels : ayants droit respectifs';
})();
