/** Labels français des genres TVmaze. Les identifiants source ne changent pas. */
const genres=Object.freeze({
 'Action':'Action','Adult':'Adulte','Adventure':'Aventure','Anime':'Animation japonaise',
 'Animation':'Animation','Children':'Jeunesse','Comedy':'Comédie','Crime':'Policier',
 'Documentary':'Documentaire','Drama':'Drame','Family':'Famille','Fantasy':'Fantastique',
 'Food':'Cuisine','Game Show':'Jeu télévisé','History':'Historique','Horror':'Horreur',
 'Legal':'Judiciaire','Medical':'Médical','Music':'Musique','Mystery':'Mystère',
 'Nature':'Nature','Reality':'Téléréalité','Romance':'Romance','Science-Fiction':'Science-fiction',
 'Sports':'Sport','Supernatural':'Surnaturel','Thriller':'Thriller','Travel':'Voyage',
 'War':'Guerre','Western':'Western'
});
export function genreFR(value){return genres[String(value??'')]||String(value??'')}
export function genresFR(values=[]){return (Array.isArray(values)?values:[]).map(genreFR)}
