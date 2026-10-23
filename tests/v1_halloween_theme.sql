-- CI éphémère uniquement. Aucun booster réel n'est consommé :
-- pick_official_pack() sélectionne des titres sans aucune écriture.
-- Le test garantit plusieurs séries d'horreur certifiées FR, même si
-- les premiers jeux de données n'en contiennent qu'une.
INSERT INTO public.series(
 id,name,premiered,genres,image_url,fr_verified,
 fr_verification_method,fr_evidence_url,fr_verified_at,
 popularity_weight,rating_average
)
SELECT 980000+g, 'Horreur du Club '+g,
 DATE '2020-10-01',
 CASE WHEN g<=8 THEN ARRAY['Horror','Mystery']::text[]
      ELSE ARRAY['Supernatural','Thriller']::text[] END,
 'https://example.org/serieclub-halloween-ci-'||g||'.jpg',
 true,'editorial_fr_history','https://example.org/halloween-test',now(),
 (35+g*4)::numeric,8.0
FROM generate_series(1,12) AS g
ON CONFLICT(id) DO NOTHING;

DO $$
DECLARE n integer;horror integer;theme integer;invalid integer;dupes integer;
 i integer;rank_mismatch integer;normal_five integer;
BEGIN
 FOR i IN 1..80 LOOP
  WITH chosen AS MATERIALIZED (
   SELECT * FROM public.pick_official_pack(true)
  ), stats AS (
   SELECT count(*) AS total,
    count(*) FILTER(WHERE 'Horror'=ANY(s.genres)) AS horror,
    count(*) FILTER(WHERE s.genres &&
     ARRAY['Horror','Supernatural','Thriller','Mystery']::text[]) AS themed,
    count(*) FILTER(WHERE s.fr_verified IS DISTINCT FROM TRUE
     OR s.rarity_source='pending' OR s.image_url NOT LIKE 'https://%') AS invalid,
    count(*) - count(DISTINCT p.show_id) AS dupes,
    count(*) FILTER(WHERE p.show_rarity IS DISTINCT FROM s.rarity) AS mismatched
   FROM chosen p JOIN public.series s ON s.id=p.show_id
  )
  SELECT total,stats.horror,themed,invalid,dupes,mismatched
  INTO n,horror,theme,invalid,dupes,rank_mismatch FROM stats;
  IF n<>5 OR horror<2 OR theme<3 OR invalid<>0 OR dupes<>0 OR rank_mismatch<>0 THEN
   RAISE EXCEPTION 'Halloween défectueux : cartes %, horreur %, thème %, hors France %, doublons %, raretés %',
    n,horror,theme,invalid,dupes,rank_mismatch;
  END IF;
 END LOOP;

 -- Le paquet Original reste distinct : cinq cartes classées et certifiées.
 SELECT count(*) INTO normal_five FROM public.pick_official_pack(false);
 IF normal_five<>5 THEN
  RAISE EXCEPTION 'Le paquet Original a été perturbé';
 END IF;
END $$;
SELECT 'Halloween V1 : 80 paquets, deux Horror et trois thématiques garantis, raretés intactes' AS resultat;
