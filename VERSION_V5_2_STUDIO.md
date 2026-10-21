# SérieClub TCG V5.2 — Le Studio de collection

## Objectif
Transformer la grille de cartes en un véritable tableau de bord de collection, sans nouvelle migration SQL. Les statistiques et les actions sont calculées à partir des cartes du compte joueur déjà enregistrées dans Supabase.

## Les cinq modes

- **Toutes mes cartes :** tous les exemplaires obtenus, classables par rareté, titre, date d'acquisition ou nombre de copies. La protection d'une carte reste individuelle.
- **Mes séries :** un élément par série TVMaze, même si le joueur possède plusieurs exemplaires.
- **Doublons :** uniquement les séries dont le joueur détient au moins deux exemplaires ; affiche nombre de copies, cartes protégées et cartes engagées.
- **Protégées :** séries dont au moins un exemplaire est verrouillé.
- **À rechercher :** **uniquement les séries de la liste de souhaits que le joueur ne possède pas encore**. Cette liste n'est pas une représentation de la totalité des œuvres manquantes dans le catalogue.

Un filtre de texte, de rareté officielle et de genre, ainsi que les quatre tris disponibles, peuvent être combinés. Chaque page affiche au plus 48 exemplaires ou entrées, ce qui limite le coût d'affichage avec de grandes collections.

## Progression dans le catalogue

Le Studio affiche :
- le nombre de cartes réellement détenues ;
- le nombre de séries distinctes ;
- les exemplaires supplémentaires au-delà de la première copie ;
- les séries ayant un doublon disponible pour une vente ;
- le nombre de séries possédées à rareté connue sur le total des séries **classées et illustrées**, calculé à partir de Supabase.

Le dénominateur provient d'une requête de comptage exacte sans récupération de toutes les séries. Si ce calcul est indisponible, le site masque le pourcentage plutôt que d'inventer une statistique. Une session est limitée à l'affichage des 3 000 exemplaires les plus récents ; un avertissement s'affiche lorsqu'une collection atteint ce seuil.

## Vente des doublons

Depuis la vue **Doublons**, « Vendre un doublon » mène au **Comptoir** avec la carte présélectionnée.

Le raccourci ne propose jamais :
- une carte verrouillée ;
- une carte proposée dans un échange et réservée ;
- une carte faisant déjà l'objet d'une annonce active ;
- la seule copie non engagée, si tous les autres exemplaires sont déjà proposés dans le marché ou dans des échanges.

Ce sont des protections **d'interface supplémentaires** ; les RPC sécurisées de Supabase continuent de vérifier les droits de propriété et les statuts des cartes au moment de la transaction.

## Indicateur du catalogue

Le catalogue affiche maintenant un badge **« Dans ta collection »** et le nombre d'exemplaires pour les séries déjà possédées. La rareté d'une série est toujours sa rareté officielle unique enregistrée par la migration V5.

## Export CSV

Le bouton **« Exporter CSV »** télécharge une ligne par série distincte avec titre, identifiant TVMaze, année, rang officiel, exemplaires, doublons, protégées, engagées et genres.

Le CSV utilise le séparateur point-virgule et un encodage UTF-8 avec BOM pour une ouverture pratique dans Excel en français. Les cellules sont entre guillemets et les noms commençant par un caractère de formule sont neutralisés pour éviter leur exécution dans un tableur.

L'export ne fait pas sortir de données d'autres joueurs, ne modifie pas la collection et ne nécessite aucune API supplémentaire.

## Tests

`tests/collection.test.mjs` : six scénarios couvrant les séries homonymes à identifiants distincts, les doublons, les réservations, les souhaits, les filtres, la pagination jusqu'à 3 000 cartes, l'échappement HTML et la sécurité du CSV.

Commandes utilisables en local :
```bash
npm run check
npm test
```

Ces tests sont également inclus dans le workflow GitHub Actions de qualité.

## Activation

**Aucun script SQL supplémentaire** et aucune configuration requise. La version est publiée dans les fichiers du dépôt et déployée par GitHub Pages.

Site : https://chrysangaime.github.io/serieclub-tcg/

### Contrôles manuels conseillés

1. Ouvrir Collection, passer de « Toutes mes cartes » à « Mes séries », puis « Doublons ».
2. Vérifier qu'une série possédée deux fois n'est affichée qu'une fois en « Mes séries », avec un compteur × 2.
3. Protéger un exemplaire, vérifier la rubrique « Protégées », puis contrôler que les exemplaires engagés ne sont pas proposés à la vente.
4. Cliquer « Vendre un doublon » et vérifier que le Comptoir présélectionne la bonne carte.
5. Rechercher une série déjà possédée dans Catalogue : le badge d'appartenance doit être visible.
6. Exporter CSV et l'ouvrir dans Excel.

### Limites connues

- Les données du Studio reflètent l'inventaire chargé de ton compte et les annonces récupérées par `my_marketplace_activity`. Le serveur reste la source d'autorité si une annonce est conclue entre deux rafraîchissements.
- L'indicateur de progression ne mesure pas les titres absents de l'import ou encore classés « pending » ; il mesure uniquement le catalogue classé et illustré.
- Aucun échange ou crédit fictif n'est simulé ; l'achat et la vente restent des opérations atomiques Supabase.
