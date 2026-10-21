/**
 * Authentification TMDB exclusivement côté serveur.
 * TMDB accepte deux identifiants distincts sur son API v3 :
 *  - API Read Access Token (JWT) : en-tête Authorization: Bearer
 *  - API Key v3 (32 caractères hexadécimaux) : paramètre api_key
 *
 * IMPORTANT : n'écrire ni les URL authentifiées ni les secrets dans les logs.
 */
export function tmdbRequest(endpoint,secret) {
  const raw=String(secret||'').trim().replace(/^Bearer\s+/i,'').trim();
  if(!raw)throw Error('Identifiant TMDB manquant dans les secrets GitHub.');
  // URL construite uniquement pour l'hôte officiel : aucun secret transmis ailleurs.
  if(!/^\/(?:discover\/tv|tv\/\d+\/external_ids|tv\/\d+\/watch\/providers|search\/tv)(?:\?|$)/.test(endpoint)){
    throw Error('Chemin TMDB non autorisé');
  }
  const url=new URL('https://api.themoviedb.org/3'+endpoint);
  if(/^[a-f\d]{32}$/i.test(raw)){
    // Clé de version 3 : ne surtout pas l'envoyer comme jeton Bearer.
    url.searchParams.set('api_key',raw);
    return {url:url.toString(),headers:{},mode:'API Key v3'};
  }
  if(!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(raw)){
    throw Error('Identifiant TMDB non reconnu. Copier API Read Access Token (eyJ...) ou API Key v3 depuis les paramètres TMDB.');
  }
  return {url:url.toString(),headers:{Authorization:'Bearer '+raw},mode:'Read Access Token'};
}

export function tmdbAuthError(mode){
  return 'TMDB HTTP 401 : identifiant refusé ('+mode+
    '). Vérifier la valeur du secret TMDB_READ_ACCESS_TOKEN dans GitHub ; '+ 
    'recopier le bon identifiant depuis themoviedb.org/settings/api sans préfixe, guillemets ni espaces.';
}
