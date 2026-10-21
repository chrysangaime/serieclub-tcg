/** Mode entraînement sans récompense : simple limite locale de confort.
 * La véritable limite des parties à crédits est exclusivement SQL serveur.
 */
export const GAME_MODES=['poster','pixel','timeline','year'];
export const COOLDOWN_MS=24*60*60*1000;
export function trainingModeStatus(starts={},at=Date.now()){
 const modes={};
 for(const mode of GAME_MODES){
  const ts=Number(starts?.[mode]);
  const expiry=Number.isFinite(ts)&&ts>0?ts+COOLDOWN_MS:0;
  const locked=expiry>at;
  modes[mode]={available:!locked,next_available_at:locked?new Date(expiry).toISOString():null};
 }
 return modes;
}
export function canStartTraining(starts,mode,at=Date.now()){
 return GAME_MODES.includes(mode)&&trainingModeStatus(starts,at)[mode].available;
}
export function startTraining(starts,mode,at=Date.now()){
 if(!canStartTraining(starts,mode,at))return null;
 return {...starts,[mode]:at};
}
export function nextChallengeDate(mode){
 return new Date(Date.now()+COOLDOWN_MS).toISOString();
}
