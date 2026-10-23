-- SériesClubTCG V1.0 : limiter les droits Data API à la surface réellement utilisée.
-- La sécurité des lignes reste gérée par les politiques RLS existantes.
-- Les fonctions SECURITY DEFINER validées exécutent leurs écritures côté serveur.
-- Les rôles postgres/service_role ne sont pas modifiés.
BEGIN;

-- Cartes, portefeuille et historique : lecture uniquement du propriétaire via RLS.
REVOKE ALL PRIVILEGES ON TABLE
 public.player_cards, public.player_wallets, public.game_transactions
 FROM anon, authenticated;
GRANT SELECT ON TABLE
 public.player_cards, public.player_wallets, public.game_transactions
 TO authenticated;

-- Les souhaits sont les seules données de collection éditables directement
-- par un joueur : INSERT / DELETE avec vérification du propriétaire via RLS.
REVOKE ALL PRIVILEGES ON TABLE public.player_wishlist FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.player_wishlist TO authenticated;

-- Profil : visibilité publique assumée du pseudonyme ; création et édition
-- uniquement pour son propre profil, contrôlées par les politiques existantes.
REVOKE ALL PRIVILEGES ON TABLE public.profiles FROM anon, authenticated;
GRANT SELECT ON TABLE public.profiles TO anon, authenticated;
GRANT INSERT, UPDATE ON TABLE public.profiles TO authenticated;

-- Le catalogue et les deux vues publiques sont strictement consultables.
-- Le remplissage du catalogue passe exclusivement par les scripts d'administration.
REVOKE ALL PRIVILEGES ON TABLE
 public.series, public.playable_fr_series, public.public_leaderboard
 FROM anon, authenticated;
GRANT SELECT ON TABLE
 public.series, public.playable_fr_series, public.public_leaderboard
 TO anon, authenticated;

COMMIT;

-- Vérification non destructive après installation :
-- SELECT table_name,grantee,privilege_type FROM information_schema.role_table_grants
-- WHERE table_schema='public' AND table_name IN
-- ('profiles','series','player_cards','player_wallets','game_transactions',
--  'player_wishlist','playable_fr_series','public_leaderboard')
-- AND grantee IN ('anon','authenticated') ORDER BY table_name,grantee,privilege_type;
