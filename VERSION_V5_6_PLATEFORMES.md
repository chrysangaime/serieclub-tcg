# SérieClub TCG V5.6.1 — « Disponible sur… »

## Objectif

Dans chaque fiche, remplacer le grand encadré générique « Série diffusée en France » par une **présentation courte et visuelle des services réellement recensés en France**, directement sous les genres et la rareté officielle.

## Présentation

- **Disponible sur** : affiche les services pour lesquels une offre par abonnement, gratuite ou avec publicité est réellement répertoriée.
- **Achat / Location** : affiche séparément les plateformes qui vendent ou louent les épisodes, sans les qualifier d'abonnement inclus.
- Chaque plateforme est un badge compact et cliquable ; lorsqu'un lien officiel à l'œuvre est disponible et vérifié, il ouvre directement la page de la série (sinon la fiche française JustWatch ou TMDB).
- Une ligne discrète affiche la **source française et la date** du relevé. Les anciennes observations restent signalées comme telles ; elles ne sont pas présentées comme une garantie de disponibilité actuelle.
- Sans offre connue, la fiche indique « Plateformes françaises non encore renseignées », pas que la série serait indisponible en France.
- Aucun deuxième bloc « Où regarder » n'est répété en bas de la fiche : la distribution et le résumé conservent une place suffisante.
- Les services sont présentés sous forme de **pastilles typographiques de marque**, sans prétendre embarquer les logos officiels lorsqu'aucun visuel autorisé n'est fourni.

## Exemple réel — How I Met Your Mother (TVmaze #171)

[JustWatch France](https://www.justwatch.com/fr/serie/how-i-met-your-mother) — relevé français du **17 octobre 2026** :

| Type | Plateformes |
|---|---|
| **Streaming par abonnement** | **Disney+** |
| **Achat numérique** | **Apple TV Store**, **Amazon Video** |

Amazon Video à l'achat **ne signifie pas** que l'abonnement Prime Video comprend la série. Un lien Disney+ permet également d'ouvrir sa page officielle en France : https://www.disneyplus.com/fr-fr/browse/entity-bc68ac79-3ace-4427-9ec0-5ee6f314d194.

## Exploitation et maintenance

- Les observations publiques sont dans `data/watch-fr.json` ; l'entrée de *The X-Files* (TVmaze #430) est conservée.
- La synchronisation TMDB/JustWatch par GitHub Actions peut compléter les offres françaises si elle dispose des secrets nécessaires.
- **Aucune nouvelle migration SQL, aucun nouveau compte ou secret n'est nécessaire pour voir cet affichage sur les deux séries déjà renseignées.**
- Les titres sans relevé attendent une vérification, sans inventer de plateforme.
- Ce chantier n'affecte pas les raretés fixes, les fusions ni les règles d'éligibilité française des séries.

## Vérifications

Le fichier `tests/watch-platforms.test.mjs` contrôle la distinction abonnement/achat pour *How I Met Your Mother*, l'emplacement des badges, les liens directs validés et la protection contre les liens HTML dangereux. Le workflow GitHub Actions vérifie également la présence de l'offre Disney+ et des options d'achat dans les données.

Site : https://chrysangaime.github.io/serieclub-tcg/
