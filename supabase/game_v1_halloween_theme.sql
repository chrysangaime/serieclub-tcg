-- SériesClubTCG V1.0 — Halloween : corriger la vraie garantie horrifique.
-- Remplace seulement le sélecteur. Ni portefeuille ni inventaire modifié.
-- Octobre : 2 séries au genre 'Horror', une troisième Horr./surnat./thriller/mystère,
-- deux séries libres. Le paquet classique reste strictement inchangé.
-- Les sept poids de rareté historiques restent inchangés et chaque carte
-- conserve le niveau officiel de sa série.
BEGIN;
CREATE OR REPLACE FUNCTION public.pick_official_pack(p_halloween boolean)
RETURNS TABLE(show_id bigint,show_name text,show_image text,show_rarity text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE
 used_ids bigint[]:=ARRAY[]::bigint[];
 rank_names text[]:=ARRAY['Commune','Peu commune','Rare','Épique','Légendaire','Mythique','Unique'];
 rank_weights numeric[]:=ARRAY[55,23,12,6,2.5,1.2,0.3];
 rank_position integer;
 pos integer;
 total numeric;
 running numeric;
 drawn numeric;
 chosen_rank text;
 chosen record;
BEGIN
 FOR pos IN 1..5 LOOP
  total:=0;
  chosen_rank:=NULL;
  -- À Halloween, les deux premières positions exigent strictement 'Horror'.
  -- La troisième doit être dans la thématique, et les deux dernières sont libres.
  -- Les sept poids de rareté sont identiques à ceux du paquet Original.
  FOR rank_position IN 1..7 LOOP
   IF EXISTS(
    SELECT 1 FROM public.series s
    WHERE s.fr_verified IS TRUE
      AND s.rarity=rank_names[rank_position]
      AND s.rarity_source<>'pending'
      AND s.image_url LIKE 'https://%'
      AND NOT(s.id=ANY(used_ids))
      AND (
       NOT p_halloween OR pos>3
       OR (pos<=2 AND 'Horror'=ANY(s.genres))
       OR (pos=3 AND s.genres && ARRAY['Horror','Supernatural','Thriller','Mystery']::text[])
      )
   ) THEN
    total:=total+rank_weights[rank_position];
   END IF;
  END LOOP;
  -- Ne jamais compléter un paquet Halloween avec des cartes hors thème
  -- si le catalogue certifié France ne contient pas assez de séries.
  IF total<=0 THEN
   RAISE EXCEPTION 'Catalogue Halloween insuffisant';
  END IF;
  drawn:=random()*total;
  running:=0;
  FOR rank_position IN 1..7 LOOP
   IF EXISTS(
    SELECT 1 FROM public.series s
    WHERE s.fr_verified IS TRUE
      AND s.rarity=rank_names[rank_position]
      AND s.rarity_source<>'pending'
      AND s.image_url LIKE 'https://%'
      AND NOT(s.id=ANY(used_ids))
      AND (
       NOT p_halloween OR pos>3
       OR (pos<=2 AND 'Horror'=ANY(s.genres))
       OR (pos=3 AND s.genres && ARRAY['Horror','Supernatural','Thriller','Mystery']::text[])
      )
   ) THEN
    running:=running+rank_weights[rank_position];
    IF drawn<running THEN
     chosen_rank:=rank_names[rank_position];
     EXIT;
    END IF;
   END IF;
  END LOOP;
  IF chosen_rank IS NULL THEN RAISE EXCEPTION 'Tirage impossible';END IF;

  -- Tirage aléatoire pondéré par popularité *dans le rang sélectionné* :
  -- les séries reconnues ont davantage de chances d'apparaître,
  -- mais leur rareté officielle ne change pas.
  SELECT s.id AS sid,s.name AS title,s.image_url AS artwork,s.rarity AS official
   INTO chosen FROM public.series s
   WHERE s.fr_verified IS TRUE
    AND s.rarity=chosen_rank
    AND s.rarity_source<>'pending'
    AND s.image_url LIKE 'https://%'
    AND NOT(s.id=ANY(used_ids))
    AND (
     NOT p_halloween OR pos>3
     OR (pos<=2 AND 'Horror'=ANY(s.genres))
     OR (pos=3 AND s.genres && ARRAY['Horror','Supernatural','Thriller','Mystery']::text[])
    )
   ORDER BY
    CASE WHEN p_halloween
     THEN -ln(greatest(random(),0.000000000001::double precision))
          / greatest(coalesce(s.popularity_weight,1),1)
     ELSE random()
    END
   LIMIT 1;
  IF chosen.sid IS NULL THEN RAISE EXCEPTION 'Série éligible introuvable';END IF;
  used_ids:=array_append(used_ids,chosen.sid);
  show_id:=chosen.sid;
  show_name:=chosen.title;
  show_image:=chosen.artwork;
  show_rarity:=chosen.official;
  RETURN NEXT;
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.pick_official_pack(boolean) FROM PUBLIC,anon,authenticated;
COMMIT;
