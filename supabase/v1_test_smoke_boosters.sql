-- V1 TEST : aucun INSERT/UPDATE/DELETE. Teste les deux boosters gratuits
-- sans créer de carte, consommer de crédits ou toucher aux joueurs.
DO $$
DECLARE i int; n int; eligible int; horror int; thematic int;
BEGIN
 FOR i IN 1..25 LOOP
  -- Les cinq tirages doivent rester distincts et de provenance indépendante.
  SELECT count(*),count(DISTINCT p.show_id),
    count(*) FILTER(WHERE s.fr_verified IS TRUE
      AND s.fr_verification_method='tvmaze_fr_origin')
  INTO n,eligible,thematic
  FROM public.pick_official_pack(false) p JOIN public.series s ON s.id=p.show_id;
  IF n<>5 OR eligible<>5 OR thematic<>5 THEN
   RAISE EXCEPTION 'Booster Original non conforme (cycle %)',i;
  END IF;
  -- Halloween : deux cartes horreur et une troisième carte thématique.
  WITH picked AS (
   SELECT row_number() OVER () position,p.show_id,s.genres,s.fr_verification_method
   FROM public.pick_official_pack(true) p JOIN public.series s ON s.id=p.show_id
  )
  SELECT count(*),count(DISTINCT show_id),
   count(*) FILTER(WHERE position<=2 AND 'Horror'=ANY(genres)),
   count(*) FILTER(WHERE position=3 AND genres && ARRAY['Horror','Supernatural','Thriller','Mystery']::text[])
  INTO n,eligible,horror,thematic FROM picked;
  IF n<>5 OR eligible<>5 OR horror<>2 OR thematic<>1 THEN
   RAISE EXCEPTION 'Booster Halloween non conforme (cycle %)',i;
  END IF;
 END LOOP;
 IF EXISTS (SELECT 1 FROM public.credit_booster_types WHERE enabled=true)
 THEN RAISE EXCEPTION 'Pack à crédits non autorisé en préproduction'; END IF;
END $$;
