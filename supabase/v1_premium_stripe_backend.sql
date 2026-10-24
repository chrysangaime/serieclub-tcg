-- Premium V1: Stripe webhooks are the sole authority for paid access.
CREATE TABLE IF NOT EXISTS public.commerce_subscriptions(
 player_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 stripe_customer_id text,
 stripe_subscription_id text UNIQUE,
 status text NOT NULL DEFAULT 'inactive',
 period_end timestamptz,
 last_event_created timestamptz NOT NULL DEFAULT '-infinity'::timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT commerce_status_allowed CHECK(status IN ('active','trialing','past_due','canceled','inactive'))
);
CREATE TABLE IF NOT EXISTS public.commerce_stripe_events(
 event_id text PRIMARY KEY,
 player_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 processed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS commerce_subscriptions_customer_idx ON public.commerce_subscriptions(stripe_customer_id)
 WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS commerce_stripe_events_player_idx ON public.commerce_stripe_events(player_id);
ALTER TABLE public.commerce_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commerce_stripe_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.commerce_subscriptions,public.commerce_stripe_events FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.commerce_subscriptions,public.commerce_stripe_events TO service_role;

CREATE OR REPLACE FUNCTION public.my_premium_status()
RETURNS TABLE(has_access boolean,status text,period_end timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp
AS $$
 SELECT (
  c.status IN ('active','trialing')
  AND (c.period_end IS NULL OR c.period_end>now())
 ) AS has_access,c.status,c.period_end
 FROM public.commerce_subscriptions c WHERE c.player_id=auth.uid()
 UNION ALL
 SELECT false,'inactive'::text,NULL::timestamptz
 WHERE NOT EXISTS (SELECT 1 FROM public.commerce_subscriptions WHERE player_id=auth.uid())
 LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.my_premium_status() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.my_premium_status() TO authenticated;

CREATE OR REPLACE FUNCTION public.apply_stripe_premium_event(
 p_event_id text,p_player_id uuid,p_subscription_id text,p_customer_id text,
 p_status text,p_period_end timestamptz,p_event_created timestamptz
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp
AS $$
BEGIN
 IF p_event_id IS NULL OR length(p_event_id)<5 OR p_player_id IS NULL
 OR p_subscription_id IS NULL OR p_customer_id IS NULL
 OR p_status NOT IN ('active','trialing','past_due','canceled','inactive')
 OR p_event_created IS NULL THEN
  RAISE EXCEPTION 'Invalid Stripe event payload';
 END IF;
 INSERT INTO public.commerce_stripe_events(event_id,player_id)
 VALUES(p_event_id,p_player_id) ON CONFLICT DO NOTHING;
 IF NOT FOUND THEN RETURN; END IF;
 INSERT INTO public.commerce_subscriptions(
  player_id,stripe_customer_id,stripe_subscription_id,status,period_end,last_event_created,updated_at)
 VALUES(p_player_id,p_customer_id,p_subscription_id,p_status,p_period_end,p_event_created,now())
 ON CONFLICT(player_id) DO UPDATE SET
 stripe_customer_id=EXCLUDED.stripe_customer_id,
 stripe_subscription_id=EXCLUDED.stripe_subscription_id,
 status=EXCLUDED.status,period_end=EXCLUDED.period_end,
 last_event_created=EXCLUDED.last_event_created,updated_at=now()
 WHERE public.commerce_subscriptions.last_event_created<=EXCLUDED.last_event_created;
END $$;
REVOKE ALL ON FUNCTION public.apply_stripe_premium_event(text,uuid,text,text,text,timestamptz,timestamptz)
FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.apply_stripe_premium_event(text,uuid,text,text,text,timestamptz,timestamptz)
TO service_role;
