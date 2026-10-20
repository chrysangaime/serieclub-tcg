-- Scénarios V5 : un type de rareté par série et aucune carte hors rang.
-- Exécuter APRÈS tests/v4_integration.sql ET supabase/game_v5.sql.
DO $$
DECLARE iconic_count integer; mismatch_count bigint;
BEGIN
 SELECT count(*) INTO iconic_count FROM public.series s
 WHERE lower(s.name) IN ('lost','stranger things','the x-files')
   AND s.rarity='Légendaire';
 IF iconic_count<1 THEN RAISE EXCEPTION 'Lost (2004) doit être légendaire';END IF;
 SELECT count(*) INTO mismatch_count
 FROM public.player_cards c JOIN public.series s ON s.id=c.series_id
 WHERE c.rarity<>s.rarity;
 IF mismatch_count<>0 THEN RAISE EXCEPTION 'Raretés héritées incohérentes';END IF;
END $$;

INSERT INTO public.series(id,name,premiered,genres,image_url,popularity_weight,rating_average)
VALUES
 (201,'Stranger Things','2016-07-15',ARRAY['Horror','Drama'],'https://example.com/stranger.jpg',37,9.0),
 (202,'The X-Files','1993-09-10',ARRAY['Mystery'],'https://example.com/xfiles.jpg',32,8.4),
 (203,'Comédie quotidienne','2024-03-04',ARRAY['Comedy'],'https://example.com/comedy.jpg',20,7.1),
 (204,'Mystères modernes','2023-01-01',ARRAY['Mystery'],'https://example.com/mystery.jpg',50,7.9),
 (205,'Enquêtes populaires','2023-01-01',ARRAY['Drama'],'https://example.com/drama.jpg',68,8.2),
 (206,'Épopées télévisées','2023-01-01',ARRAY['Drama'],'https://example.com/epic.jpg',80,8.1),
 (207,'Audience majeure','2023-01-01',ARRAY['Action'],'https://example.com/legend.jpg',90,8.0),
 (208,'Série phénomène','2023-01-01',ARRAY['Drama'],'https://example.com/mythic.jpg',96,7.9),
 (209,'Édition immense','2023-01-01',ARRAY['Sci-Fi'],'https://example.com/unique.jpg',99,9.1);

DO $$
DECLARE mismatches integer;
BEGIN
 SELECT count(*) INTO mismatches FROM (VALUES
  (201,'Légendaire'),(202,'Légendaire'),(203,'Commune'),(204,'Peu commune'),
  (205,'Rare'),(206,'Épique'),(207,'Légendaire'),(208,'Mythique'),(209,'Unique')
 ) expected(id,rank)
 JOIN public.series s ON s.id=expected.id
 WHERE s.rarity<>expected.rank OR s.rarity_source='pending';
 IF mismatches<>0 THEN RAISE EXCEPTION 'Classement par série incorrect (% écarts)',mismatches;END IF;
 -- L'import hebdomadaire ne doit pas changer une classification figée.
 UPDATE public.series SET popularity_weight=99 WHERE id=204;
 IF (SELECT rarity FROM public.series WHERE id=204)<>'Peu commune' THEN
  RAISE EXCEPTION 'Une mise à jour de popularité a changé la rareté';
 END IF;
END $$;

-- Une insertion de carte avec une autre rareté est corrigée côté serveur.
INSERT INTO public.player_cards(
 id,owner_id,series_id,rarity
) VALUES (
 '20000000-0000-4000-8000-000000000001',
 '00000000-0000-4000-8000-000000000001',201,'Commune'
);
DO $$
BEGIN
 IF (SELECT rarity FROM public.player_cards
 WHERE id='20000000-0000-4000-8000-000000000001')<>'Légendaire' THEN
  RAISE EXCEPTION 'Une série possède plusieurs raretés sur différents exemplaires';
 END IF;
END $$;

-- Fusion : dix Communes doivent donner une autre série Peu commune,
-- jamais une "version supérieure" de la série Commune d'origine.
INSERT INTO public.player_cards(owner_id,series_id,rarity)
SELECT '00000000-0000-4000-8000-000000000001'::uuid,203,'Mythique'
FROM generate_series(1,10);

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
DO $$
DECLARE ids uuid[];result_rank text;selected_count integer;wrong_count integer;
BEGIN
 SELECT array_agg(x.id) INTO ids FROM
  (SELECT c.id FROM public.player_cards c
   WHERE c.owner_id=auth.uid() AND c.series_id=203
   ORDER BY c.id LIMIT 10) x;
 SELECT f.rarity INTO result_rank FROM public.fuse_cards(ids) f;
 IF result_rank<>'Peu commune' THEN
  RAISE EXCEPTION 'La fusion ne respecte pas la rareté officielle (% au lieu de Peu commune)',result_rank;
 END IF;
 SELECT count(*) INTO wrong_count FROM public.player_cards c
 JOIN public.series s ON s.id=c.series_id WHERE c.rarity<>s.rarity;
 IF wrong_count<>0 THEN RAISE EXCEPTION 'Raretés incohérentes après fusion';END IF;
 SELECT count(*) INTO selected_count FROM public.open_starter_booster();
 IF selected_count<>5 THEN RAISE EXCEPTION 'Booster incorrect : % cartes',selected_count;END IF;
 SELECT count(*) INTO wrong_count FROM public.player_cards c
 JOIN public.series s ON s.id=c.series_id WHERE c.rarity<>s.rarity;
 IF wrong_count<>0 THEN RAISE EXCEPTION 'Booster avec rareté différente du catalogue';END IF;
END $$;
RESET ROLE;
SELECT 'V5 validée : titres fixes, unicité, populaire, fusions et boosters cohérents.' AS resultat;
