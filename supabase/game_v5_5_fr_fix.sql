-- SérieClub TCG V5.5 — Relevés français, X-Files et exclusion logique.
-- PRÉREQUIS : migration V5.4 (le fichier install_v5_4_v5_5.sql
-- installe les deux ensemble). Ne supprime aucune carte historique.
BEGIN;
DO $$
BEGIN
 IF NOT EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema='public' AND table_name='series' AND column_name='fr_verified'
 ) THEN
  RAISE EXCEPTION 'Installer game_v5_4_fr.sql avant game_v5_5_fr_fix.sql';
 END IF;
END $$;

-- Source JustWatch, région France, série 1993 et identifiant TVmaze 430.
-- Dernier relevé public observé : 10/09/2026.
-- Attention au remake : ne JAMAIS valider un titre par son seul nom.
UPDATE public.series s
SET fr_verified=true,
    fr_verification_method='editorial_fr_history',
    fr_evidence_url='https://www.justwatch.com/fr/serie/the-x-files',
    fr_verified_at=now()
WHERE s.id=430
  AND lower(btrim(s.name))='the x-files'
  AND EXTRACT(YEAR FROM s.premiered)=1993;

-- Les classements comptent UNIQUEMENT les séries jouables en France.
-- Les anciennes cartes restent stockées mais ne donnent plus de points
-- au palmarès tant que leur diffusion FR n'est pas documentée.
CREATE OR REPLACE FUNCTION public.get_leaderboard()
RETURNS TABLE(username text,card_count bigint,unique_series bigint)
LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT p.username,
  count(s.id)::bigint,
  count(DISTINCT s.id)::bigint
 FROM public.profiles p
 LEFT JOIN public.player_cards c ON c.owner_id=p.id
 LEFT JOIN public.series s ON s.id=c.series_id
  AND s.fr_verified IS TRUE AND s.rarity_source<>'pending'
 GROUP BY p.id,p.username
 ORDER BY count(s.id) DESC,p.username LIMIT 30;
$$;
REVOKE ALL ON FUNCTION public.get_leaderboard() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_leaderboard() TO anon,authenticated;

CREATE OR REPLACE FUNCTION public.player_directory()
RETURNS TABLE(player_id uuid,username text,bio text,favorite_genre text,
 cards_count bigint,followers_count bigint,is_following boolean)
LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT p.id,p.username,p.bio,p.favorite_genre,
  (SELECT count(*) FROM public.player_cards c
   JOIN public.series s ON s.id=c.series_id
   WHERE c.owner_id=p.id AND s.fr_verified IS TRUE
     AND s.rarity_source<>'pending')::bigint,
  (SELECT count(*) FROM public.player_follows f WHERE f.followed_id=p.id)::bigint,
  EXISTS(SELECT 1 FROM public.player_follows f
    WHERE f.follower_id=auth.uid() AND f.followed_id=p.id)
 FROM public.profiles p
 ORDER BY (SELECT count(*) FROM public.player_cards c
   JOIN public.series s ON s.id=c.series_id
   WHERE c.owner_id=p.id AND s.fr_verified IS TRUE
     AND s.rarity_source<>'pending') DESC,
   p.created_at DESC
 LIMIT 40;
$$;
REVOKE ALL ON FUNCTION public.player_directory() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.player_directory() TO authenticated;

-- Nettoyage NON destructeur des offres qui ne devraient plus pouvoir
-- être conclues avec des cartes sans preuve de diffusion France.
-- Les cartes et les comptes restent intacts.
WITH revoked AS (
 UPDATE public.card_trade_offers o
 SET status='declined',closed_at=now()
 WHERE o.status='pending' AND (
  NOT EXISTS (
   SELECT 1 FROM public.player_cards c
   JOIN public.series s ON s.id=c.series_id
   WHERE c.id=o.offered_card_id AND s.fr_verified IS TRUE
  )
  OR NOT EXISTS (
   SELECT 1 FROM public.card_listings l
   JOIN public.player_cards c ON c.id=l.card_id
   JOIN public.series s ON s.id=c.series_id
   WHERE l.id=o.listing_id AND s.fr_verified IS TRUE
  )
 )
 RETURNING o.id
)
UPDATE public.player_cards c
SET reserved_trade_id=NULL
WHERE c.reserved_trade_id IN (SELECT id FROM revoked);

UPDATE public.card_listings l
SET status='cancelled',closed_at=now()
WHERE l.status='active'
 AND NOT EXISTS (
  SELECT 1 FROM public.player_cards c
  JOIN public.series s ON s.id=c.series_id
  WHERE c.id=l.card_id AND s.fr_verified IS TRUE
 );

-- Une ancienne annonce encore visible dans un vieux navigateur ne peut
-- pas aboutir à un changement de propriétaire international.
CREATE OR REPLACE FUNCTION public.enforce_fr_card_transfer()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path=public,pg_temp AS $$
BEGIN
 IF OLD.owner_id IS DISTINCT FROM NEW.owner_id
  AND NOT EXISTS(
   SELECT 1 FROM public.series s
   WHERE s.id=NEW.series_id AND s.fr_verified IS TRUE
  ) THEN
  RAISE EXCEPTION 'Transfert impossible : série non vérifiée en France';
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS sc_enforce_fr_card_transfer ON public.player_cards;
CREATE TRIGGER sc_enforce_fr_card_transfer
 BEFORE UPDATE OF owner_id ON public.player_cards
 FOR EACH ROW
 WHEN (OLD.owner_id IS DISTINCT FROM NEW.owner_id)
 EXECUTE FUNCTION public.enforce_fr_card_transfer();

-- Le Comptoir public ne publie plus d'annonces pour des séries
-- non certifiées françaises. Les historiques privés restent consultables.
CREATE OR REPLACE FUNCTION public.marketplace_feed()
RETURNS TABLE(
 listing_id uuid,seller_id uuid,seller_username text,card_id uuid,
 series_id bigint,series_name text,image_url text,rarity text,
 price integer,created_at timestamptz
) LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT l.id,l.seller_id,p.username,l.card_id,c.series_id,s.name,s.image_url,s.rarity,
  l.price,l.created_at
 FROM public.card_listings l
 JOIN public.player_cards c ON c.id=l.card_id AND c.owner_id=l.seller_id
 JOIN public.series s ON s.id=c.series_id
 JOIN public.profiles p ON p.id=l.seller_id
 WHERE l.status='active' AND s.fr_verified IS TRUE AND s.rarity_source<>'pending'
 ORDER BY l.created_at DESC LIMIT 80;
$$;
REVOKE ALL ON FUNCTION public.marketplace_feed() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.marketplace_feed() TO authenticated;

COMMIT;
