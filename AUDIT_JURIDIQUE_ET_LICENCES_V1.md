# SériesClubTCG V1.0 — Audit juridique, images et autorisations

**État au 23 octobre 2026 — pré-lancement, aucune licence commerciale présumée.**

Ce document est un **registre de vérifications**, pas un avis juridique ni une attestation des ayants droit. Les textes et marques de tiers restent soumis à leurs conditions. Ne pas annoncer un lancement commercial tant que les points bloquants ne sont pas résolus.

## 1. Inventaire constaté en production

Lecture Supabase sur `public.series`, 23/10/2026 :
- **81 862 séries**, toutes référencées avec `source='tvmaze'` et une URL d'affiche contenant `tvmaze`.
- **2 640 séries admissibles pour le catalogue France** ; leurs affiches pointent également vers le CDN TVmaze.
- **Aucune affiche principale TMDB** dans `series.image_url` à cette date.
- Des portraits de personnes et des affiches associées aux fiches de distribution sont aussi chargés **à la demande depuis TVmaze** ; ces contenus peuvent présenter des droits additionnels.
- Les plateformes dans le module « Où regarder » proviennent notamment de données de disponibilité **TMDB / JustWatch**. Avant ce correctif, ce module pouvait afficher leurs logos via le CDN TMDB.
- Les logos de fournisseurs récupérés depuis le CDN TMDB sont **désactivés** en V1 (voir `v5/fr-watch.js`) ; les noms textuels et les liens sortants sont conservés.
- Les visuels « booster Original/Halloween », le logo SériesClubTCG et les graphismes d'habillage sont des éléments du dépôt à auditer comme créations propres ou sources tierces ; aucune preuve de cession ou d'originalité n'est déduite de leur seule présence.

## 2. Matrice des sources et droits

| Élément | Utilisation constatée | Conditions vérifiées | Décision V1 |
| --- | --- | --- | --- |
| Données TVmaze | Titres, genres, dates, fiches | API sous licence **CC BY-SA** ; attribution et partage dans les mêmes conditions pour les adaptations concernées. Usage commercial des données admis par TVmaze. | **Maintenir avec attribution** visible et lien vers les fiches TVmaze. Tracer les transformations et valider la portée du ShareAlike avant distribution de données dérivées. |
| Affiches et photographies TVmaze | URL CDN directes, sans réhébergement | TVmaze autorise le hotlink ; un administrateur recommande le lien direct y compris pour un site commercial et indique gérer les demandes de retrait reçues sur son CDN. **Ce n'est pas une licence globale couvrant nécessairement toute reproduction, notamment dans un jeu de cartes payant.** | **Pré-lancement conditionnel**, hotlink + attribution + procédure de retrait ; demander une confirmation écrite spécifiant les cartes/boosters, l'usage promotionnel, la monétisation, les territoires et les conditions de suppression. |
| TMDB | Synchronisation des fournisseurs français, certaines métadonnées ; pas d'affiche principale en base | Gratuit pour usage non commercial sous attribution ; accord commercial requis si objectif principal de revenus. Avis et **logo TMDB approuvé** exigés pour l'attribution. | **Bloquer la commercialisation tant qu'une licence commerciale ou une solution de remplacement licite n'a pas été mise en place.** Publier l'avis textuel officiel ; intégrer ensuite un logo TMDB approuvé selon ses spécifications. |
| Logos SVOD provenant de TMDB | Icônes dans « Où regarder » | Les illustrations d'enseignes, CDN et chartes n'équivalent pas à une licence de marque. | **Désactivés**. Présentation textuelle et liens externes uniquement, sans fausse affiliation. |
| Noms Netflix, Disney+, Prime Video, etc. | Identification textuelle des services, packs thématiques | Marques de tiers ; identification descriptive sans confusion à apprécier selon le contexte. Des packs vendus « Netflix » pourraient donner une impression de partenariat. | Conserver la mention « sélection thématique non officielle » ; demander une revue marques avant marketing, achats payants et usage des logos. |
| JustWatch | Liens sortants et relevés éditoriaux datés | Les liens ne valent pas partenariat ni licence de données. Ne pas automatiser d'extraction non autorisée. | Conserver liens, attribution et dates de relevé. Vérifier toute exploitation des données à grande échelle. |
| Hébergement GitHub Pages | Application HTML/JS publique en préproduction | GitHub Pages n'est pas autorisé comme hébergement gratuit d'un service principalement commercial ou de vente en ligne. | **Ne pas s'appuyer sur GitHub Pages pour la future version commerciale.** Préparer une migration vers un hébergeur dont les conditions autorisent l'activité (ex. évaluer Cloudflare Pages), puis tester Auth et déploiement. |
| Nom SériesClubTCG et domaine | Identité de projet | Recherche antériorités INPI / EUIPO, variantes proches et classes pertinente non encore documentée. | Vérification formelle avant marque, publicité et paiement. |

### Sources primaires
- TVmaze — API, images, licence et hotlink : https://www.tvmaze.com/api
- TVmaze — politique copyright : https://www.tvmaze.com/site/copyright
- TVmaze — réponse de son équipe sur l'usage commercial de posters et la préférence pour le hotlink : https://www.tvmaze.com/threads/6552/using-posters-and-data-from-tvmaze-api-on-a-commercial-website
- TMDB — conditions API, commercial et attribution : https://developer.themoviedb.org/docs/faq
- TMDB — logos approuvés : https://www.themoviedb.org/about/logos-attribution
- TMDB — conditions : https://www.themoviedb.org/api-terms-of-use
- GitHub Pages — conditions d'usage et exclusions commerciales : https://docs.github.com/fr/pages/getting-started-with-github-pages/github-pages-limits
- Droit d'auteur en France — accès public ne signifie pas libre réutilisation : https://www.economie.gouv.fr/apie/utiliser-un-contenu-vrai-faux
- INPI — base de marques et recherche de similitudes : https://www.inpi.fr/ressources/propriete-intellectuelle/rechercher-une-marque-base-marques
- CNIL — éléments requis dans une politique de confidentialité : https://www.cnil.fr/fr/passer-laction/rgpd-les-premieres-etapes
- Entreprendre.Service-Public — mentions légales et commerce en ligne : https://entreprendre.service-public.gouv.fr/vosdroits/F23455

## 3. Correctifs techniques effectués

1. `v5/fr-watch.js` : drapeau `platformLogoUsageApproved=false`, aucune image de plateforme TMDB dans les fiches « Où regarder ».
2. `v4/series.js` : lien individuel TVmaze avec libellé « données et affiche », y compris quand l'URL de la fiche n'était pas disponible dans les données reçues.
3. `v1/rights.js` : nouvelle page publique « Sources et droits », avec attribution TVmaze/CC BY-SA, avis TMDB exact, information sur les marques et absence de partenariats.
4. `v1/product.js` et `v1/privacy.js` : crédits accessibles depuis À propos, le pied de page et les mentions légales.
5. `tests/v1_legal_rights.test.mjs` : non-régression sur les logos, la source et le maintien du statut V1.

**Texte d'attribution TMDB :**
> This product uses the TMDB API but is not endorsed or certified by TMDB.

**Attention :** ce texte ne remplace pas l'obligation d'utiliser un **logo TMDB officiellement approuvé** ni l'accord commercial éventuel.

## 4. Informations juridiques indispensables encore manquantes

À obtenir de l'exploitant avant publication officielle :
- Forme juridique réelle de l'éditeur, nom commercial, identité légale, adresse professionnelle, SIREN/SIRET si applicable, modalités de TVA et coordonnées de contact direct.
- Mentions d'hébergement complètes (prestataire retenu pour le lancement, raison sociale, adresse et contact).
- CGU et, **si vente ou abonnement**, CGV, conditions de remboursement, durée, rétractation le cas échéant, médiation de la consommation, résiliation en ligne et informations sur le prix.
- Politique RGPD consolidée : responsable/contacts, finalités et bases légales par traitement, destinataires/sous-traitants, localisation et transferts, durées concrètes de conservation, droits utilisateurs, traceurs et préférences.
- Traitement des mineurs, contenus communautaires, modération, droit à l'image, photographie d'acteurs, signalements et demandes de retrait **accessibles même sans compte**.
- Analyse de la commercialisation de crédits, boosters aléatoires et publicité, à soumettre à un conseil juridique spécialisé si le modèle payant est confirmé.
- Politique contractuelle pour les droits sur les œuvres et visuels : étendue des utilisations, durée, monde/France, miniature/cartes/boosters, promotion, caractère payant, stockage, retrait et preuve conservée.

## 5. Procédure de retrait avant lancement

Préparer une adresse de contact professionnelle et un mécanisme utilisable par les titulaires de droits **sans devoir créer de compte**. Documenter l'URL, le titulaire de droits, la justification, la date du signalement, l'accusé de réception, la mesure prise et la date de clôture. Avant ouverture, ajouter un moyen d'**exclure une image** du catalogue et des collections même si TVmaze la laisse disponible, avec substitution par un graphisme original sans atteinte aux droits.

Un formulaire de signalement interne existe déjà, mais nécessite actuellement une connexion. **La procédure publique de retrait est à créer et tester.**

## 6. Décision juridique et lancement

**Feu orange pour poursuite des développements et tests** ; **feu rouge pour paiement en euros, Premium payant, publicité monétisée ou lancement public sans validation complémentaire**.

Les mesures de prudence déployées ne constituent pas une licence et n'éteignent pas les droits des ayants droit. En particulier les noms de plateformes sur des packs monétisés demandent une revue spécifique du risque de confusion.

## 7. Demandes préparatoires aux fournisseurs (ne pas considérer envoyées)

**TVmaze — contact commercial :** https://www.tvmaze.com/api/plans (coordonnées et licence à confirmer au moment de l'envoi).

Subject: SériesClubTCG — confirmation of TVmaze poster and API use in a collectible TV game

Hello, We develop SériesClubTCG, a France-focused collectible card website for television series. The current prototype hotlinks show posters to TVmaze and credits TVmaze on show pages, using the CC BY-SA dataset. We are considering advertising and/or optional subscriptions and virtual credit packs. Could you confirm in writing whether direct hotlinking and displaying show posters and actor images within collectible cards, booster-opening animations, user collections and promotional screenshots is permitted for commercial use? Are there restrictions on marketing, caching, geographical coverage, credit placement, ShareAlike, removal requests or specific rightsholders? We would not reproduce logos without permission. We would appreciate any applicable licensing documentation. Thank you.

**TMDB — licence commerciale :** sales@themoviedb.org (adresse indiquée par la FAQ officielle).

Subject: Commercial API licensing request — SériesClubTCG (France)

Hello, We are preparing a French television-series collectible web game. We currently use TVmaze-hosted show posters, while the TMDB API supplies watch-provider availability information for France. We are considering optional paid subscriptions, virtual credits and advertising in the future. Please provide the commercial API/data licensing options and terms for this use case, including pricing, required attribution/logo, hosting, caching, redistribution, and restrictions around displaying streaming-provider metadata. The project is in pre-launch and paid features are disabled. Thank you.

**Aucune demande n'a été envoyée** par cet audit. Ne jamais enregistrer un accord verbal ou une réponse automatique comme licence commerciale définitive.
