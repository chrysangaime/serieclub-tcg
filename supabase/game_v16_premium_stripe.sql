-- V16 : Premium payant uniquement; aucun crédit acheté ne peut être émis.
-- Prérequis: appliquer game_v10_commerce_ready.sql dans Supabase.
BEGIN;
ALTER TABLE public.commerce_subscriptions ADD COLUMN IF NOT EXISTS last_event_created timestamptz NOT NULL DEFAULT 'epoch';
CREATE TABLE IF NOT EXISTS public.commerce_premium_events (
 event_id text PRIMARY KEY,player_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 subscription_id text NOT NULL,event_created timestamptz NOT NULL,processed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.commerce_premium_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.commerce_premium_events FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.my_premium_status()
RETURNS TABLE(status text,has_access boolean,expires_at timestamptz)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path=public,pg_temp AS $$
 SELECT coalesce(s.status,'inactive'),coalesce(s.status IN ('active','trialing'),false),s.current_period_end
 FROM (SELECT auth.uid() AS uid) u
 LEFT JOIN public.commerce_subscriptions s ON s.player_id=u.uid WHERE u.uid IS NOT NULL;
$$;
REVOKE ALL ON FUNCTION public.my_premium_status() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.my_premium_status() TO authenticated;
CREATE OR REPLACE FUNCTION public.apply_stripe_premium_event(
 p_event_id text,p_player_id uuid,p_subscription_id text,p_customer_id text,
 p_status text,p_period_end timestamptz,p_event_created timestamptz
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE n integer;
BEGIN
 IF p_event_id NOT LIKE 'evt_%' OR p_subscription_id NOT LIKE 'sub_%'
 OR p_customer_id NOT LIKE 'cus_%' OR p_player_id IS NULL OR p_event_created IS NULL
 OR p_status NOT IN ('inactive','active','trialing','past_due','canceled') THEN
  RAISE EXCEPTION 'Invalid Stripe event';
 END IF;
 INSERT INTO public.commerce_premium_events(event_id,player_id,subscription_id,event_created)
 VALUES(p_event_id,p_player_id,p_subscription_id,p_event_created)
 ON CONFLICT(event_id) DO NOTHING;
 GET DIAGNOSTICS n=ROW_COUNT;
 IF n=0 THEN RETURN false; END IF;
 INSERT INTO public.commerce_subscriptions(player_id,stripe_customer_id,stripe_subscription_id,status,current_period_end,last_event_created,updated_at)
 VALUES(p_player_id,p_customer_id,p_subscription_id,p_status,p_period_end,p_event_created,now())
 ON CONFLICT(player_id) DO UPDATE SET
 stripe_customer_id=EXCLUDED.stripe_customer_id,
 stripe_subscription_id=EXCLUDED.stripe_subscription_id,
 status=EXCLUDED.status,
 current_period_end=EXCLUDED.current_period_end,
 last_event_created=EXCLUDED.last_event_created,
 updated_at=now()
 WHERE public.commerce_subscriptions.last_event_created <= EXCLUDED.last_event_created
 AND (public.commerce_subscriptions.stripe_subscription_id IS NULL
 OR public.commerce_subscriptions.stripe_subscription_id=EXCLUDED.stripe_subscription_id
 OR public.commerce_subscriptions.status IN ('inactive','canceled'));
 RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.apply_stripe_premium_event(text,uuid,text,text,text,timestamptz,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.apply_stripe_premium_event(text,uuid,text,text,text,timestamptz,timestamptz) TO service_role;
UPDATE public.commerce_products SET enabled=false WHERE product_type IN ('subscription','virtual_credits');
COMMIT;