-- Validation en base : disponibilité, coût réel, 5 cartes, aucune dépense double.
DO $$
DECLARE qty integer;missing integer;
BEGIN
 SELECT count(*) INTO qty FROM public.list_credit_boosters() WHERE available;
 IF qty<>4 THEN RAISE EXCEPTION 'Quatre packs actifs attendus, obtenu %',qty;END IF;
 SELECT count(*) INTO missing FROM public.list_credit_boosters()
 WHERE eligible_series<5 OR price_credits NOT IN (200,250,300);
 IF missing>0 THEN RAISE EXCEPTION 'Tarifs ou catalogue incorrect';END IF;
END $$;
UPDATE public.player_wallets SET credits=1500
WHERE player_id='00000000-0000-4000-8000-000000000002';

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
DO $$
DECLARE before_stock integer;after_stock integer;before_balance bigint;
 after_balance bigint;cards_before integer;cards_after integer;
 result_count integer;unique_count integer;wrong integer;cost integer;
BEGIN
 SELECT booster_stock,credits INTO before_stock,before_balance FROM public.player_wallets WHERE player_id=auth.uid();
 SELECT count(*) INTO cards_before FROM public.player_cards WHERE owner_id=auth.uid();
 SELECT price_credits INTO cost FROM public.list_credit_boosters() WHERE pack_key='netflix';
 SELECT count(*),count(DISTINCT s.series_id) INTO result_count,unique_count
 FROM public.buy_credit_booster('netflix') s;
 IF result_count<>5 OR unique_count<>5 THEN RAISE EXCEPTION 'Cinq séries distinctes attendues';END IF;
 SELECT booster_stock,credits INTO after_stock,after_balance FROM public.player_wallets WHERE player_id=auth.uid();
 IF before_stock<>after_stock THEN RAISE EXCEPTION 'La réserve gratuite a été réduite';END IF;
 IF after_balance<>before_balance-cost THEN RAISE EXCEPTION 'Débit unique attendu de %, obtenu %',cost,before_balance-after_balance;END IF;
 SELECT count(*) INTO cards_after FROM public.player_cards WHERE owner_id=auth.uid();
 IF cards_after-cards_before<>5 THEN RAISE EXCEPTION 'Cinq cartes nouvelles manquantes';END IF;
 SELECT count(*) INTO wrong FROM public.player_cards c JOIN public.series s ON s.id=c.series_id
 WHERE c.owner_id=auth.uid() AND (c.rarity<>s.rarity OR s.fr_verified IS NOT TRUE);
 IF wrong>0 THEN RAISE EXCEPTION 'Rareté incohérente ou série non France';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.game_transactions
  WHERE player_id=auth.uid() AND kind='credit_pack_netflix' AND amount=-cost)
 THEN RAISE EXCEPTION 'Écriture comptable absente';END IF;
END $$;
RESET ROLE;

-- Le solde nul ne doit ni créer de cartes ni de transaction.
UPDATE public.player_wallets SET credits=0 WHERE player_id='00000000-0000-4000-8000-000000000002';
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
DO $$
DECLARE before_count integer;after_count integer;denied boolean:=false;
BEGIN
 SELECT count(*) INTO before_count FROM public.player_cards WHERE owner_id=auth.uid();
 BEGIN PERFORM * FROM public.buy_credit_booster('disney');
 EXCEPTION WHEN OTHERS THEN denied:=true;END;
 SELECT count(*) INTO after_count FROM public.player_cards WHERE owner_id=auth.uid();
 IF NOT denied OR after_count<>before_count THEN
  RAISE EXCEPTION 'Un paquet a été accordé sans crédit';END IF;
END $$;
RESET ROLE;
SELECT 'V21 validée : 4 bouquets FR, paiement atomique, raretés inchangées' AS resultat;
