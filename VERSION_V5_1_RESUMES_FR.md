# SérieClub TCG 5.1 — Résumés français, sources contrôlées

## Objectif

Ne plus afficher systématiquement le synopsis anglais de TVmaze dans les fiches du site francophone. Les fiches restent compactes et conservent les miniatures des acteurs et de leurs autres séries.

Cette évolution ne demande **aucune migration Supabase**, aucun nouveau compte et aucune clé privée.

## Sources par ordre de priorité

1. **Textes originaux SérieClub**, rédigés en français et associés au nom **et à l'année de sortie** pour éviter les confusions entre homonymes. Première sélection : Lost (2004), Stranger Things, The X-Files, Dear White People (2017), Breaking Bad, Game of Thrones, The Last of Us, The Walking Dead, Friends, Wednesday, Sherlock, Dark, Peaky Blinders, The Office (2005), The Bear et Better Call Saul.
2. **Wikipédia en français**, lorsqu'une recherche trouve une série télévisée dont le titre ET l'année correspondent à ceux de TVmaze. Seulement un extrait court. La fiche fournit un lien vers l'article, mentionne les contributeurs de Wikipédia et la **licence CC BY-SA 4.0**, avec indication que l'extrait a été abrégé.
3. **Traduction automatique anglais → français**, à partir d'un extrait public de TVmaze. Le service de traduction MyMemory est gratuit sous conditions et peut rencontrer des quotas ou indisponibilités. La source et le caractère automatique sont affichés. Les traductions ne sont pas garanties parfaites.
4. **Aucune source française disponible** : état explicite et résumé original anglais accessible uniquement en ouvrant « Consulter le synopsis original en anglais ».

Le texte anglais n'est donc plus affiché sans action du visiteur. **Nous ne garantissons pas une traduction française de 100 % des séries** : la qualité et l'accès aux fournisseurs tiers varient.

### Cas d'homonymie

`Lost` (2004) est couvert par un texte français éditorial ; `Lost` (2001) ne reçoit **pas** ce résumé. Les extraits de Wikipédia sont rejetés si le titre ou l'année de première diffusion ne correspondent pas.

## Performance

- Recherche uniquement au moment de l'ouverture d'une fiche, sans alourdir le catalogue.
- La distribution et les informations de la série apparaissent immédiatement ; le résumé français arrive ensuite, **sans bloquer la fiche**.
- Cache local (navigateur) de 100 résultats au maximum, pendant 30 jours pour les textes français et 40 minutes pour une indisponibilité.
- Temps de recherche plafonné : environ 4 secondes pour Wikipédia, puis jusqu'à 6 secondes pour la traduction.
- Les appels ne portent que sur des informations publiques de séries, jamais sur des informations personnelles de joueur.
- Résumés TVmaze envoyés à MyMemory limités à environ 440 octets pour respecter la limite de 500 octets par requête.

## Licence et attribution

TVmaze indique que ses données et résumés sont soumis à la licence CC BY-SA. Les extraits traduits restent crédités à TVmaze et ne deviennent pas une création originale SérieClub.

Les extraits encyclopédiques sont crédités **aux contributeurs de Wikipédia**, avec lien vers l'article source et vers la licence CC BY-SA 4.0.

Le site doit conserver ces attributions en cas d'ajout de publicité ou d'affiliation. Il faudra aussi vérifier les conditions et limites de MyMemory avant une exploitation à fort trafic.

## Tests

`tests/synopsis-fr.test.mjs` vérifie :
- un résumé original français pour `Dear White People` ;
- les différences entre `Lost` 2001 et 2004 ;
- le rejet d'un article Wikipédia dont l'année ou le titre ne correspond pas ;
- l'attribution de la licence et la neutralisation du HTML ;
- la traduction automatique via réponses API simulées ;
- l'affichage du synopsis anglais uniquement dans un panneau fermé si le texte français est indisponible.

Tests CI : `node --test tests/series.test.mjs tests/synopsis-fr.test.mjs`.

Site : https://chrysangaime.github.io/serieclub-tcg/

## Vérification manuelle recommandée

Ouvrir la fiche de **Dear White People (2017)** : elle doit immédiatement afficher le résumé français. Vérifier ensuite un titre moins populaire : un résumé français issu de Wikipédia ou une traduction automatique doit s'afficher après chargement, avec sa source, ou un état d'indisponibilité explicite.
