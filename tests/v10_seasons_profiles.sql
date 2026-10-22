-- Intégration SQL V10 : saison officielle, badges uniques, contrôle d'avatar.
-- IDs synthétiques réservés à la base temporaire de test CI.
INSERT INTO public.series(id,name,premiered,genres,image_url,fr_verified,fr_verification_method,fr_evidence_url,fr_verified_at,popularity_weight)
SELECT 991000+i,'Comédie française de test '||i,'1995-06-12',
 ARRAY['Comedy'],'https://example.org/serie-'||i||'.jpg',
 true,'editorial_fr_history','https://example.org/ci-fr-proof',now(),45
FROM generate_series(1,9) g(i) ON CONFLICT(id) DO NOTHING;
INSERT INTO public.player_cards(owner_id,series_id,rarity)
SELECT '00000000-0000-4000-8000-000000000001',991000+i,
 (SELECT rarity FROM public.series WHERE id=991000+i)
FROM generate_series(1,8) g(i);
INSERT INTO public.player_cards(owner_id,series_id,rarity)
VALUES('00000000-0000-4000-8000-000000000001',991001,
 (SELECT rarity FROM public.series WHERE id=991001));
DO $$
BEGIN
 IF (SELECT count(*) FROM public.official_seasons)<>6 THEN RAISE EXCEPTION 'Saisons de démarrage manquantes';END IF;
 IF (SELECT count(DISTINCT series_id) FROM public.player_cards
     WHERE owner_id='00000000-0000-4000-8000-000000000001'
     AND series_id BETWEEN 991001 AND 991008)<>8
 THEN RAISE EXCEPTION 'Échantillon de 8 séries distinctes non créé';END IF;
END $$;
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
DO $$
DECLARE awarded integer;before_credits bigint;after_credits bigint;
 did_reject boolean:=false;
BEGIN
 IF (SELECT owned FROM public.my_official_seasons() WHERE id='comedies')<8 THEN
  RAISE EXCEPTION 'Les 8 comédies collectionnées ne sont pas comptabilisées';
 END IF;
 IF (SELECT claimed FROM public.my_official_seasons() WHERE id='comedies') THEN
  RAISE EXCEPTION 'Badge obtenu avant la demande';
 END IF;
 SELECT credits INTO before_credits FROM public.player_wallets WHERE player_id=auth.uid();
 awarded:=public.claim_official_season('comedies');
 IF awarded<>100 THEN RAISE EXCEPTION 'Récompense de comédie incorrecte : %',awarded;END IF;
 SELECT credits INTO after_credits FROM public.player_wallets WHERE player_id=auth.uid();
 IF after_credits-before_credits<>100 THEN RAISE EXCEPTION 'Le crédit doit être ajouté une seule fois';END IF;
 IF NOT (SELECT claimed FROM public.my_official_seasons() WHERE id='comedies') THEN
  RAISE EXCEPTION 'Badge non débloqué';END IF;
 BEGIN
  PERFORM public.claim_official_season('comedies');
 EXCEPTION WHEN OTHERS THEN did_reject:=true;
 END;
 IF NOT did_reject THEN RAISE EXCEPTION 'Double récompense acceptée';END IF;
 IF (SELECT credits FROM public.player_wallets WHERE player_id=auth.uid())<>after_credits THEN
  RAISE EXCEPTION 'Double crédit attribué';
 END IF;
END $$;
-- Les profils peuvent choisir des affiches possédées, jamais un titre étranger.
DO $$
DECLARE rejected boolean:=false;
BEGIN
 UPDATE public.profiles SET avatar_series_id=991001,banner_series_id=991002 WHERE id=auth.uid();
 IF NOT EXISTS(SELECT 1 FROM public.profiles
    WHERE id=auth.uid() AND avatar_series_id=991001 AND banner_series_id=991002) THEN
   RAISE EXCEPTION 'Habillage de profil non enregistré';
 END IF;
 BEGIN
  UPDATE public.profiles SET avatar_series_id=991009 WHERE id=auth.uid();
 EXCEPTION WHEN OTHERS THEN rejected:=true;
 END;
 IF NOT rejected THEN RAISE EXCEPTION 'Avatar d’une carte non possédée accepté';END IF;
END $$;
RESET ROLE;
SELECT 'V10 OK : six saisons officielles, badge unique, +100 crédits une seule fois et images de profil contrôlées' AS resultat;
