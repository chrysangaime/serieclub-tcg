-- V19 : vérifier 120 membres figés, récompense unique et 20 titres exacts.
DO $$
DECLARE n integer;
BEGIN
 IF (SELECT count(*) FROM public.official_seasons)<>12 THEN
  RAISE EXCEPTION 'Il faut conserver 6 classiques et 6 Top20'; END IF;
 FOR n IN SELECT count(*)::integer FROM public.official_season_titles GROUP BY season_id LOOP
  IF n<>20 THEN RAISE EXCEPTION 'Une saison a % titres, attendu 20',n; END IF;
 END LOOP;
 IF (SELECT count(*) FROM public.official_season_titles)<>120 THEN
  RAISE EXCEPTION 'Les 6 Top20 ne contiennent pas exactement 120 entrées'; END IF;
 IF (SELECT count(*) FROM public.get_official_season_titles('top20_netflix_2026'))<>20 THEN
  RAISE EXCEPTION 'La fiche Top20 Netflix doit retourner 20 titres'; END IF;
END $$;

-- Dix-neuf titres de la liste Netflix possédés : la saison est incomplète.
INSERT INTO public.player_cards(owner_id,series_id,rarity)
SELECT '00000000-0000-4000-8000-000000000001',t.series_id,s.rarity
FROM public.official_season_titles t JOIN public.series s ON s.id=t.series_id
WHERE t.season_id='top20_netflix_2026' AND t.position<=19;

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
DO $$
DECLARE got integer;rejected boolean:=false;
BEGIN
 SELECT owned INTO got FROM public.my_official_seasons() WHERE id='top20_netflix_2026';
 IF got<>19 THEN RAISE EXCEPTION '19 titres de la liste doivent donner 19/20, obtenu %',got; END IF;
 BEGIN
  PERFORM public.claim_official_season('top20_netflix_2026');
 EXCEPTION WHEN OTHERS THEN rejected:=true;
 END;
 IF NOT rejected THEN RAISE EXCEPTION 'Badge accordé à 19/20'; END IF;
 IF (SELECT claimed FROM public.my_official_seasons() WHERE id='top20_netflix_2026') THEN
  RAISE EXCEPTION 'Badge marqué acquis sans 20 titres'; END IF;
END $$;
RESET ROLE;

-- Dernière série, avec un tirage supplémentaire d'une autre saison sans effet.
INSERT INTO public.player_cards(owner_id,series_id,rarity)
SELECT '00000000-0000-4000-8000-000000000001',t.series_id,s.rarity
FROM public.official_season_titles t JOIN public.series s ON s.id=t.series_id
WHERE t.season_id='top20_netflix_2026' AND t.position=20;
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
DO $$
DECLARE awarded integer;wallet_before bigint; wallet_after bigint;denied boolean:=false;
BEGIN
 SELECT credits INTO wallet_before FROM public.player_wallets WHERE player_id=auth.uid();
 awarded:=public.claim_official_season('top20_netflix_2026');
 IF awarded<>300 THEN RAISE EXCEPTION 'Récompense attendue +300, reçu %',awarded; END IF;
 SELECT credits INTO wallet_after FROM public.player_wallets WHERE player_id=auth.uid();
 IF wallet_after-wallet_before<>300 THEN RAISE EXCEPTION 'Récompense portefeuille incohérente';END IF;
 BEGIN
  PERFORM public.claim_official_season('top20_netflix_2026');
 EXCEPTION WHEN OTHERS THEN denied:=true;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'Double versement Top20 accepté';END IF;
 IF (SELECT credits FROM public.player_wallets WHERE player_id=auth.uid())<>wallet_after THEN
   RAISE EXCEPTION 'Les crédits ont été crédités deux fois';END IF;
 IF NOT (SELECT claimed FROM public.my_official_seasons() WHERE id='top20_netflix_2026') THEN
   RAISE EXCEPTION 'Badge non affiché après validation';END IF;
END $$;
RESET ROLE;
SELECT 'V19 Top20: six saisons 20/20, contrôle strict et badge unique OK' AS resultat;
