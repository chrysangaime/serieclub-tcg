-- SérieClub V10 : données de facturation prêtes à accueillir Stripe.
-- ATTENTION : ce SQL ne crée PAS de Checkout ni d'attribution de crédits.
-- Aucun client ne peut insérer ou modifier une vente ou un abonnement.
-- Activation réservée à un webhook Stripe signé, après conformité légale.
BEGIN;
CREATE TABLE IF NOT EXISTS public.commerce_products(
 sku text PRIMARY KEY,
 product_type text NOT NULL CHECK(product_type IN ('subscription','virtual_credits')),
 price_cents integer NOT NULL CHECK(price_cents BETWEEN 1 AND 20000),
 credit_amount integer NOT NULL DEFAULT 0 CHECK(credit_amount BETWEEN 0 AND 20000),
 billing_interval text CHECK(billing_interval IN ('month') OR billing_interval IS NULL),
 enabled boolean NOT NULL DEFAULT false
);
INSERT INTO public.commerce_products(sku,product_type,price_cents,credit_amount,billing_interval,enabled) VALUES
 ('premium_monthly','subscription',199,0,'month',false),
 ('credits_starter','virtual_credits',99,250,NULL,false),
 ('credits_plus','virtual_credits',249,750,NULL,false),
 ('credits_max','virtual_credits',499,1800,NULL,false)
ON CONFLICT(sku) DO NOTHING;
ALTER TABLE public.commerce_products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Read public commerce catalog" ON public.commerce_products;
CREATE POLICY "Read public commerce catalog" ON public.commerce_products
 FOR SELECT USING(true);
REVOKE ALL ON public.commerce_products FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.commerce_products TO anon,authenticated;

CREATE TABLE IF NOT EXISTS public.commerce_receipts(
 provider_event_id text PRIMARY KEY,
 provider text NOT NULL CHECK(provider='stripe'),
 player_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 sku text NOT NULL REFERENCES public.commerce_products(sku),
 amount_cents integer NOT NULL CHECK(amount_cents>=0),
 currency text NOT NULL CHECK(currency='eur'),
 status text NOT NULL CHECK(status IN ('pending','paid','refunded','disputed')),
 processed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.commerce_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.commerce_receipts FROM PUBLIC,anon,authenticated;

CREATE TABLE IF NOT EXISTS public.commerce_subscriptions(
 player_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
 stripe_customer_id text UNIQUE,
 stripe_subscription_id text UNIQUE,
 status text NOT NULL DEFAULT 'inactive'
  CHECK(status IN ('inactive','trialing','active','past_due','canceled')),
 current_period_end timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.commerce_subscriptions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.commerce_subscriptions FROM PUBLIC,anon,authenticated;

-- Aucune RPC publique pouvant appeler commerce_receipts ni augmenter des
-- crédits. Le paiement sera traité uniquement par un Edge Function privé
-- vérifiant une signature Stripe et un event_id idempotent.
COMMIT;
