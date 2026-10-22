-- SérieClub V10 : saisons officielles, badges et habillage de profil.
-- EXÉCUTER sur Supabase après V4 social et V5 France. SQL atomique.
-- Important : jamais de crédits sans récompense contrôlée côté serveur.
BEGIN;
CREATE TABLE IF NOT EXISTS public.official_seasons (
 id text PRIMARY KEY,
 title text NOT NULL,
 description text NOT NULL,
 badge text NOT NULL,
 target_count integer NOT NULL CHECK(target_count BETWEEN 1 AND 100),
 reward_credits integer NOT NULL CHECK(reward_credits BETWEEN 0 AND 1000),
 genre_filter text[] NOT NULL DEFAULT '{}'::text[],
 start_year integer,
 end_year integer,
 position integer NOT NULL DEFAULT 0
);
-- Les définitions éditoriales restent stables après publication.
INSERT INTO public.official_seasons(id,title,description,badge,target_count,reward_credits,genre_filter,start_year,end_year,position) VALUES
 ('nineties','Retour dans les années 90','Récupère huit séries ayant débuté entre 1990 et 1999.','📼 Nostalgie',8,120,ARRAY[]::text[],1990,1999,1),
 ('comedies','Rire ensemble','Rassemble huit séries de comédie.','🎭 Comédie',8,100,ARRAY['Comedy'],NULL,NULL,2),
 ('mysteres','Enquête & mystères','Rassemble huit séries policières, thrillers ou mystères.','🔍 Enquêteur',8,120,ARRAY['Crime','Thriller','Mystery'],NULL,NULL,3),
 ('imaginaire','Vers d’autres mondes','Collectionne huit séries de science-fiction ou de fantasy.','🚀 Explorateur',8,150,ARRAY['Science-Fiction','Fantasy'],NULL,NULL,4),
 ('modernes','Nouvelle vague','Réunis huit séries lancées à partir de 2020.','✨ Avant-garde',8,100,ARRAY[]::text[],2020,NULL,5),
 ('patrimoine','Les grands classiques','Rassemble huit séries créées avant l’an 2000.','🏆 Historien',8,150,ARRAY[]::text[],NULL,1999,6)
ON CONFLICT(id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.official_season_claims (
 player_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 season_id text NOT NULL REFERENCES public.official_seasons(id),
 credits_awarded integer NOT NULL CHECK(credits_awarded BETWEEN 0 AND 1000),
 claimed_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(player_id,season_id)
);
ALTER TABLE public.official_season_claims ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.official_season_claims FROM PUBLIC,anon,authenticated;
CREATE INDEX IF NOT EXISTS sc_season_claims_player ON public.official_season_claims(player_id);
REVOKE ALL ON public.official_seasons FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.official_seasons TO anon,authenticated;

-- Ce résultat est lu depuis PostgreSQL pour ne pas attribuer de fausses récompenses
-- sur la base des cartes visibles en mémoire dans le navigateur.
CREATE OR REPLACE FUNCTION public.my_official_seasons()
RETURNS TABLE(id text,title text,description text,badge text,
 target_count integer,reward_credits integer,owned integer,claimed boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT o.id,o.title,o.description,o.badge,o.target_count,o.reward_credits,
   (SELECT count(DISTINCT c.series_id)::integer
    FROM public.player_cards c JOIN public.series s ON s.id=c.series_id
    WHERE c.owner_id=auth.uid() AND s.fr_verified IS TRUE
      AND s.rarity_source<>'pending'
      AND (cardinality(o.genre_filter)=0 OR s.genres&&o.genre_filter)
      AND (o.start_year IS NULL OR extract(year FROM s.premiered)>=o.start_year)
      AND (o.end_year IS NULL OR extract(year FROM s.premiered)<=o.end_year)
   ) AS owned,
   EXISTS(SELECT 1 FROM public.official_season_claims k
          WHERE k.player_id=auth.uid() AND k.season_id=o.id) AS claimed
 FROM public.official_seasons o ORDER BY o.position,o.id;
$$;
REVOKE ALL ON FUNCTION public.my_official_seasons() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.my_official_seasons() TO authenticated;

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
 -- Le compteur est vérifié au moment de la transaction, sans confiance client.
 SELECT count(DISTINCT c.series_id)::integer INTO owns
 FROM public.player_cards c JOIN public.series s ON s.id=c.series_id
 WHERE c.owner_id=uid AND s.fr_verified IS TRUE AND s.rarity_source<>'pending'
   AND (cardinality(rec.genre_filter)=0 OR s.genres&&rec.genre_filter)
   AND (rec.start_year IS NULL OR extract(year FROM s.premiered)>=rec.start_year)
   AND (rec.end_year IS NULL OR extract(year FROM s.premiered)<=rec.end_year);
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

-- Les visuels du profil doivent provenir de séries possédées lors du choix.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_series_id bigint REFERENCES public.series(id) ON DELETE SET NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banner_series_id bigint REFERENCES public.series(id) ON DELETE SET NULL;
CREATE OR REPLACE FUNCTION public.verify_profile_card_art()
RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
BEGIN
 IF NEW.avatar_series_id IS DISTINCT FROM OLD.avatar_series_id
    AND NEW.avatar_series_id IS NOT NULL
    AND NOT EXISTS(SELECT 1 FROM public.player_cards c JOIN public.series s ON s.id=c.series_id
      WHERE c.owner_id=NEW.id AND c.series_id=NEW.avatar_series_id AND s.image_url LIKE 'https://%') THEN
  RAISE EXCEPTION 'Choisis une affiche de série présente dans ta collection pour ton avatar';
 END IF;
 IF NEW.banner_series_id IS DISTINCT FROM OLD.banner_series_id
    AND NEW.banner_series_id IS NOT NULL
    AND NOT EXISTS(SELECT 1 FROM public.player_cards c JOIN public.series s ON s.id=c.series_id
      WHERE c.owner_id=NEW.id AND c.series_id=NEW.banner_series_id AND s.image_url LIKE 'https://%') THEN
  RAISE EXCEPTION 'Choisis une affiche de série présente dans ta collection pour ta bannière';
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS sc_verify_profile_art ON public.profiles;
CREATE TRIGGER sc_verify_profile_art BEFORE UPDATE OF avatar_series_id,banner_series_id
ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.verify_profile_card_art();
COMMIT;
