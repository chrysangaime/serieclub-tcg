-- SÉRIECLUB V5.3 — Réparer les rangs historiques des exemplaires.
-- À exécuter UNE FOIS après la V5 et la synchronisation TVmaze.
-- Source de vérité : public.series.rarity, jamais player_cards.rarity.
-- Ne détruit ni cartes ni crédits. Ne clôture que les annonces/offres
-- utilisant un exemplaire dont le rang est réellement modifié.
BEGIN;
DO $$
BEGIN
 IF to_regclass('public.card_trade_offers') IS NULL OR
    to_regclass('public.card_listings') IS NULL THEN
  RAISE EXCEPTION 'Installer la V4 et V5 avant la réparation des raretés';
 END IF;
END $$;
LOCK TABLE public.player_cards,public.card_listings,public.card_trade_offers
 IN SHARE ROW EXCLUSIVE MODE;
CREATE TEMP TABLE sc53_changed_cards ON COMMIT DROP AS
 SELECT c.id,s.rarity AS fixed_rarity
 FROM public.player_cards c
 JOIN public.series s ON s.id=c.series_id
 WHERE c.rarity IS DISTINCT FROM s.rarity;
SELECT count(*) AS anciennes_cartes_a_corriger FROM sc53_changed_cards;
-- Propositions liées à une carte concernée par la réparation.
WITH revoked AS (
 UPDATE public.card_trade_offers o
 SET status='declined',closed_at=now()
 WHERE o.status='pending' AND (
  o.offered_card_id IN (SELECT id FROM sc53_changed_cards)
  OR EXISTS (
   SELECT 1 FROM public.card_listings l
   JOIN sc53_changed_cards c ON c.id=l.card_id
   WHERE l.id=o.listing_id
  )
 ) RETURNING o.id
)
UPDATE public.player_cards c SET reserved_trade_id=NULL
WHERE c.reserved_trade_id IN (SELECT id FROM revoked);
-- Annuler uniquement les annonces des exemplaires dont la valeur change.
UPDATE public.card_listings l SET status='cancelled',closed_at=now()
WHERE l.status='active' AND l.card_id IN (SELECT id FROM sc53_changed_cards);
-- Aucun exemplaire ne doit garder un ancien rang.
UPDATE public.player_cards c
SET rarity=src.fixed_rarity
FROM sc53_changed_cards src
WHERE c.id=src.id;
-- La même série doit avoir une seule rareté, identique sur chaque copie.
SELECT count(*) AS ecarts_apres_reparation
FROM public.player_cards c JOIN public.series s ON s.id=c.series_id
WHERE c.rarity IS DISTINCT FROM s.rarity;
COMMIT;
