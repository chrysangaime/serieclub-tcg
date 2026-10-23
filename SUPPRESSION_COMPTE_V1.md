# Suppression de compte — procédure opérationnelle V1

**Statut :** réception des demandes opérationnelle ; purge des comptes à traiter par administrateur habilité. La demande ne supprime pas immédiatement un compte.

Une demande identifiée est conservée dans `public.account_deletion_requests`. Les joueurs peuvent demander la suppression dans **Paramètres → Mes données**, après confirmation. Le moteur exige `auth.uid()`, n'expose aucune liste de demandes aux clients et ne supprime jamais les cartes au moment du dépôt.

**Traitement administrateur :** contrôler l'identité de la demande, suspendre les nouveaux échanges si nécessaire, clôturer ou résoudre les annonces et les transactions pendantes, vérifier les contraintes de suppression (en particulier `card_listings.buyer_id` qui est `NO ACTION`), exporter les éléments devant être conservés légalement s'il y en a, supprimer le compte via l'API Admin Auth Supabase avec les autorisations appropriées, puis vérifier les suppressions en cascade et les jetons de session. Ne jamais placer une clé `service_role` dans GitHub Pages.

L'utilisateur doit recevoir la confirmation effective de la suppression ou un motif documenté si des obligations réglementaires imposent la conservation de certaines données. Avant lancement officiel : identifier le responsable de ce traitement et ses coordonnées.
