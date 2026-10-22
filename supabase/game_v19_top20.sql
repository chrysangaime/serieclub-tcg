-- SériesClubTCG V19 : six Top 20 du Club, édition France 2026.
-- Prérequis : supabase/game_v10_seasons_profiles.sql déjà appliqué.
-- Une saison publiée est une sélection FIXE de 20 séries, pas un Top 20 officiel
-- d'audience. Les plateformes proviennent du cache français watch-fr.json
-- arrêté au 22 octobre 2026 (offre flatrate/ads, aucun achat/location).
-- La sélection est classée par score du catalogue puis figée en base.
-- Ne jamais réinitialiser des listes après attribution des badges.
BEGIN;

CREATE TABLE IF NOT EXISTS public.official_season_titles(
 season_id text NOT NULL REFERENCES public.official_seasons(id) ON DELETE CASCADE,
 series_id bigint NOT NULL REFERENCES public.series(id) ON DELETE RESTRICT,
 position integer NOT NULL CHECK (position BETWEEN 1 AND 20),
 PRIMARY KEY(season_id,series_id),
 UNIQUE(season_id,position)
);
ALTER TABLE public.official_season_titles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.official_season_titles FROM PUBLIC,anon,authenticated;
CREATE INDEX IF NOT EXISTS sc19_season_title_series ON public.official_season_titles(series_id);

-- Le titre indique une sélection éditoriale du Club, non un palmarès officiel.
INSERT INTO public.official_seasons(id,title,description,badge,target_count,reward_credits,genre_filter,start_year,end_year,position)
VALUES
 ('top20_netflix_2026','Top 20 Netflix France','20 séries incontournables disponibles sur Netflix en France dans la sélection 2026 du Club.','🎬 Binge Master',20,300,'{}'::text[],NULL,NULL,7),
 ('top20_prime_2026','Top 20 Prime Video France','20 séries de la sélection Prime Video France 2026 du Club.','🎞️ Prime Explorer',20,300,'{}'::text[],NULL,NULL,8),
 ('top20_disney_2026','Top 20 Disney+ France','20 séries de la sélection Disney+ France 2026 du Club.','✨ Disney Collector',20,300,'{}'::text[],NULL,NULL,9),
 ('top20_cultes_2026','Top 20 séries cultes','20 séries marquantes débutées avant 2000 et diffusées en France.','🏆 Légende TV',20,350,'{}'::text[],NULL,NULL,10),
 ('top20_scifi_2026','Top 20 SF & Fantasy','20 séries cultes de science-fiction et de fantasy diffusées en France.','🚀 Multivers',20,350,'{}'::text[],NULL,NULL,11),
 ('top20_thriller_2026','Top 20 thrillers & enquêtes','20 séries policières, mystérieuses et thrillers diffusés en France.','🔍 Maître enquêteur',20,350,'{}'::text[],NULL,NULL,12)
ON CONFLICT(id) DO NOTHING;

-- Top 20 Netflix France: candidats France, ordonnés et figés. Source: 143 titres du cache fournisseur France.
WITH selected AS(
 SELECT s.id,row_number() OVER (ORDER BY s.popularity_weight DESC NULLS LAST,
      s.rating_average DESC NULLS LAST,s.id ASC) AS ranking
 FROM public.series s
 WHERE s.fr_verified IS TRUE AND s.rarity_source<>'pending'
   AND s.image_url LIKE 'https://%' AND s.id = ANY(ARRAY[2,7,13,27,29,32,43,49,56,63,65,69,73,77,89,103,116,118,124,134,150,160,169,170,172,175,184,204,216,251,269,302,305,315,318,321,431,435,440,488,495,525,526,530,537,547,552,555,560,567,590,618,706,712,794,797,802,803,894,1121,1440,1505,1536,1851,1859,1925,2071,2266,2818,2993,3134,3164,3594,4297,4972,5262,5557,6405,6424,6459,6544,7608,8244,8287,9993,10292,12309,16579,16770,16825,17861,18260,18374,18858,19809,21532,21845,23968,24372,26020,26856,27557,27848,28160,28276,28757,30960,31682,32938,36795,37374,38753,41611,42966,43687,45840,46573,48108,48450,48945,50701,51480,52279,52910,53277,53647,54914,55138,56512,59698,60213,60339,64992,67017,68407,68408,68439,69956,77060,81686,90007,93115,93969]::bigint[])
), first_twenty AS (
 SELECT id,ranking::integer AS position FROM selected WHERE ranking<=20
)
INSERT INTO public.official_season_titles(season_id,series_id,position)
SELECT 'top20_netflix_2026',id,position FROM first_twenty
WHERE NOT EXISTS(
 SELECT 1 FROM public.official_season_titles WHERE season_id='top20_netflix_2026'
)
ON CONFLICT DO NOTHING;

-- Top 20 Prime Video France: candidats France, ordonnés et figés. Source: 134 titres du cache fournisseur France.
WITH selected AS(
 SELECT s.id,row_number() OVER (ORDER BY s.popularity_weight DESC NULLS LAST,
      s.rating_average DESC NULLS LAST,s.id ASC) AS ranking
 FROM public.series s
 WHERE s.fr_verified IS TRUE AND s.rarity_source<>'pending'
   AND s.image_url LIKE 'https://%' AND s.id = ANY(ARRAY[2,4,6,10,19,20,22,24,27,32,56,59,60,62,63,72,73,89,98,100,101,103,106,111,116,118,124,128,130,133,150,158,164,172,177,194,195,196,251,269,315,328,344,430,435,465,488,495,506,522,525,543,560,562,566,567,614,655,657,676,682,712,757,772,773,776,786,823,863,1055,1070,1119,1216,1374,1536,1719,1754,1824,1825,1913,2083,2246,2285,2355,2560,3262,4100,4246,4972,5251,5304,6308,6459,7608,8235,8244,9521,10292,12072,12309,12779,13855,15299,16579,17059,17794,18069,18429,18577,23251,26020,26295,33352,37196,43031,44092,44721,44751,45562,45834,47856,48450,49041,51777,53443,58063,63784,64977,68439,69430,73663,74127,82707,93264]::bigint[])
), first_twenty AS (
 SELECT id,ranking::integer AS position FROM selected WHERE ranking<=20
)
INSERT INTO public.official_season_titles(season_id,series_id,position)
SELECT 'top20_prime_2026',id,position FROM first_twenty
WHERE NOT EXISTS(
 SELECT 1 FROM public.official_season_titles WHERE season_id='top20_prime_2026'
)
ON CONFLICT DO NOTHING;

-- Top 20 Disney+ France: candidats France, ordonnés et figés. Source: 123 titres du cache fournisseur France.
WITH selected AS(
 SELECT s.id,row_number() OVER (ORDER BY s.popularity_weight DESC NULLS LAST,
      s.rating_average DESC NULLS LAST,s.id ASC) AS ranking
 FROM public.series s
 WHERE s.fr_verified IS TRUE AND s.rarity_source<>'pending'
   AND s.image_url LIKE 'https://%' AND s.id = ANY(ARRAY[7,8,20,30,31,41,52,57,58,60,65,67,68,73,76,80,81,83,84,98,103,106,107,111,115,123,157,167,171,180,215,251,321,323,335,336,347,385,396,427,428,430,472,495,525,526,532,538,541,550,563,566,568,570,575,655,667,672,678,683,687,770,839,1408,1414,1505,1529,1775,1864,1898,1905,2557,3916,4099,4240,4241,4244,4972,5309,5557,5935,6308,8370,8520,8605,9803,9804,12958,13988,15836,16544,16794,17128,18458,19809,20263,26020,26701,28152,29180,32938,34577,37336,38963,41007,41748,41821,48108,48450,48830,52336,52343,54198,55350,58948,59698,61740,63192,63234,68752,75030,84527,84836]::bigint[])
), first_twenty AS (
 SELECT id,ranking::integer AS position FROM selected WHERE ranking<=20
)
INSERT INTO public.official_season_titles(season_id,series_id,position)
SELECT 'top20_disney_2026',id,position FROM first_twenty
WHERE NOT EXISTS(
 SELECT 1 FROM public.official_season_titles WHERE season_id='top20_disney_2026'
)
ON CONFLICT DO NOTHING;

-- Top 20 séries cultes: candidats France, ordonnés et figés. Source: catalogue France certifié.
WITH selected AS(
 SELECT s.id,row_number() OVER (ORDER BY s.popularity_weight DESC NULLS LAST,
      s.rating_average DESC NULLS LAST,s.id ASC) AS ranking
 FROM public.series s
 WHERE s.fr_verified IS TRUE AND s.rarity_source<>'pending'
   AND s.image_url LIKE 'https://%' AND s.premiered < DATE '2000-01-01'
), first_twenty AS (
 SELECT id,ranking::integer AS position FROM selected WHERE ranking<=20
)
INSERT INTO public.official_season_titles(season_id,series_id,position)
SELECT 'top20_cultes_2026',id,position FROM first_twenty
WHERE NOT EXISTS(
 SELECT 1 FROM public.official_season_titles WHERE season_id='top20_cultes_2026'
)
ON CONFLICT DO NOTHING;

-- Top 20 SF & Fantasy: candidats France, ordonnés et figés. Source: catalogue France certifié.
WITH selected AS(
 SELECT s.id,row_number() OVER (ORDER BY s.popularity_weight DESC NULLS LAST,
      s.rating_average DESC NULLS LAST,s.id ASC) AS ranking
 FROM public.series s
 WHERE s.fr_verified IS TRUE AND s.rarity_source<>'pending'
   AND s.image_url LIKE 'https://%' AND s.genres && ARRAY['Science-Fiction','Fantasy']::text[]
), first_twenty AS (
 SELECT id,ranking::integer AS position FROM selected WHERE ranking<=20
)
INSERT INTO public.official_season_titles(season_id,series_id,position)
SELECT 'top20_scifi_2026',id,position FROM first_twenty
WHERE NOT EXISTS(
 SELECT 1 FROM public.official_season_titles WHERE season_id='top20_scifi_2026'
)
ON CONFLICT DO NOTHING;

-- Top 20 thrillers & enquêtes: candidats France, ordonnés et figés. Source: catalogue France certifié.
WITH selected AS(
 SELECT s.id,row_number() OVER (ORDER BY s.popularity_weight DESC NULLS LAST,
      s.rating_average DESC NULLS LAST,s.id ASC) AS ranking
 FROM public.series s
 WHERE s.fr_verified IS TRUE AND s.rarity_source<>'pending'
   AND s.image_url LIKE 'https://%' AND s.genres && ARRAY['Crime','Thriller','Mystery']::text[]
), first_twenty AS (
 SELECT id,ranking::integer AS position FROM selected WHERE ranking<=20
)
INSERT INTO public.official_season_titles(season_id,series_id,position)
SELECT 'top20_thriller_2026',id,position FROM first_twenty
WHERE NOT EXISTS(
 SELECT 1 FROM public.official_season_titles WHERE season_id='top20_thriller_2026'
)
ON CONFLICT DO NOTHING;

-- Si une plateforme a moins de 20 séries françaises jouables, le déploiement
-- échoue intégralement : aucun faux badge Top 20 ni objectif impossible.
DO $$
DECLARE v record;
BEGIN
 FOR v IN SELECT id, count(t.series_id)::integer AS n
          FROM public.official_seasons o
          LEFT JOIN public.official_season_titles t ON t.season_id=o.id
          WHERE left(o.id,6)='top20_'
          GROUP BY o.id
 LOOP
  IF v.n<>20 THEN RAISE EXCEPTION 'Top 20 % incomplet: % titres (20 requis)',v.id,v.n; END IF;
 END LOOP;
END $$;

-- Un compte ne peut obtenir le badge qu'avec 20 titres DISTINCTS de la liste,
-- jamais avec n'importe quelles séries du genre ou du service.
CREATE OR REPLACE FUNCTION public.my_official_seasons()
RETURNS TABLE(id text,title text,description text,badge text,
 target_count integer,reward_credits integer,owned integer,claimed boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT o.id,o.title,o.description,o.badge,o.target_count,o.reward_credits,
 CASE WHEN left(o.id,6)='top20_' THEN
   (SELECT count(DISTINCT c.series_id)::integer
      FROM public.official_season_titles t
      JOIN public.player_cards c ON c.series_id=t.series_id AND c.owner_id=auth.uid()
      JOIN public.series s ON s.id=t.series_id
      WHERE t.season_id=o.id AND s.fr_verified IS TRUE AND s.rarity_source<>'pending')
 ELSE
   (SELECT count(DISTINCT c.series_id)::integer
      FROM public.player_cards c JOIN public.series s ON s.id=c.series_id
      WHERE c.owner_id=auth.uid() AND s.fr_verified IS TRUE AND s.rarity_source<>'pending'
        AND (cardinality(o.genre_filter)=0 OR s.genres&&o.genre_filter)
        AND (o.start_year IS NULL OR extract(year FROM s.premiered)>=o.start_year)
        AND (o.end_year IS NULL OR extract(year FROM s.premiered)<=o.end_year))
 END AS owned,
 EXISTS(SELECT 1 FROM public.official_season_claims k
        WHERE k.player_id=auth.uid() AND k.season_id=o.id) AS claimed
 FROM public.official_seasons o ORDER BY o.position,o.id;
$$;
REVOKE ALL ON FUNCTION public.my_official_seasons() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.my_official_seasons() TO authenticated;

-- Liste consultable (y compris invité), mais aucune écriture depuis le navigateur.
CREATE OR REPLACE FUNCTION public.get_official_season_titles(p_season_id text)
RETURNS TABLE(rank_number integer,series_id bigint,name text,image_url text,owned boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT t.position,s.id,s.name,s.image_url,
 EXISTS(SELECT 1 FROM public.player_cards c
        WHERE c.owner_id=auth.uid() AND c.series_id=t.series_id)
 FROM public.official_season_titles t JOIN public.series s ON s.id=t.series_id
 WHERE t.season_id=p_season_id AND s.fr_verified IS TRUE AND s.rarity_source<>'pending'
 ORDER BY t.position;
$$;
REVOKE ALL ON FUNCTION public.get_official_season_titles(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_official_season_titles(text) TO anon,authenticated;

-- Conserver le verrou du portefeuille et la récompense unique V10.
CREATE OR REPLACE FUNCTION public.claim_official_season(p_season_id text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE uid uuid:=auth.uid();rec public.official_seasons%rowtype;
 owns integer;inserted text;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Connexion nécessaire'; END IF;
 SELECT * INTO rec FROM public.official_seasons WHERE id=p_season_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Saison officielle inconnue';END IF;
 INSERT INTO public.player_wallets(player_id) VALUES(uid) ON CONFLICT DO NOTHING;
 PERFORM 1 FROM public.player_wallets WHERE player_id=uid FOR UPDATE;
 IF left(rec.id,6)='top20_' THEN
  SELECT count(DISTINCT c.series_id)::integer INTO owns
  FROM public.official_season_titles t
  JOIN public.player_cards c ON c.series_id=t.series_id AND c.owner_id=uid
  JOIN public.series s ON s.id=t.series_id
  WHERE t.season_id=rec.id AND s.fr_verified IS TRUE AND s.rarity_source<>'pending';
  IF (SELECT count(*) FROM public.official_season_titles WHERE season_id=rec.id)<>20 THEN
    RAISE EXCEPTION 'Liste officielle non complète';
  END IF;
 ELSE
  SELECT count(DISTINCT c.series_id)::integer INTO owns
  FROM public.player_cards c JOIN public.series s ON s.id=c.series_id
  WHERE c.owner_id=uid AND s.fr_verified IS TRUE AND s.rarity_source<>'pending'
    AND (cardinality(rec.genre_filter)=0 OR s.genres&&rec.genre_filter)
    AND (rec.start_year IS NULL OR extract(year FROM s.premiered)>=rec.start_year)
    AND (rec.end_year IS NULL OR extract(year FROM s.premiered)<=rec.end_year);
 END IF;
 IF owns<rec.target_count THEN
   RAISE EXCEPTION 'Saison incomplète : % séries sur %',owns,rec.target_count;
 END IF;
 INSERT INTO public.official_season_claims(player_id,season_id,credits_awarded)
 VALUES(uid,rec.id,rec.reward_credits)
 ON CONFLICT(player_id,season_id) DO NOTHING RETURNING season_id INTO inserted;
 IF inserted IS NULL THEN RAISE EXCEPTION 'Récompense déjà obtenue'; END IF;
 UPDATE public.player_wallets SET credits=credits+rec.reward_credits WHERE player_id=uid;
 INSERT INTO public.game_transactions(player_id,kind,amount)
 VALUES(uid,'official_season_'||rec.id,rec.reward_credits);
 RETURN rec.reward_credits;
END $$;
REVOKE ALL ON FUNCTION public.claim_official_season(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.claim_official_season(text) TO authenticated;
COMMIT;
