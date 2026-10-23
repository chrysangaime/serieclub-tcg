-- SériesClubTCG V1.0 — droits des joueurs et modération basique.
-- Additif, aucune suppression de compte ni d'inventaire dans cette migration.
BEGIN;
-- Un acheteur peut fermer son compte sans effacer l'annonce d'un autre vendeur.
-- Son identifiant acheteur est effacé de l'historique conservé.
ALTER TABLE public.card_listings DROP CONSTRAINT IF EXISTS card_listings_buyer_id_fkey;
ALTER TABLE public.card_listings ADD CONSTRAINT card_listings_buyer_id_fkey
 FOREIGN KEY (buyer_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.export_my_account_data()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE uid uuid:=auth.uid();
BEGIN
 IF uid IS NULL OR NOT EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=uid) THEN
  RAISE EXCEPTION 'Connexion nécessaire';
 END IF;
 RETURN jsonb_build_object(
  'generated_at',now(),
  'account_id',uid,
  'profile',(SELECT to_jsonb(p) FROM public.profiles p WHERE p.id=uid),
  'wallet',(SELECT to_jsonb(w) FROM public.player_wallets w WHERE w.player_id=uid),
  'cards',(SELECT coalesce(jsonb_agg(to_jsonb(c) ORDER BY c.obtained_at),'[]'::jsonb) FROM public.player_cards c WHERE c.owner_id=uid),
  'wishlist',(SELECT coalesce(jsonb_agg(to_jsonb(w)),'[]'::jsonb) FROM public.player_wishlist w WHERE w.owner_id=uid),
  'albums',(SELECT coalesce(jsonb_agg(to_jsonb(a)),'[]'::jsonb) FROM public.player_albums a WHERE a.owner_id=uid),
  'album_targets',(SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) FROM public.player_album_targets t JOIN public.player_albums a ON a.id=t.album_id WHERE a.owner_id=uid),
  'album_cards',(SELECT coalesce(jsonb_agg(to_jsonb(ac)),'[]'::jsonb) FROM public.player_album_cards ac JOIN public.player_albums a ON a.id=ac.album_id WHERE a.owner_id=uid),
  'follows',(SELECT coalesce(jsonb_agg(to_jsonb(f)),'[]'::jsonb) FROM public.player_follows f WHERE f.follower_id=uid OR f.followed_id=uid),
  'trades',(SELECT coalesce(jsonb_agg(to_jsonb(o)),'[]'::jsonb) FROM public.card_trade_offers o
   LEFT JOIN public.card_listings l ON l.id=o.listing_id WHERE o.proposer_id=uid OR l.seller_id=uid),
  'listings',(SELECT coalesce(jsonb_agg(to_jsonb(l)),'[]'::jsonb) FROM public.card_listings l WHERE l.seller_id=uid OR l.buyer_id=uid),
  'transactions',(SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) FROM public.game_transactions t WHERE t.player_id=uid),
  'season_claims',(SELECT coalesce(jsonb_agg(to_jsonb(c)),'[]'::jsonb) FROM public.official_season_claims c WHERE c.player_id=uid),
  'tracked_seasons',(SELECT coalesce(jsonb_agg(to_jsonb(s)),'[]'::jsonb) FROM public.player_tracked_seasons s WHERE s.owner_id=uid),
  'quest_claims',(SELECT coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) FROM public.player_quest_claims q WHERE q.player_id=uid),
  'invite_code',(SELECT to_jsonb(i) FROM public.player_invite_codes i WHERE i.owner_id=uid),
  'recycle_history',(SELECT coalesce(jsonb_agg(to_jsonb(d)),'[]'::jsonb) FROM public.player_recycle_daily d WHERE d.player_id=uid)
 );
END $$;
REVOKE ALL ON FUNCTION public.export_my_account_data() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.export_my_account_data() TO authenticated;

-- Signalements conservés dans une table NON lisible par les joueurs.
CREATE TABLE IF NOT EXISTS public.player_reports (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 reporter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 target_type text NOT NULL CHECK(target_type IN ('player','listing','series')),
 target_ref text NOT NULL CHECK(length(target_ref) BETWEEN 1 AND 48),
 reason text NOT NULL CHECK(reason IN ('abuse','fraud','offensive','copyright','other')),
 details text NOT NULL CHECK(length(details) BETWEEN 15 AND 600),
 status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','reviewing','resolved','rejected')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sc1_reports_recent ON public.player_reports(reporter_id,created_at DESC);
CREATE INDEX IF NOT EXISTS sc1_reports_queue ON public.player_reports(status,created_at);
ALTER TABLE public.player_reports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.player_reports FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.submit_player_report(
 p_target_type text,p_target_ref text,p_reason text,p_details text
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE uid uuid:=auth.uid();ticket uuid;target_uuid uuid;target_show bigint;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Connexion nécessaire';END IF;
 IF p_target_type NOT IN ('player','listing','series')
  OR p_reason NOT IN ('abuse','fraud','offensive','copyright','other')
  OR p_target_ref IS NULL OR length(p_target_ref)>48
  OR p_details IS NULL OR length(trim(p_details)) NOT BETWEEN 15 AND 600 THEN
  RAISE EXCEPTION 'Signalement incomplet';
 END IF;
 PERFORM 1 FROM public.profiles WHERE id=uid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Profil requis';END IF;
 IF (SELECT count(*) FROM public.player_reports
     WHERE reporter_id=uid AND created_at>now()-interval '24 hours')>=5 THEN
   RAISE EXCEPTION 'Limite de cinq signalements par 24 h atteinte';
 END IF;
 IF p_target_type IN ('player','listing') THEN
  IF trim(p_target_ref)!~*'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
   RAISE EXCEPTION 'Identifiant de signalement invalide';
  END IF;
  target_uuid:=trim(p_target_ref)::uuid;
  IF p_target_type='player' THEN
   IF target_uuid=uid OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=target_uuid) THEN
    RAISE EXCEPTION 'Profil non signalable';END IF;
  ELSIF NOT EXISTS(SELECT 1 FROM public.card_listings WHERE id=target_uuid) THEN
   RAISE EXCEPTION 'Annonce introuvable';END IF;
 ELSE
  IF trim(p_target_ref)!~'^[0-9]{1,15}$' THEN RAISE EXCEPTION 'Série invalide';END IF;
  target_show:=trim(p_target_ref)::bigint;
  IF NOT EXISTS(SELECT 1 FROM public.series WHERE id=target_show) THEN
   RAISE EXCEPTION 'Série introuvable';END IF;
 END IF;
 INSERT INTO public.player_reports(reporter_id,target_type,target_ref,reason,details)
 VALUES(uid,p_target_type,trim(p_target_ref),p_reason,trim(p_details)) RETURNING id INTO ticket;
 RETURN ticket;
END $$;
REVOKE ALL ON FUNCTION public.submit_player_report(text,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.submit_player_report(text,text,text,text) TO authenticated;
COMMIT;
