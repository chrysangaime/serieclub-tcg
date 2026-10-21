-- Tests V5.4 à exécuter UNIQUEMENT sur la base CI éphémère.
-- Ordre : v4_integration -> game_v5 -> v5_rarity -> game_v5_4_fr.
DO $$
DECLARE chosen integer;
BEGIN
 IF (SELECT fr_verified FROM public.series WHERE id=201) IS DISTINCT FROM true
 THEN RAISE EXCEPTION 'Stranger Things (2016) devrait être vérifié par sa source Netflix France';END IF;
 IF (SELECT fr_verified FROM public.series WHERE id=202) IS DISTINCT FROM true
 THEN RAISE EXCEPTION 'The X-Files (1993) devrait être vérifié par Disney+ France';END IF;
 IF (SELECT fr_verified FROM public.series WHERE id=203) IS DISTINCT FROM false
 THEN RAISE EXCEPTION 'Une série fictive ne doit pas être validée arbitrairement';END IF;
 IF (SELECT fr_verified FROM public.series WHERE id=209) IS DISTINCT FROM false
 THEN RAISE EXCEPTION 'Un titre populaire non vérifié ne doit pas être jouable';END IF;
 IF (SELECT count(*) FROM public.series WHERE fr_verified AND fr_evidence_url IS NULL)>0
 THEN RAISE EXCEPTION 'Certaines certifications France sont sans preuve';END IF;
 IF (SELECT count(*) FROM public.player_cards)<1
 THEN RAISE EXCEPTION 'Les anciennes cartes ont été effacées';END IF;
 SELECT count(*) INTO chosen FROM public.playable_fr_series;
 IF chosen<2 THEN RAISE EXCEPTION 'Le catalogue certifié FR a perdu les deux séries prouvées';END IF;
END $$;

-- Construire un catalogue de test certifié avec de fausses références de
-- test : pas d'impact production. Cinq séries supplémentaires, diverses raretés.
UPDATE public.series
SET fr_verified=true,
    fr_verification_method='editorial_fr_history',
    fr_evidence_url='https://example.org/fr-test-ci',
    fr_verified_at=now()
WHERE id BETWEEN 203 AND 207;

DO $$
DECLARE cards integer; horror_count integer; non_fr integer;
BEGIN
 SELECT count(*) INTO cards FROM public.pick_official_pack(false);
 IF cards<>5 THEN RAISE EXCEPTION 'Le booster France devrait proposer cinq séries distinctes';END IF;
 SELECT count(*) INTO non_fr FROM public.pick_official_pack(false) p
 JOIN public.series s ON s.id=p.show_id WHERE NOT s.fr_verified;
 IF non_fr<>0 THEN RAISE EXCEPTION 'Une série non diffusée en France sort des boosters';END IF;
 SELECT count(*) INTO horror_count
 FROM public.pick_official_pack(true) p
 JOIN public.series s ON s.id=p.show_id
 WHERE s.genres&&ARRAY['Horror','Thriller','Supernatural']::text[];
 IF horror_count<1 THEN RAISE EXCEPTION 'Le booster Halloween a perdu sa garantie horrifique';END IF;
 IF EXISTS (SELECT 1 FROM public.playable_fr_series WHERE id=209)
 THEN RAISE EXCEPTION 'Un titre non vérifié est présent au catalogue jouable';END IF;
END $$;

-- Le trigger refuse les nouvelles cartes et les nouveaux souhaits hors France.
DO $$
DECLARE rejected boolean:=false; rejected_wish boolean:=false;
BEGIN
 BEGIN
  INSERT INTO public.player_cards(owner_id,series_id,rarity)
  VALUES('00000000-0000-4000-8000-000000000001'::uuid,209,'Unique');
 EXCEPTION WHEN check_violation THEN rejected:=true;
 END;
 IF NOT rejected THEN RAISE EXCEPTION 'Insertion d’une carte FR non vérifiée acceptée';END IF;
 BEGIN
  INSERT INTO public.player_wishlist(owner_id,series_id)
  VALUES('00000000-0000-4000-8000-000000000001'::uuid,209);
 EXCEPTION WHEN raise_exception THEN rejected_wish:=true;
 END;
 IF NOT rejected_wish THEN RAISE EXCEPTION 'Souhait non vérifié accepté';END IF;
END $$;

-- Les fusions et boosters fonctionnent après certification.
INSERT INTO public.player_cards(owner_id,series_id,rarity)
SELECT '00000000-0000-4000-8000-000000000001'::uuid,203,'Commune'
FROM generate_series(1,10);

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
DO $$
DECLARE selected uuid[];rank text;target_id bigint;n integer;
BEGIN
 SELECT array_agg(c.id) INTO selected FROM (
  SELECT id FROM public.player_cards
  WHERE owner_id=auth.uid() AND series_id=203 AND NOT locked
  ORDER BY id LIMIT 10
 ) c;
 SELECT f.rarity,f.series_id INTO rank,target_id FROM public.fuse_cards(selected) f;
 IF rank<>'Peu commune' OR NOT (SELECT s.fr_verified FROM public.series s WHERE id=target_id)
 THEN RAISE EXCEPTION 'Fusion vers une série non éligible France';END IF;
 SELECT count(*) INTO n FROM public.open_starter_booster();
 IF n<>5 THEN RAISE EXCEPTION 'Booster France incomplet';END IF;
END $$;
RESET ROLE;

DO $$
BEGIN
 IF EXISTS(SELECT 1 FROM public.player_cards c JOIN public.series s ON s.id=c.series_id
  WHERE c.rarity<>s.rarity) THEN RAISE EXCEPTION 'Raretés divergentes après V5.4';END IF;
END $$;

SELECT 'V5.4 réussie : séries françaises prouvées, anciens exemplaires, boosters, Halloween, fusions et souhaits' AS resultat;
