# V20 — Collection intelligente inspirée des bonnes pratiques TCG

Le suivi est opt-in : ouvrir une saison Top 20 puis « Suivre / préparer ma collection », ou utiliser « Préparer mes six Top 20 ». La migration serveur :

- ajoute les séries manquantes (catalogue France vérifié) dans les souhaits sans doublon ;
- protège **un seul exemplaire disponible** de chaque série possédée, sans toucher aux cartes engagées dans les échanges ;
- protège automatiquement les futurs exemplaires obtenus dans les saisons suivies ;
- retire un souhait lors de l'obtention d'un exemplaire ;
- remet dans les souhaits une série suivie si le dernier exemplaire quitte l'inventaire ;
- autorise les albums personnels à référencer jusqu'à 100 séries, sans devoir déjà posséder leurs cartes ;
- préserve les verrous existants lors d'un arrêt du suivi.

Ne pas présenter ce dispositif comme actif tant que `supabase/game_v20_collection_automation.sql` n'a pas été exécuté dans Supabase. Aucune clé privée, aucun crédit, aucune rareté ne sont touchés. L'écriture est validée par PostgreSQL via `auth.uid()`.

Inspirations fonctionnelles consultées : Cineclub TCG (album sans carte, wishlist, protection) et CineTCG (wishlist des classeurs, cartes recherchées, confirmation des actions en lot). Aucun code ni identité graphique de ces sites n'a été copié.
