/**
 * SérieClub TCG — plan de découverte France.
 * Le tri TMDB par popularité masque de nombreuses séries patrimoniales.
 * On parcourt des périodes disjointes sans dépasser la limite de 500 pages
 * par requête TMDB, tout en revisitant régulièrement les nouveautés.
 *
 * Aucune période ne constitue une preuve de diffusion française : cette
 * preuve provient toujours de /tv/{id}/watch/providers results.FR.
 */
export const ARCHIVE_PERIODS=Object.freeze([
 [1990,1994],[1995,1999],[2000,2004],[2005,2009],
 [1985,1989],[1980,1984],[1975,1979],[1970,1974],
 [1960,1969],[1950,1959],[1900,1949],
 [2010,2014],[2015,2019],[2020,2024],[2025,2030]
].map(([start,end])=>Object.freeze({start,end})));

function bounded(value,low,high,fallback){
 const num=Number(value);
 return Number.isSafeInteger(num)&&num>=low&&num<=high?num:fallback;
}
export function discoveryCursor(state={},forcedMode='auto'){
 const legacy=bounded(state.next_page,1,500,1);
 const runs=bounded(state.discovery_runs,0,1000000,0);
 const mode=forcedMode==='archive'||forcedMode==='popular'?forcedMode:
  runs%4===3?'popular':'archive';
 const raw=state.archive_cursor||{};
 return {
  mode,runs,
  archive:{period:bounded(raw.period,0,ARCHIVE_PERIODS.length-1,0),
   page:bounded(raw.page,1,500,1)},
  popular:{page:bounded(state.popular_page,1,500,legacy)}
 };
}
export function discoveryParams(cursor){
 const params=new URLSearchParams({
  language:'fr-FR',watch_region:'FR',
  with_watch_monetization_types:'flatrate|free|ads|rent|buy',
  include_adult:'false',sort_by:'popularity.desc',
  page:String(cursor.mode==='popular'?cursor.popular.page:cursor.archive.page)
 });
 if(cursor.mode==='archive'){
  const period=ARCHIVE_PERIODS[cursor.archive.period];
  params.set('first_air_date.gte',period.start+'-01-01');
  params.set('first_air_date.lte',period.end+'-12-31');
 }
 return params;
}
export function advanceDiscovery(cursor,totalPages){
 const maximum=Math.max(0,Math.min(500,Math.floor(Number(totalPages)||0)));
 if(cursor.mode==='popular'){
  cursor.popular.page=cursor.popular.page>=maximum?1:cursor.popular.page+1;
 }else{
  cursor.archive.page++;
  if(cursor.archive.page>maximum){
   cursor.archive.page=1;
   cursor.archive.period=(cursor.archive.period+1)%ARCHIVE_PERIODS.length;
  }
 }
 return cursor;
}
export function discoveryLabel(cursor){
 if(cursor.mode==='popular')return 'palmarès actuel · page '+cursor.popular.page;
 const p=ARCHIVE_PERIODS[cursor.archive.period];
 return 'patrimoine '+p.start+'–'+p.end+' · page '+cursor.archive.page;
}
export function saveDiscoveryCursor(state,cursor){
 state.discovery_runs=cursor.runs+1;
 state.archive_cursor={...cursor.archive};
 state.popular_page=cursor.popular.page;
 state.next_page=cursor.popular.page; // rétrocompatibilité V5.7
 return state;
}
