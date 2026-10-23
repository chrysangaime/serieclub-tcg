-- V1 : contrôle des privilèges Data API et des politiques RLS en base de test isolée.
-- Ce script refuse toute réouverture accidentelle des opérations sensibles.
DO $$
BEGIN
 -- Visiteurs anonymes : seuls les contenus publics restent consultables.
 IF has_table_privilege('anon','public.player_cards','SELECT')
 OR has_table_privilege('anon','public.player_wallets','SELECT')
 OR has_table_privilege('anon','public.game_transactions','SELECT')
 OR has_table_privilege('anon','public.player_wishlist','SELECT') THEN
  RAISE EXCEPTION 'Données personnelles accessibles sans connexion';
 END IF;

 -- Une session authentifiée ne peut pas éditer directement soldes et cartes.
 IF has_table_privilege('authenticated','public.player_wallets','UPDATE')
 OR has_table_privilege('authenticated','public.player_cards','INSERT')
 OR has_table_privilege('authenticated','public.player_cards','DELETE')
 OR has_table_privilege('authenticated','public.game_transactions','INSERT') THEN
  RAISE EXCEPTION 'Permissions permettant de contourner les RPC sécurisées';
 END IF;
 IF NOT has_table_privilege('authenticated','public.player_cards','SELECT')
 OR NOT has_table_privilege('authenticated','public.player_wallets','SELECT')
 OR NOT has_table_privilege('authenticated','public.player_wishlist','SELECT,INSERT,DELETE') THEN
  RAISE EXCEPTION 'Lecture de collection ou gestion des souhaits cassée';
 END IF;
 IF has_table_privilege('authenticated','public.series','UPDATE')
 OR has_table_privilege('anon','public.series','INSERT')
 OR NOT has_table_privilege('anon','public.series','SELECT')
 OR NOT has_table_privilege('anon','public.playable_fr_series','SELECT') THEN
  RAISE EXCEPTION 'Accès au catalogue public incohérent';
 END IF;
 IF has_table_privilege('anon','public.profiles','UPDATE')
 OR NOT has_table_privilege('authenticated','public.profiles','SELECT,INSERT,UPDATE') THEN
  RAISE EXCEPTION 'Privilèges du profil incohérents';
 END IF;
END $$;

-- Vérification négative avec une session authentifiée SANS JWT utilisateur.
-- Aucune donnée d'autres joueurs ne doit sortir ; aucune écriture directe possible.
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','',true);
DO $$
DECLARE n integer;denied boolean:=false;
BEGIN
 SELECT count(*) INTO n FROM public.player_cards;
 IF n<>0 THEN RAISE EXCEPTION 'Fuite de cartes RLS : %',n;END IF;
 SELECT count(*) INTO n FROM public.player_wallets;
 IF n<>0 THEN RAISE EXCEPTION 'Fuite de portefeuilles RLS : %',n;END IF;
 SELECT count(*) INTO n FROM public.game_transactions;
 IF n<>0 THEN RAISE EXCEPTION 'Fuite d historique de crédits RLS : %',n;END IF;
 BEGIN
  UPDATE public.player_wallets SET credits=900000;
 EXCEPTION WHEN insufficient_privilege THEN denied:=true;END;
 IF NOT denied THEN RAISE EXCEPTION 'Mutation de portefeuille autorisée';END IF;
END $$;
ROLLBACK;
SELECT 'Privilèges V1, RLS et soldes : validation réussie' AS resultat;
