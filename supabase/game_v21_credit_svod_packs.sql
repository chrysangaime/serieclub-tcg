-- SériesClubTCG V21. Achat de boosters TV/SVOD uniquement en crédits virtuels gagnés.
-- Jamais de paiement en euros, aucune interaction Stripe.
-- Cache France TMDB / JustWatch : séries diffusées en France, sans achat VOD.
BEGIN;
CREATE TABLE IF NOT EXISTS public.credit_booster_types(
 pack_key text PRIMARY KEY,label text NOT NULL,
 price_credits integer NOT NULL CHECK(price_credits BETWEEN 50 AND 2000),
 enabled boolean NOT NULL DEFAULT true
);
CREATE TABLE IF NOT EXISTS public.credit_booster_members(
 pack_key text NOT NULL REFERENCES public.credit_booster_types(pack_key),
 series_id bigint NOT NULL REFERENCES public.series(id) ON DELETE CASCADE,
 checked_on date NOT NULL,PRIMARY KEY(pack_key,series_id)
);
CREATE INDEX IF NOT EXISTS sc21_packs_series ON public.credit_booster_members(series_id,pack_key);
ALTER TABLE public.credit_booster_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_booster_members ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.credit_booster_types,public.credit_booster_members FROM PUBLIC,anon,authenticated;
INSERT INTO public.credit_booster_types(pack_key,label,price_credits) VALUES
 ('netflix','Netflix France',250),
 ('prime','Prime Video France',250),
 ('disney','Disney+ France',300),
 ('television','Télévision française',200)
ON CONFLICT(pack_key) DO UPDATE SET label=EXCLUDED.label,price_credits=EXCLUDED.price_credits;
DELETE FROM public.credit_booster_members WHERE pack_key IN ('netflix','prime','disney','television');

-- Netflix France: 143 candidats du relevé France, vérifiés à la date de chaque fiche.
INSERT INTO public.credit_booster_members(pack_key,series_id,checked_on)
SELECT 'netflix',s.id,record.checked_on FROM unnest(
 ARRAY[2,7,13,27,29,32,43,49,56,63,65,69,73,77,89,103,116,118,124,134,150,160,169,170,172,175,184,204,216,251,269,302,305,315,318,321,431,435,440,488,495,525,526,530,537,547,552,555,560,567,590,618,706,712,794,797,802,803,894,1121,1440,1505,1536,1851,1859,1925,2071,2266,2818,2993,3134,3164,3594,4297,4972,5262,5557,6405,6424,6459,6544,7608,8244,8287,9993,10292,12309,16579,16770,16825,17861,18260,18374,18858,19809,21532,21845,23968,24372,26020,26856,27557,27848,28160,28276,28757,30960,31682,32938,36795,37374,38753,41611,42966,43687,45840,46573,48108,48450,48945,50701,51480,52279,52910,53277,53647,54914,55138,56512,59698,60213,60339,64992,67017,68407,68408,68439,69956,77060,81686,90007,93115,93969]::bigint[],ARRAY['2026-10-21','2026-10-21','2026-10-21','2026-10-22','2026-10-21','2026-10-21','2026-10-21','2026-10-21','2026-10-21','2026-10-21','2026-10-21','2026-10-21','2026-10-21','2026-10-21','2026-10-21','2026-10-22','2026-10-21','2026-10-22','2026-10-21','2026-10-21','2026-10-21','2026-10-21','2026-10-21','2026-10-21','2026-10-21','2026-10-21','2026-10-21','2026-10-22','2026-10-21','2026-10-21','2026-10-21','2026-10-22','2026-10-21','2026-10-21','2026-10-21','2026-10-22','2026-10-21','2026-10-22','2026-10-22','2026-10-21','2026-10-22','2026-10-22','2026-10-21','2026-10-21','2026-10-21','2026-10-21','2026-10-22','2026-10-22','2026-10-22','2026-10-21','2026-10-22','2026-10-21','2026-10-21','2026-10-21','2026-10-21','2026-10-22','2026-10-21','2026-10-22','2026-10-21','2026-10-22','2026-10-21','2026-10-22','2026-10-21','2026-10-21','2026-10-21','2026-10-22','2026-10-21','2026-10-21','2026-10-21','2026-10-21','2026-10-21','2026-10-21','2026-10-21','2026-10-22','2026-10-22','2026-10-21','2026-10-21','2026-10-21','2026-10-22','2026-10-22','2026-10-21','2026-10-22','2026-10-22','2026-10-21','2026-10-21','2026-10-22','2026-10-22','2026-10-21','2026-10-21','2026-10-22','2026-10-22','2026-10-21','2026-10-21','2026-10-21','2026-10-21','2026-10-21','2026-10-21','2026-10-21','2026-10-22','2026-10-21','2026-10-21','2026-10-21','2026-10-21','2026-10-21','2026-10-21','2026-10-21','2026-10-21','2026-10-22','2026-10-21','2026-10-21','2026-10-22','2026-10-21','2026-10-21','2026-10-21','2026-10-21','2026-10-21','2026-10-21','2026-10-21','2026-10-21','2026-10-21','2026-10-22','2026-10-21','2026-10-21','2026-10-22','2026-10-22','2026-10-21','2026-10-21','2026-10-21','2026-10-22','2026-10-21','2026-10-21','2026-10-22','2026-10-21','2026-10-21','2026-10-22','2026-10-22','2026-10-21','2026-10-21','2026-10-22','2026-10-21','2026-10-21','2026-10-21','2026-10-21']::date[]
) AS record(series_id,checked_on)
JOIN public.series s ON s.id=record.series_id
WHERE s.fr_verified IS TRUE AND s.rarity_source<>'pending' AND s.image_url LIKE 'https://%'
ON CONFLICT(pack_key,series_id) DO UPDATE SET checked_on=EXCLUDED.checked_on;

-- Prime Video France: 135 candidats du relevé France, vérifiés à la date de chaque fiche.
INSERT INTO public.credit_booster_members(pack_key,series_id,checked_on)
SELECT 'prime',s.id,record.checked_on FROM unnest(
 ARRAY[2,4,6,10,19,20,22,24,27,32,56,59,60,62,63,72,73,89,98,100,101,103,106,111,116,118,124,128,130,133,150,158,164,172,177,194,195,196,251,269,315,328,344,430,435,465,488,495,506,522,525,543,560,562,566,567,614,655,657,676,682,712,757,772,773,776,786,823,863,1055,1070,1119,1216,1374,1536,1719,1754,1824,1825,1913,2083,2246,2285,2355,2560,3262,4100,4246,4972,5251,5304,6308,6459,7608,8235,8244,9521,10292,12072,12309,12779,13855,15299,16579,17059,17794,18069,18429,18577,23251,26020,26295,33352,37196,43031,44092,44721,44751,45562,45834,47856,48450,49041,51777,53443,58063,63784,64977,68439,69430,73663,74127,82707,84526,93264]::bigint[],ARRAY['2026-10-21','2026-10-21','2026-10-21','2026-10-21','2026-10-21','2026-10-22','2026-10-21','2026-10-21','2026-10-22','2026-10-21','2026-10-21','2026-10-21','2026-10-22','2026-10-22','2026-10-21','2026-10-21','2026-10-21','2026-10-21','2026-10-21','2026-10-21','2026-10-21','2026-10-22','2026-10-22','2026-10-21','2026-10-21','2026-10-22','2026-10-21','2026-10-21','2026-10-22','2026-10-21','2026-10-21','2026-10-21','2026-10-21','2026-10-21','2026-10-21','2026-10-22','2026-10-22','2026-10-22','2026-10-21','2026-10-21','2026-10-21','2026-10-22','2026-10-21','2026-10-22','2026-10-22','2026-10-22','2026-10-21','2026-10-22','2026-10-22','2026-10-22','2026-10-22','2026-10-22','2026-10-22','2026-10-21','2026-10-21','2026-10-21','2026-10-22','2026-10-22','2026-10-22','2026-10-22','2026-10-21','2026-10-21','2026-10-21','2026-10-22','2026-10-21','2026-10-22','2026-10-22','2026-10-22','2026-10-21','2026-10-21','2026-10-21','2026-10-21','2026-10-21','2026-10-22','2026-10-21','2026-10-21','2026-10-21','2026-10-21','2026-10-21','2026-10-22','2026-10-21','2026-10-21','2026-10-22','2026-10-22','2026-10-22','2026-10-22','2026-10-22','2026-10-21','2026-10-22','2026-10-22','2026-10-21','2026-10-21','2026-10-22','2026-10-22','2026-10-22','2026-10-22','2026-10-22','2026-10-22','2026-10-21','2026-10-22','2026-10-22','2026-10-22','2026-10-21','2026-10-21','2026-10-21','2026-10-22','2026-10-22','2026-10-22','2026-10-22','2026-10-21','2026-10-21','2026-10-22','2026-10-21','2026-10-21','2026-10-21','2026-10-21','2026-10-22','2026-10-21','2026-10-21','2026-10-22','2026-10-22','2026-10-21','2026-10-22','2026-10-22','2026-10-21','2026-10-22','2026-10-22','2026-10-22','2026-10-21','2026-10-22','2026-10-22','2026-10-22','2026-10-22','2026-10-21','2026-10-21']::date[]
) AS record(series_id,checked_on)
JOIN public.series s ON s.id=record.series_id
WHERE s.fr_verified IS TRUE AND s.rarity_source<>'pending' AND s.image_url LIKE 'https://%'
ON CONFLICT(pack_key,series_id) DO UPDATE SET checked_on=EXCLUDED.checked_on;

-- Disney+ France: 123 candidats du relevé France, vérifiés à la date de chaque fiche.
INSERT INTO public.credit_booster_members(pack_key,series_id,checked_on)
SELECT 'disney',s.id,record.checked_on FROM unnest(
 ARRAY[7,8,20,30,31,41,52,57,58,60,65,67,68,73,76,80,81,83,84,98,103,106,107,111,115,123,157,167,171,180,215,251,321,323,335,336,347,385,396,427,428,430,472,495,525,526,532,538,541,550,563,566,568,570,575,655,667,672,678,683,687,770,839,1408,1414,1505,1529,1775,1864,1898,1905,2557,3916,4099,4240,4241,4244,4972,5309,5557,5935,6308,8370,8520,8605,9803,9804,12958,13988,15836,16544,16794,17128,18458,19809,20263,26020,26701,28152,29180,32938,34577,37336,38963,41007,41748,41821,48108,48450,48830,52336,52343,54198,55350,58948,59698,61740,63192,63234,68752,75030,84527,84836]::bigint[],ARRAY['2026-10-21','2026-10-21','2026-10-22','2026-10-21','2026-10-21','2026-10-22','2026-10-21','2026-10-22','2026-10-21','2026-10-22','2026-10-21','2026-10-21','2026-10-21','2026-10-21','2026-10-21','2026-10-21','2026-10-21','2026-10-21','2026-10-22','2026-10-21','2026-10-22','2026-10-22','2026-10-21','2026-10-21','2026-10-22','2026-10-22','2026-10-22','2026-10-22','2026-10-17','2026-10-22','2026-10-21','2026-10-21','2026-10-22','2026-10-21','2026-10-22','2026-10-22','2026-10-21','2026-10-21','2026-10-21','2026-10-22','2026-10-22','2026-10-22','2026-10-21','2026-10-22','2026-10-22','2026-10-21','2026-10-22','2026-10-22','2026-10-21','2026-10-22','2026-10-21','2026-10-21','2026-10-22','2026-10-21','2026-10-21','2026-10-22','2026-10-21','2026-10-21','2026-10-21','2026-10-21','2026-10-22','2026-10-21','2026-10-22','2026-10-22','2026-10-22','2026-10-22','2026-10-22','2026-10-21','2026-10-21','2026-10-21','2026-10-22','2026-10-22','2026-10-21','2026-10-22','2026-10-21','2026-10-22','2026-10-22','2026-10-22','2026-10-21','2026-10-21','2026-10-22','2026-10-21','2026-10-22','2026-10-21','2026-10-22','2026-10-22','2026-10-21','2026-10-21','2026-10-22','2026-10-22','2026-10-21','2026-10-22','2026-10-21','2026-10-22','2026-10-21','2026-10-21','2026-10-21','2026-10-22','2026-10-21','2026-10-21','2026-10-21','2026-10-21','2026-10-22','2026-10-21','2026-10-21','2026-10-22','2026-10-21','2026-10-21','2026-10-21','2026-10-21','2026-10-22','2026-10-22','2026-10-21','2026-10-21','2026-10-22','2026-10-21','2026-10-22','2026-10-21','2026-10-21','2026-10-21','2026-10-22','2026-10-22','2026-10-22']::date[]
) AS record(series_id,checked_on)
JOIN public.series s ON s.id=record.series_id
WHERE s.fr_verified IS TRUE AND s.rarity_source<>'pending' AND s.image_url LIKE 'https://%'
ON CONFLICT(pack_key,series_id) DO UPDATE SET checked_on=EXCLUDED.checked_on;

-- Télévision française: 161 candidats du relevé France, vérifiés à la date de chaque fiche.
INSERT INTO public.credit_booster_members(pack_key,series_id,checked_on)
SELECT 'television',s.id,record.checked_on FROM unnest(
 ARRAY[1,19,24,32,48,60,66,68,70,81,89,101,103,106,109,111,116,123,128,133,156,157,158,161,167,176,177,178,204,207,328,344,361,429,430,431,435,468,488,495,506,550,555,560,562,576,590,593,635,667,681,706,712,713,716,749,772,773,786,799,805,813,818,821,826,830,882,894,1097,1119,1166,1216,1437,1536,1719,1859,1893,1895,1896,1911,2075,2085,2355,2560,3593,3628,3992,4099,4903,4968,4972,5251,5429,5557,5883,5904,6261,6405,6459,6561,8914,9740,12072,12083,12837,17059,17128,17755,17794,18009,18298,18374,18429,18577,18666,19496,19619,20505,21003,21050,23172,26644,26950,28152,32938,34112,34409,36672,36841,40695,41821,42021,43319,44365,44503,44751,44933,46573,48450,49213,51394,53531,54723,54914,55468,55836,55991,56054,56325,60256,60339,60879,63192,64632,66840,66869,69467,70200,73663,75632,78665]::bigint[],ARRAY['2026-10-22','2026-10-21','2026-10-21','2026-10-21','2026-10-21','2026-10-22','2026-10-21','2026-10-21','2026-10-21','2026-10-21','2026-10-21','2026-10-21','2026-10-22','2026-10-22','2026-10-22','2026-10-21','2026-10-21','2026-10-22','2026-10-21','2026-10-21','2026-10-21','2026-10-22','2026-10-21','2026-10-21','2026-10-22','2026-10-21','2026-10-21','2026-10-21','2026-10-22','2026-10-22','2026-10-22','2026-10-21','2026-10-21','2026-10-22','2026-10-22','2026-10-21','2026-10-22','2026-10-21','2026-10-21','2026-10-22','2026-10-22','2026-10-22','2026-10-22','2026-10-22','2026-10-21','2026-10-22','2026-10-22','2026-10-21','2026-10-22','2026-10-21','2026-10-22','2026-10-21','2026-10-21','2026-10-22','2026-10-21','2026-10-22','2026-10-22','2026-10-21','2026-10-22','2026-10-22','2026-10-22','2026-10-22','2026-10-21','2026-10-21','2026-10-21','2026-10-21','2026-10-22','2026-10-21','2026-10-21','2026-10-21','2026-10-21','2026-10-21','2026-10-21','2026-10-21','2026-10-21','2026-10-21','2026-10-21','2026-10-22','2026-10-21','2026-10-21','2026-10-21','2026-10-21','2026-10-22','2026-10-22','2026-10-22','2026-10-22','2026-10-21','2026-10-22','2026-10-22','2026-10-21','2026-10-22','2026-10-22','2026-10-22','2026-10-21','2026-10-22','2026-10-22','2026-10-22','2026-10-21','2026-10-22','2026-10-21','2026-10-22','2026-10-22','2026-10-21','2026-10-22','2026-10-22','2026-10-21','2026-10-21','2026-10-22','2026-10-22','2026-10-22','2026-10-22','2026-10-21','2026-10-22','2026-10-22','2026-10-22','2026-10-22','2026-10-22','2026-10-21','2026-10-21','2026-10-22','2026-10-22','2026-10-21','2026-10-22','2026-10-21','2026-10-21','2026-10-22','2026-10-21','2026-10-22','2026-10-21','2026-10-21','2026-10-21','2026-10-22','2026-10-22','2026-10-22','2026-10-22','2026-10-21','2026-10-22','2026-10-21','2026-10-21','2026-10-21','2026-10-22','2026-10-22','2026-10-21','2026-10-21','2026-10-22','2026-10-22','2026-10-22','2026-10-22','2026-10-22','2026-10-21','2026-10-22','2026-10-22','2026-10-21','2026-10-21','2026-10-22','2026-10-21','2026-10-22','2026-10-22','2026-10-22','2026-10-21','2026-10-22']::date[]
) AS record(series_id,checked_on)
JOIN public.series s ON s.id=record.series_id
WHERE s.fr_verified IS TRUE AND s.rarity_source<>'pending' AND s.image_url LIKE 'https://%'
ON CONFLICT(pack_key,series_id) DO UPDATE SET checked_on=EXCLUDED.checked_on;


-- Seul l'état serveur déverrouille un bouton d'achat.
CREATE OR REPLACE FUNCTION public.list_credit_boosters()
RETURNS TABLE(pack_key text,label text,price_credits integer,eligible_series integer,available boolean,proof_date date)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path=public,pg_temp AS $$
 SELECT p.pack_key,p.label,p.price_credits,count(DISTINCT s.id)::integer,
 (p.enabled AND count(DISTINCT s.id)>=5),max(m.checked_on)
 FROM public.credit_booster_types p
 LEFT JOIN public.credit_booster_members m ON m.pack_key=p.pack_key
  AND m.checked_on>=CURRENT_DATE-90
 LEFT JOIN public.series s ON s.id=m.series_id AND s.fr_verified IS TRUE
  AND s.rarity_source<>'pending' AND s.image_url LIKE 'https://%'
 GROUP BY p.pack_key,p.label,p.price_credits,p.enabled
 ORDER BY CASE p.pack_key WHEN 'netflix' THEN 1 WHEN 'prime' THEN 2
 WHEN 'disney' THEN 3 ELSE 4 END;
$$;
REVOKE ALL ON FUNCTION public.list_credit_boosters() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_credit_boosters() TO anon,authenticated;

-- Paiement unique et tirage atomique. Ne consomme jamais le stock gratuit.
-- Pondération inchangée (55/23/12/6/2,5/1,2/0,3) sur les raretés disponibles.
-- La rareté de chaque série est fixée dans public.series.
CREATE OR REPLACE FUNCTION public.buy_credit_booster(p_pack_key text)
RETURNS TABLE(card_id uuid,series_id bigint,name text,image_url text,rarity text,
 credits bigint,experience bigint,next_booster_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE uid uuid:=auth.uid();cfg public.credit_booster_types%rowtype;
 wallet public.player_wallets%rowtype;used bigint[]:=ARRAY[]::bigint[];
 ranks text[]:=ARRAY['Commune','Peu commune','Rare','Épique','Légendaire','Mythique','Unique'];
 weights numeric[]:=ARRAY[55,23,12,6,2.5,1.2,0.3];
 j integer;pos integer;total numeric;roll numeric;cursor_weight numeric;
 rank_selected text;show record;generated uuid;
BEGIN
 IF uid IS NULL OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=uid) THEN
  RAISE EXCEPTION 'Profil requis pour acheter un paquet';END IF;
 SELECT * INTO cfg FROM public.credit_booster_types p WHERE p.pack_key=p_pack_key AND p.enabled;
 IF NOT FOUND THEN RAISE EXCEPTION 'Booster indisponible';END IF;
 INSERT INTO public.player_wallets(player_id) VALUES(uid) ON CONFLICT DO NOTHING;
 SELECT * INTO wallet FROM public.player_wallets WHERE player_id=uid FOR UPDATE;
 IF wallet.credits<cfg.price_credits THEN RAISE EXCEPTION 'Crédits insuffisants';END IF;
 IF (SELECT count(DISTINCT s.id) FROM public.credit_booster_members m
  JOIN public.series s ON s.id=m.series_id
  WHERE m.pack_key=p_pack_key AND m.checked_on>=CURRENT_DATE-90
  AND s.fr_verified IS TRUE AND s.rarity_source<>'pending'
  AND s.image_url LIKE 'https://%')<5 THEN
  RAISE EXCEPTION 'Catalogue France insuffisant ou en actualisation';END IF;
 FOR pos IN 1..5 LOOP
  total:=0;rank_selected:=NULL;
  FOR j IN 1..7 LOOP
   IF EXISTS(SELECT 1 FROM public.credit_booster_members m
    JOIN public.series s ON s.id=m.series_id
    WHERE m.pack_key=p_pack_key AND m.checked_on>=CURRENT_DATE-90
    AND s.fr_verified IS TRUE AND s.rarity_source<>'pending'
    AND s.image_url LIKE 'https://%' AND s.rarity=ranks[j]
    AND NOT(s.id=ANY(used))) THEN total:=total+weights[j];END IF;
  END LOOP;
  IF total<=0 THEN RAISE EXCEPTION 'Plus assez de séries pour ce booster';END IF;
  roll:=random()*total;cursor_weight:=0;
  FOR j IN 1..7 LOOP
   IF EXISTS(SELECT 1 FROM public.credit_booster_members m
    JOIN public.series s ON s.id=m.series_id
    WHERE m.pack_key=p_pack_key AND m.checked_on>=CURRENT_DATE-90
    AND s.fr_verified IS TRUE AND s.rarity_source<>'pending'
    AND s.image_url LIKE 'https://%' AND s.rarity=ranks[j]
    AND NOT(s.id=ANY(used))) THEN
    cursor_weight:=cursor_weight+weights[j];
    IF roll<cursor_weight THEN rank_selected:=ranks[j];EXIT;END IF;
   END IF;
  END LOOP;
  IF rank_selected IS NULL THEN RAISE EXCEPTION 'Rareté indisponible';END IF;
  SELECT s.id AS sid,s.name AS title,s.image_url AS artwork,s.rarity AS official
   INTO show FROM public.credit_booster_members m
   JOIN public.series s ON s.id=m.series_id
  WHERE m.pack_key=p_pack_key AND m.checked_on>=CURRENT_DATE-90
   AND s.fr_verified IS TRUE AND s.rarity_source<>'pending'
   AND s.image_url LIKE 'https://%' AND s.rarity=rank_selected
   AND NOT (s.id=ANY(used))
  ORDER BY random() LIMIT 1;
  IF show.sid IS NULL THEN RAISE EXCEPTION 'Série indisponible';END IF;
  used:=array_append(used,show.sid);
  INSERT INTO public.player_cards(owner_id,series_id,rarity)
  VALUES(uid,show.sid,show.official) RETURNING id INTO generated;
  card_id:=generated;series_id:=show.sid;name:=show.title;
  image_url:=show.artwork;rarity:=show.official;
  credits:=wallet.credits-cfg.price_credits;experience:=wallet.experience;
  next_booster_at:=NULL;
  RETURN NEXT;
 END LOOP;
 IF cardinality(used)<>5 THEN RAISE EXCEPTION 'Booster incomplet';END IF;
 UPDATE public.player_wallets SET
  credits=player_wallets.credits-cfg.price_credits,
  boosters_opened=player_wallets.boosters_opened+1
 WHERE player_id=uid AND player_wallets.credits>=cfg.price_credits;
 IF NOT FOUND THEN RAISE EXCEPTION 'Solde insuffisant';END IF;
 INSERT INTO public.game_transactions(player_id,kind,amount)
 VALUES(uid,'credit_pack_'||cfg.pack_key,-cfg.price_credits);
END $$;
REVOKE ALL ON FUNCTION public.buy_credit_booster(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.buy_credit_booster(text) TO authenticated;
COMMIT;
