CREATE OR REPLACE FUNCTION public.my_premium_status()
RETURNS TABLE(has_access boolean,status text,period_end timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp
AS $$
 SELECT (c.status IN ('active','trialing') AND c.period_end>now()) AS has_access,c.status,c.period_end
 FROM public.commerce_subscriptions c WHERE c.player_id=auth.uid()
 UNION ALL
 SELECT false,'inactive'::text,NULL::timestamptz
 WHERE NOT EXISTS (SELECT 1 FROM public.commerce_subscriptions WHERE player_id=auth.uid())
 LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.my_premium_status() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.my_premium_status() TO authenticated;
CREATE OR REPLACE FUNCTION public.enforce_premium_cosmetics()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF NEW.premium_title='collectionneur' AND NEW.premium_frame='classic' AND NEW.premium_badge='star' THEN RETURN NEW; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.commerce_subscriptions c WHERE c.player_id=NEW.id AND c.status IN ('active','trialing') AND c.period_end>now())
 THEN RAISE EXCEPTION 'Premium requis pour cette personnalisation' USING ERRCODE='42501'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.enforce_premium_cosmetics() FROM PUBLIC,anon,authenticated;