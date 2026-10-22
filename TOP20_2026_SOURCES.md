# Source des sélections Top 20 édition 2026

- Capture du cache `data/watch-fr.json` du 22 octobre 2026, offres françaises de type `flatrate` ou `ads` uniquement.
- Séries françaises certifiées `fr_verified=true`, rareté déjà attribuée, affiche valide.
- « Top 20 du Club » = sélection éditoriale par `popularity_weight` puis note `rating_average`. **Ce n'est pas un Top 20 officiel de visionnage** Netflix, Amazon, Disney+.
- Les identifiants des 20 titres sont figés par `supabase/game_v19_top20.sql`. Un changement de fournisseur après publication ne réécrit pas la saison.
- Le déclenchement des récompenses se fait uniquement par la fonction serveur `claim_official_season` vérifiant 20 titres distincts de la liste.
- La migration échoue sans attribuer de saison si une sélection ne peut pas être remplie exactement avec 20 séries françaises éligibles.

- **Top 20 Netflix France** : 143 candidats français au moment du relevé (identifiants TVMaze du cache).
- **Top 20 Prime Video France** : 134 candidats français au moment du relevé (identifiants TVMaze du cache).
- **Top 20 Disney+ France** : 123 candidats français au moment du relevé (identifiants TVMaze du cache).

Trois sélections complémentaires sont constituées directement depuis la base certifiée France : classiques antérieurs à 2000, SF/fantasy, thrillers/enquêtes. Les six défis historiques de huit séries ne sont pas supprimés.
