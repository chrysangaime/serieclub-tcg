# SérieClub TCG — Identité 3.1 : « Midnight Signal »

La direction artistique a été revue pour installer **une identité indépendante**, tournée vers les séries, la nuit et les collectionneurs.

## Changements visuels intégrés

- Palette permanente : fond `#111722`, panneaux bleu ardoise, turquoise `#75DBC9`, ivoire clair.
- Saison Halloween en octobre : tons aubergine/cuivre, ciel illustré, brume, lune, chauves-souris, constellation lumineuse.
- Deux pochettes originales : Classique « signal TV » et Halloween « chauve-souris en vol », lisibilité corrigée (titres et pictogrammes ne se superposent plus).
- Menu et barre supérieure modernisés, repères teal et badge d'événement en octobre.
- Six affiches maximum d'une sélection Halloween issue **du vrai catalogue Supabase**. Aucun titre ni disponibilité streaming inventés.
- Les deux décorations saisonnières sont automatiquement réduites hors d'octobre, tandis que la charte bleu pétrole reste active toute l'année.

## Streaming et découverte

Le bloc « Les séries sont partout. Le club les réunit. » présente **Netflix, Prime Video, HBO Max, Disney+, Apple TV+, CANAL+ et Paramount+** sous forme de **badges typographiques originaux** reliés à leurs sites officiels.

Ces badges ne sont pas des logos de marque copiés. Ils servent à découvrir des services, **sans prétendre qu'une série particulière y est disponible**.

Le catalogue et les sélections de saison ouvrent une fiche série proposant :

- **Chercher où regarder** : recherche de la série associée à JustWatch via un moteur de recherche externe. Les catalogues, prix et droits peuvent évoluer.
- **Rechercher un coffret** : recherche de DVD / Blu-ray sur Amazon.fr, sans supposer la disponibilité d'un coffret.

Chaque fiche explique l'indépendance du site et le statut des liens marchands.

## Activer l'affiliation Amazon — uniquement après inscription

Configuration : `v3/config.js`.

Par défaut :

```js
export const commerce = Object.freeze({
  amazonPartnerTag: '',
});
```

Cette valeur **vide** est intentionnelle : SérieClub ne prétend pas encore percevoir de commissions.

Lorsque tu disposeras d'un **identifiant de suivi Partenaires Amazon.fr attribué à ton compte**, renseigne uniquement cet identifiant public dans `amazonPartnerTag` (pas de clé d'API ou de secret). Le lien de recherche Amazon sera alors complété avec `tag=<identifiant>` et le texte « lien pouvant générer une commission » s'affichera.

Valider les liens via les outils du Programme Partenaires Amazon. Les autres marques ne constituent pas des partenaires de SérieClub et leurs liens ne sont pas des liens affiliés. Les conditions des programmes peuvent évoluer.

## Dépendances et activation

Aucune nouvelle migration SQL pour la **refonte graphique**. Les fonctionnalités suivantes dépendent toujours de la migration Supabase `supabase/game_v3.sql` :

- Paquet Halloween ;
- Protection des cartes ;
- Liste de souhaits.

Si tu as déjà exécuté V3, ne répète pas l'opération.

## Tests

Le workflow `.github/workflows/quality.yml` contrôle la syntaxe des modules, les styles, les visuels SVG, les modèles de page et l'absence de tag d'affiliation inventé. Les tests statiques ne remplacent pas un parcours réel avec un compte joueur Supabase.

Le jeu et ses créations graphiques sont indépendants de Cinéclub TCG et des plateformes citées.
