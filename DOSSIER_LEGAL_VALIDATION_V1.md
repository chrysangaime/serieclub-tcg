# Epizora TCG — Dossier juridique à compléter avant ouverture publique

**Projet V1.0 · 23 octobre 2026 · VERSION DE TRAVAIL NON PUBLIABLE COMME DOCUMENT DÉFINITIF**

Le site expose aujourd'hui des pages « Confidentialité » et « Mentions légales » explicitement provisoires. Elles ne constituent pas un dossier de conformité achevé. N'inscrire aucune adresse, aucun statut juridique ou SIREN inventés. Les informations suivantes sont des champs **à renseigner et vérifier auprès de l'exploitant**.

## Fiche d'identification de l'éditeur

- Exploitant / raison sociale : **À RENSEIGNER**
- Statut juridique (EI, microentreprise, société, autre) : **À RENSEIGNER**
- Adresse professionnelle déclarable et contact direct pour les personnes concernées : **À RENSEIGNER**
- SIREN / RCS, TVA si applicable : **À VÉRIFIER ET RENSEIGNER**
- Directeur de publication : **À RENSEIGNER**
- Hébergeur au lancement : **À DÉCIDER** (GitHub Pages ne doit pas héberger la version commerciale principale).
- Contact public utilisable par les titulaires de droits, sans compte joueur : **À CRÉER ET TESTER**
- Médiateur de la consommation, si commercialisation B2C : **À CONTRACTUALISER**

## Projet de CGU — clauses fonctionnelles (à faire valider)

1. **Objet.** Epizora TCG est un service indépendant de découverte et de collection virtuelle de séries télévisées. Son catalogue vise les œuvres diffusées en France. Les données de diffusion sont indicatives, datées et susceptibles d'évoluer.
2. **Accès.** La création d'un compte permet de sauvegarder les cartes, crédits virtuels, échanges et préférences. Les identifiants doivent être protégés. Les conditions applicables aux mineurs et les modalités de consentement parental restent à définir avant ouverture.
3. **Crédits et cartes.** Les cartes et crédits appartiennent au fonctionnement du service, ne sont ni titres de propriété sur les œuvres ni actifs financiers et n'ont aucune valeur de rachat garantie. Les tirages sont calculés côté serveur et soumis aux règles publiées. Les crédits gratuits ne peuvent être convertis en euros.
4. **Contenus et propriété intellectuelle.** L'apparition d'un titre, d'une affiche ou d'une marque n'implique aucune affiliation, parrainage ou autorisation générale des ayants droit. Les œuvres, photographies et signes de tiers conservent leurs droits. L'utilisateur n'acquiert aucun droit de reproduction ou de vente de ces images.
5. **Contenus communautaires.** Pseudonymes, annonces et albums publics doivent être licites et ne pas porter atteinte aux droits d'autrui. Les signalements sont traités suivant une procédure à finaliser avec un canal accessible sans inscription. Ne pas prétendre qu'une modération humaine en temps réel est assurée si ce n'est pas le cas.
6. **Données personnelles.** Les traitements, durées, prestataires et droits sont décrits dans une **politique de confidentialité distincte**. Un export et une demande de suppression sont proposés depuis les paramètres. Le caractère immédiat ou différé de la suppression doit correspondre aux procédures techniques effectives.
7. **Disponibilité et évolution.** Pendant l'accès anticipé, la V1 peut présenter des indisponibilités et ajuster des contenus ; les comptes et cartes enregistrés ne doivent pas être présentés comme garantis indépendamment de sauvegardes réellement testées.
8. **Achat, paiement et abonnement.** Les paiements en euros et le Premium commercial sont désactivés en V1. **Aucune clause commerciale effective** ne peut être publiée tant que les prix TTC, modalités de livraison numérique, conditions de rétractation, CGV, facturation, reconduction, résiliation, médiateur et obligations applicables aux mineurs ne sont pas validés.

**Révision obligatoire :** clauses d'interruption, responsabilité, juridiction compétente et toutes limitations doivent respecter le droit impératif français des consommateurs ; éviter toute renonciation abusive.

## Politique RGPD — registre de rédaction

| Traitement | Données constatées ou possibles | Finalité proposée | Base juridique / durée / garanties |
| --- | --- | --- | --- |
| Compte et authentification | Email, identifiants, jetons de session | Créer et sécuriser l'accès | Définir base légale, procédure de purge et durée selon Supabase Auth |
| Collection | Pseudonyme, cartes, souhaits, crédits, historique, albums | Exécution du service de collection | Définir durée après résiliation et sauvegardes |
| Fonctionnalités communautaires | Pseudonyme, annonces, échanges, albums publics | Mise en relation et modération | Définir visibilité, effacement, conservation des signalements |
| Sécurité / signalements | Données techniques, identifiants, motif, texte | Prévenir fraude et contenus illicites | Documenter minimisation, délais et accès administrateurs |
| Services externes d'images | Adresse IP et en-têtes envoyés par le navigateur vers les CDN d'images | Afficher les affiches et portraits | Informer du chargement tiers, de leurs politiques et examiner transferts |
| Paiements futurs | ID d'abonnement, opérations et coordonnées traitées par Stripe | Achat optionnel | À définir uniquement avant activation, avec prestataires, délais légaux et CGV |
| Publicité future | Identifiants publicitaires / mesure d'audience non strictement nécessaire | Monétisation | **Ne pas activer sans analyse, transparence et consentement valide si requis** |

Cette liste doit être rapprochée de l'inventaire effectif Supabase, des paramètres Auth, CDN, GitHub et des règles CNIL. Réaliser le registre de traitements, documenter les sous-traitants, accords de traitement (DPA), pays de traitement et mécanismes de transfert éventuels. Déterminer une durée **précise et défendable** par catégorie : le RGPD n'impose pas une durée unique. Tester effectivement export/effacement et sauvegardes.

## Politique médias et marques — clauses opérationnelles

- Pas de réhébergement ni de téléchargement automatique des affiches TVmaze tant que cela n'est pas couvert.
- Source TVmaze liée dans les fiches ; indication visible de l'attribution, du régime CC BY-SA applicable aux données et des éventuelles modifications.
- Aucune illustration TMDB ni logo de plateforme non autorisé. Le nom des plateformes est utilisé de manière descriptive, sans pack marqué comme « officiel ».
- Si l'utilisation des offres TMDB devient commerciale, obtenir une licence écrite ou substituer une source dont les droits commerciaux sont établis.
- Toute demande de retrait d'une photo, d'une affiche ou d'une marque doit pouvoir être reçue sans compte ; conserver une trace, masquer la ressource litigieuse, rechercher les copies mises en cache et vérifier sa disparition sur toutes les pages.
- Ne pas utiliser d'affiches ou logos pour la publicité, les réseaux sociaux ou les supports imprimés avant validation des usages promotionnels.
- Chercher les antériorités de « Epizora TCG », « SériesClub » et formes proches (INPI, EUIPO, recherche de similarités), puis documenter le résultat avant communication payante.

## Feu vert à délivrer avant le lancement

- [ ] Identification et coordonnées professionnelles obligatoires renseignées.
- [ ] Contact RGPD/droits d'auteur public et sans compte opérationnel.
- [ ] Conditions de TVmaze sur les images dans le jeu et sur la monétisation établies par écrit, retrait documenté.
- [ ] Licence TMDB commerciale ou remplacement des relevés TMDB, logo TMDB approuvé si utilisation maintenue.
- [ ] Source hébergée selon des conditions adaptées à une activité commerciale.
- [ ] CGU définitives, politique RGPD et, le cas échéant, CGV/abonnement/rétractation et médiateur validés.
- [ ] Vérification de la marque et des noms proches ; traitement des mineurs / signalements.
- [ ] Tests des opérations réelles, résiliation et purge des médias litigieux.
