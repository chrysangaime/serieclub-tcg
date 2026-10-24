CREATE OR REPLACE FUNCTION public.enforce_premium_cosmetics()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE valid_premium boolean;
BEGIN
 IF NEW.premium_title='collectionneur' AND NEW.premium_frame='classic' AND NEW.premium_badge='star' THEN
  RETURN NEW;
 END IF;
 SELECT EXISTS(
  SELECT 1 FROM public.commerce_subscriptions c
  WHERE c.player_id=NEW.id AND c.status IN ('active','trialing')
  AND (c.period_end IS NULL OR c.period_end>now())
 ) INTO valid_premium;
 IF NOT valid_premium THEN
  RAISE EXCEPTION 'Premium requis pour cette personnalisation' USING ERRCODE='42501';
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.enforce_premium_cosmetics() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS enforce_premium_cosmetics_update ON public.profiles;
CREATE TRIGGER enforce_premium_cosmetics_update
BEFORE INSERT OR UPDATE OF premium_title,premium_frame,premium_badge ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.enforce_premium_cosmetics();