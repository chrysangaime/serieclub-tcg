-- V1.0: performance for trading, collections, wishlists and profile art.
-- Only additive indexes, no modifications to existing records.
CREATE INDEX IF NOT EXISTS sc1_listings_buyer_idx
 ON public.card_listings(buyer_id) WHERE buyer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS sc1_trade_offered_card_idx
 ON public.card_trade_offers(offered_card_id) WHERE offered_card_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS sc1_season_claim_season_idx
 ON public.official_season_claims(season_id);
CREATE INDEX IF NOT EXISTS sc1_cards_series_idx
 ON public.player_cards(series_id);
CREATE INDEX IF NOT EXISTS sc1_wishlist_series_idx
 ON public.player_wishlist(series_id);
CREATE INDEX IF NOT EXISTS sc1_profile_avatar_idx
 ON public.profiles(avatar_series_id) WHERE avatar_series_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS sc1_profile_banner_idx
 ON public.profiles(banner_series_id) WHERE banner_series_id IS NOT NULL;

-- Optimize ownership policy checks without changing access semantics.
DO $$
DECLARE r record;qual_new text;check_new text;statement text;
BEGIN
 FOR r IN
  SELECT schemaname,tablename,policyname,cmd,qual,with_check
  FROM pg_policies WHERE schemaname='public'
    AND (coalesce(qual,'') LIKE '%auth.uid()%' OR coalesce(with_check,'') LIKE '%auth.uid()%')
 LOOP
  qual_new:=replace(coalesce(r.qual,''),'auth.uid()','(select auth.uid())');
  check_new:=replace(coalesce(r.with_check,''),'auth.uid()','(select auth.uid())');
  statement:=format('ALTER POLICY %I ON %I.%I',r.policyname,r.schemaname,r.tablename);
  IF r.qual IS NOT NULL THEN
    statement:=statement||format(' USING (%s)',qual_new);
  END IF;
  IF r.with_check IS NOT NULL THEN
    statement:=statement||format(' WITH CHECK (%s)',check_new);
  END IF;
  EXECUTE statement;
 END LOOP;
END $$;
