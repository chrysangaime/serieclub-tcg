/**
 * Synopsis français SérieClub.
 * Sans compte, clé API, secret ni service payant.
 * Sources par priorité : textes originaux du club → Wikipédia FR vérifiée
 * → traduction du résumé public TVmaze → message d'indisponibilité.
 */
const original=new Map([
 ['lost|2004',"Après un accident d'avion, des survivants échouent sur une île mystérieuse. Tandis qu'ils tentent de s'organiser, d'étranges phénomènes et les secrets de chacun bouleversent leur quotidien."],
 ['stranger things|2016',"Dans une petite ville américaine des années 1980, la disparition d'un garçon entraîne ses amis vers des événements surnaturels, un laboratoire secret et un inquiétant monde parallèle."],
 ['the x files|1993',"Deux agents du FBI enquêtent sur des affaires inexpliquées, entre phénomènes paranormaux, conspirations et rencontres troublantes. L'un croit à l'extraordinaire, l'autre privilégie les preuves."],
 ['dear white people|2017',"Dans une université prestigieuse à majorité blanche, des étudiants noirs font face aux discriminations, aux tensions identitaires et aux contradictions de la vie sur le campus. Une satire des rapports sociaux."],
 ['breaking bad|2008',"Un professeur de chimie atteint d'un cancer se lance dans la fabrication de méthamphétamine pour assurer l'avenir de sa famille. Son activité clandestine l'entraîne dans une dangereuse spirale."],
 ['game of thrones|2011',"Dans un monde où de grandes familles se disputent le pouvoir, alliances, trahisons et guerres menacent l'équilibre des royaumes, tandis qu'un péril ancien grandit au-delà du Mur."],
 ['the last of us|2023',"Après l'effondrement de la civilisation provoqué par une infection, un survivant endurci escorte une adolescente à travers les États-Unis. Leur voyage devient une lutte pour la confiance et l'espoir."],
 ['the walking dead|2010',"Dans un monde ravagé par une épidémie transformant les morts en rôdeurs, un groupe de survivants cherche refuge et tente de préserver son humanité face à des dangers toujours plus grands."],
 ['friends|1994',"À New York, six amis partagent les petits et grands événements de leur vie : amitiés, travail, histoires d'amour et rencontres improbables, entre humour et moments de complicité."],
 ['wednesday|2022',"Envoyée dans une académie peu ordinaire, Mercredi Addams tente de maîtriser ses dons tout en enquêtant sur une série de mystères inquiétants qui agitent son nouvel établissement."],
 ['sherlock|2010',"Dans le Londres contemporain, Sherlock Holmes, détective au talent exceptionnel, résout des enquêtes complexes avec son colocataire et ami John Watson."],
 ['dark|2017',"La disparition de deux enfants révèle les secrets d'une petite ville allemande. Les habitants découvrent peu à peu que leurs histoires familiales sont liées à un mystère qui traverse les époques."],
 ['peaky blinders|2013',"Dans l'Angleterre de l'après-guerre, Tommy Shelby dirige un gang familial ambitieux. Entre criminalité, politique et rivalités, il cherche à étendre son influence à tout prix."],
 ['the office|2005',"Dans les bureaux d'une entreprise de papier américaine, une équipe d'employés affronte les absurdités du quotidien sous le regard d'une caméra documentaire et d'un patron imprévisible."],
 ['the bear|2022',"De retour à Chicago, un jeune chef reprend la petite sandwicherie de son frère. Entre pression en cuisine, deuil et ambitions, il tente de reconstruire un lieu et une équipe."],
 ['better call saul|2015',"Avant de devenir l'avocat Saul Goodman, Jimmy McGill essaie de se faire une place dans le monde du droit. Ses choix l'entraînent progressivement vers des affaires de plus en plus douteuses."]
]);
const STORAGE_KEY='serieclub-synopsis-fr-v1';
const MAX_CACHE=100;
const GOOD_TTL=30*24*60*60*1000;
const FAIL_TTL=40*60*1000;
const cache=new Map();
let readOnce=false;
const norm = v => String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
 .toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
const year=v=>Number(String(v??'').slice(0,4))||null;
const cacheKey=show=>{
 const id=Number(show?.id);
 return Number.isSafeInteger(id)&&id>0?'show:'+id:'title:'+norm(show?.name)+'|'+(year(show?.premiered)||'');
};
function cacheRead(){
 if(readOnce)return;
 readOnce=true;
 try{
  if(typeof localStorage==='undefined')return;
  const stored=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');
  for(const [key,entry] of Array.isArray(stored)?stored.slice(-MAX_CACHE):[]){
   if(typeof key==='string'&&entry&&entry.expiry>Date.now()&&
     typeof entry.result?.text==='string'&&entry.result.text.length<=520)cache.set(key,entry);
  }
 }catch{/* localStorage may be disabled */}
}
function cacheWrite(key,result,ttl){
 cacheRead();
 cache.delete(key);cache.set(key,{result,expiry:Date.now()+ttl});
 while(cache.size>MAX_CACHE)cache.delete(cache.keys().next().value);
 try{if(typeof localStorage!=='undefined')localStorage.setItem(STORAGE_KEY,JSON.stringify([...cache]))}catch{}
}
function clean(text){
 return String(text??'').replace(/<[^>]*>/g,' ').replace(/&nbsp;/gi,' ')
 .replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'")
 .replace(/\s+/g,' ').trim();
}
function shorter(text,limit=390){
 const raw=clean(text);
 if(raw.length<=limit)return raw;
 const end=raw.slice(0,limit);
 const boundary=Math.max(end.lastIndexOf('. '),end.lastIndexOf('! '),end.lastIndexOf('? '));
 return boundary>=180?end.slice(0,boundary+1):end.replace(/\s+\S*$/,'').trim()+'…';
}
async function json(url,timeout=5000){
 const controller=new AbortController();
 const t=setTimeout(()=>controller.abort(),timeout);
 try{
  const response=await fetch(url,{signal:controller.signal,headers:{Accept:'application/json'}});
  if(!response.ok)throw Error('HTTP '+response.status);
  return await response.json();
 }finally{clearTimeout(t)}
}
function wikiCandidate(page,show){
 const extract=clean(page?.extract);
 if(extract.length<95)return null;
 const first=extract.slice(0,410);
 if(!/(série télévisée|série d'animation|mini.série|feuilleton télévisé|série dramatique|série policière)/i.test(first))return null;
 const premiered=year(show.premiered);
 // Identity must include the premiere year, not merely the page title.
 // No French article is better than an incorrect homonym's synopsis.
 if(!premiered||!new RegExp('\\b'+String(premiered)+'\\b').test(first))return null;
 const names=norm(show.name).split(' ').filter(Boolean);
 const wiki=norm(page.title).split(' ').filter(Boolean);
 const common=names.filter(token=>wiki.includes(token)).length;
 if(!names.length||common<Math.max(1,Math.ceil(names.length*.55)))return null;
 const id=Number(page.pageid);
 if(!Number.isSafeInteger(id)||id<=0)return null;
 return {
  text:shorter(extract),
  source:'wikipedia',
  sourceUrl:'https://fr.wikipedia.org/?curid='+id
 };
}
export function findFrenchEditorial(show){
 const k=norm(show?.name)+'|'+(year(show?.premiered)||'');
 const t=original.get(k);
 return t?{text:t,source:'editorial'}:null;
}
export async function wikipediaFrenchSynopsis(show){
 const title=String(show?.name||'').trim().slice(0,90);
 if(!title||!year(show.premiered))return null;
 const params=new URLSearchParams({
  action:'query',generator:'search',gsrsearch:'"'+title+'" série télévisée',
  gsrlimit:'5',prop:'extracts',exintro:'1',explaintext:'1',exchars:'650',
  format:'json',formatversion:'2',origin:'*'
 });
 const data=await json('https://fr.wikipedia.org/w/api.php?'+params,4100);
 const candidates=(data?.query?.pages||[]).filter(p=>!p.missing);
 const matches=candidates.map(p=>wikiCandidate(p,show)).filter(Boolean);
 // Choosing the first API result is fine only after both title and year validation.
 return matches[0]||null;
}
function utf8Excerpt(raw){
 const text=clean(raw);
 const enc=new TextEncoder();let result='';
 for(const char of text){
  if(enc.encode(result+char).length>440)break;
  result+=char;
 }
 if(result.length<text.length){
  const boundary=Math.max(result.lastIndexOf('. '),result.lastIndexOf('! '),result.lastIndexOf('? '));
  result=boundary>=160?result.slice(0,boundary+1):result.replace(/\s+\S*$/,'').trim()+'.';
 }
 return result;
}
function isFrench(text,original){
 const result=clean(text);
 if(result.length<35||norm(result)===norm(original))return false;
 if(/(?:MYMEMORY WARNING|QUOTA FINISHED|INVALID LANGUAGE|PLEASE PROVIDE)/i.test(result))return false;
 const count=(result.match(/\b(?:le|la|les|des|une|un|dans|leur|leurs|depuis|avec|pour|qui|que|et|sur|est|sont|du|aux|entre|elle|ils|cette|ces|sans|mais)\b/gi)||[]).length;
 return count>=3;
}
export async function translatedFrenchSynopsis(english){
 const segment=utf8Excerpt(english);
 if(segment.length<40)return null;
 const url='https://api.mymemory.translated.net/get?'+new URLSearchParams({q:segment,langpair:'en|fr'});
 try{
  const data=await json(url,6000);
  if(Number(data.responseStatus)!==200||data.quotaFinished===true)return null;
  const result=clean(data.responseData?.translatedText);
  if(!isFrench(result,segment))return null;
  return {text:shorter(result),source:'translated'};
 }catch{return null}
}
const unavailable={text:'',source:'unavailable'};
export async function getFrenchSynopsis(show,english=''){
 const editorial=findFrenchEditorial(show);
 if(editorial)return editorial;
 const key=cacheKey(show);
 cacheRead();
 const cached=cache.get(key);
 if(cached&&cached.expiry>Date.now())return cached.result;
 let result=null;
 try{result=await wikipediaFrenchSynopsis(show)}catch{}
 if(!result)result=await translatedFrenchSynopsis(english);
 if(!result)result=unavailable;
 cacheWrite(key,result,result.source==='unavailable'?FAIL_TTL:GOOD_TTL);
 return result;
}
