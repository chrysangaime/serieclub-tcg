# SériesClubTCG — V1.0, préparation du lancement

## État du produit
**Version publique unique : V1.0**. Le projet est actuellement accessible en accès anticipé, **pas officiellement lancé**.

### Fonctionnalités présentes dans le code
- Authentification Supabase et collection synchronisée, paquets gratuits à cinq cartes.
- Sept raretés officielles, catalogue France, fiches de séries et diffusion française.
- Saisons officielles de huit et vingt séries, souhaits, cartes protégées, saisons personnelles.
- Jeux, fusions, profils, échanges et Comptoir selon modules serveur activés.
- Boosters SVOD (Netflix, Prime Video, Disney+, télévision) contre crédits virtuels gagnés dans le jeu **si migration V21 activée**.
- Jour/nuit, interface mobile, navigation et page de transparence.
- Démonstration de booster sans inscription (aucune attribution réelle).
- Recyclage groupé sécurisé de doublons contre crédits virtuels, **après activation de la migration SQL `game_v1_bulk_recycling.sql`**. Jusqu'à l'activation, les actions sont désactivées.
- Codes joueurs du Signal : partage de pseudonymes et abonnements via code non secret de 10 caractères, **après activation de `game_v1_invite_codes.sql`**. Pas de messagerie privée.

### À ne pas confondre avec une version publique
Les répertoires `v3/`, `v12/`, `v23/` et les migrations SQL `game_v21_...` sont **historiques et techniques**. Leur renumérotation casserait les imports, migrations et données. Les joueurs voient uniquement **SériesClubTCG V1.0**.

### Statut des paiements
Abonnement Premium dans un parcours test/suspendu selon configuration Supabase/Stripe. Vente de crédits contre euros désactivée. L'activation live exige examens réglementaires et juridiques, tests de paiements et de résiliation, conditions contractuelles et identification de l'éditeur.

## Préparer un véritable lancement
- [ ] Domaine personnalisé `seriesclub-tcg.fr` acquis, DNS/HTTPS, redirections et URL de retour auth/Stripe configurées.
- [ ] Vérifier les droits des affiches, logos, marques et conditions d'utilisation des fournisseurs.
- [ ] Identifier l'éditeur, disposer de mentions légales, politique de confidentialité, CGU, CGV si paiement.
- [ ] Contrôler RGPD : conservation, droits d'accès/suppression, contacts, sous-traitants, cookies.
- [ ] Audit Supabase en production (RLS, fonctions `SECURITY DEFINER`, transactions, quotas, abus, modération).
- [ ] Tests sur vrais navigateurs et appareils Android/iOS/desktop : login, boosters, achats en crédits, badges, échanges, thèmes et déconnexion.
- [ ] Tests de charge, accessibilité (clavier, lecteur d'écran), performances et reprise après incident.
- [ ] Contrôler la disponibilité du catalogue France et les preuves de diffusion datées.
- [ ] Valider les mécanismes des tirages aléatoires et cartes échangeables avant tout paiement en euros.
- [ ] Quand le lancement est autorisé : retirer `noindex,nofollow` et activer le référencement.

**Important :** le succès des tests de CI ne prouve pas à lui seul la conformité juridique ni l'absence de problèmes en production. Ce document est le référentiel V1.0 avant lancement.
