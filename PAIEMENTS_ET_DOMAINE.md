# SérieClub V16 — déploiement du paiement en mode test

Le produit Stripe Premium test a été créé à 1,99 € par mois.
Prix test : price_1UTIAGAnJaPjYT5O5dD6CVlG.
AUCUN paiement réel n'est activé. Les crédits achetables restent désactivés (cartes aléatoires et échangeables).

Installation obligatoire dans Supabase :
1. Exécuter supabase/game_v10_commerce_ready.sql si non exécuté, puis supabase/game_v16_premium_stripe.sql.
2. Déployer stripe-checkout, stripe-webhook et stripe-portal via Supabase Functions, avec --no-verify-jwt (l'identité est vérifiée explicitement dans les fonctions).
3. Définir dans les secrets Supabase, jamais GitHub : STRIPE_SECRET_KEY (sk_test...), STRIPE_PRICE_PREMIUM_MONTHLY=price_1UTIAGAnJaPjYT5O5dD6CVlG, STRIPE_WEBHOOK_SECRET (whsec...), PUBLIC_SITE_URL=https://chrysangaime.github.io/serieclub-tcg et PREMIUM_TEST_ENABLED=true.
4. Enregistrer le webhook Stripe https://anjfidksqbqlaggttdop.supabase.co/functions/v1/stripe-webhook, avec checkout.session.completed et customer.subscription.created/updated/deleted.
5. Configurer le Customer Portal Stripe, tester un paiement fictif, l'activation, la résiliation et les doublons.
6. Mode live : jamais avant vérification juridique (marque SérieClub existante chez M6, droits des affiches, JONUM/crédits, CGV, TVA), compte professionnel Stripe validé et prix live distinct.

Domaine : un .fr ou .net n'est pas gratuitement enregistrable/renouvelable de façon garantie. Cloudflare Pages propose une adresse gratuite *.pages.dev, via connexion au dépôt GitHub. Le domaine public n'est pas secret si le dépôt reste public.
