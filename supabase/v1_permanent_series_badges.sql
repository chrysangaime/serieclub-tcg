CREATE TABLE IF NOT EXISTS public.player_series_badges(
 player_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 series_id bigint NOT NULL REFERENCES public.series(id) ON DELETE CASCADE,
 unlocked_at timestamptz NOT NULL DEFAULT now(),
 required_at_unlock integer NOT NULL CHECK(required_at_unlock>0),
 PRIMARY KEY(player_id,series_id)
);
ALTER TABLE public.player_series_badges ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.player_series_badges FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.player_series_badges TO authenticated;
DROP POLICY IF EXISTS series_badges_owner_read ON public.player_series_badges;
CREATE POLICY series_badges_owner_read ON public.player_series_badges FOR SELECT TO authenticated USING(player_id=(SELECT auth.uid()));

CREATE OR REPLACE FUNCTION public.award_series_badge_on_card()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE total_needed integer; total_owned integer;
BEGIN
 IF NEW.season_number IS NULL THEN RETURN NEW; END IF;
 SELECT count(*) INTO total_needed FROM public.series_seasons
 WHERE series_id=NEW.series_id AND season_number>0 AND premiered IS NOT NULL AND premiered<=current_date;
 IF total_needed<1 THEN RETURN NEW; END IF;
 SELECT count(DISTINCT pc.season_number) INTO total_owned
 FROM public.player_cards pc JOIN public.series_seasons ss
 ON ss.series_id=pc.series_id AND ss.season_number=pc.season_number
 WHERE pc.owner_id=NEW.owner_id AND pc.series_id=NEW.series_id
 AND ss.premiered IS NOT NULL AND ss.premiered<=current_date;
 IF total_owned=total_needed THEN
  INSERT INTO public.player_series_badges(player_id,series_id,required_at_unlock)
  VALUES(NEW.owner_id,NEW.series_id,total_needed) ON CONFLICT DO NOTHING;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.award_series_badge_on_card() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS series_badge_award_after_card ON public.player_cards;
CREATE TRIGGER series_badge_award_after_card AFTER INSERT OR UPDATE OF season_number,series_id,owner_id
 ON public.player_cards FOR EACH ROW EXECUTE FUNCTION public.award_series_badge_on_card();

-- Rattrapage pour les albums terminés avant installation du déclencheur.
INSERT INTO public.player_series_badges(player_id,series_id,required_at_unlock)
SELECT pc.owner_id,ss.series_id,count(DISTINCT ss.season_number)::integer
FROM public.player_cards pc JOIN public.series_seasons ss
 ON ss.series_id=pc.series_id AND ss.season_number=pc.season_number
WHERE ss.premiered IS NOT NULL AND ss.premiered<=current_date
GROUP BY pc.owner_id,ss.series_id
HAVING count(DISTINCT ss.season_number)=(
 SELECT count(*) FROM public.series_seasons all_ss
 WHERE all_ss.series_id=ss.series_id AND all_ss.season_number>0
 AND all_ss.premiered IS NOT NULL AND all_ss.premiered<=current_date)
ON CONFLICT DO NOTHING;
