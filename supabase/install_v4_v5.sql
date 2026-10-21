-- SérieClub TCG — V4+V5 : INSTALLATION EN UNE SEULE REQUÊTE SQL
-- Copier tout ce fichier dans Supabase SQL Editor (nouvelle requête).
-- Prérequis : schema.sql, game.sql, game_v2.sql, game_v3.sql.
-- Tout est transactionnel : une erreur annule V4 ET V5 dans cette exécution.
-- Attention : les raretés anciennes sont uniformisées ; seules les annonces
-- concernées par un changement de rareté sont clôturées.
BEGIN;

-- V4 : MARCHÉ ET ÉCHANGES
-- SérieClub V4 — Marché P2P et transferts atomiques.
-- Prérequis : schema.sql, game.sql, game_v2.sql et game_v3.sql.
-- Les crédits sont strictement virtuels, non achetables et non retirables.

create table if not exists public.card_listings (
 id uuid primary key default gen_random_uuid(),
 seller_id uuid not null references public.profiles(id) on delete cascade,
 card_id uuid not null references public.player_cards(id) on delete cascade,
 price integer not null check(price between 10 and 50000),
 status text not null default 'active' check(status in ('active','sold','cancelled','traded')),
 buyer_id uuid references public.profiles(id),
 created_at timestamptz not null default now(),
 closed_at timestamptz,
 constraint sc_no_self_buy check (buyer_id is null or buyer_id<>seller_id)
);
create unique index if not exists sc_listing_card_active on public.card_listings(card_id) where status='active';
create index if not exists sc_listing_recent on public.card_listings(created_at desc) where status='active';
create index if not exists sc_listing_seller on public.card_listings(seller_id,created_at desc);

create table if not exists public.card_trade_offers (
 id uuid primary key default gen_random_uuid(),
 listing_id uuid not null references public.card_listings(id) on delete cascade,
 proposer_id uuid not null references public.profiles(id) on delete cascade,
 offered_card_id uuid not null references public.player_cards(id) on delete cascade,
 status text not null default 'pending'
   check(status in ('pending','accepted','declined','cancelled')),
 created_at timestamptz not null default now(),
 closed_at timestamptz
);
create unique index if not exists sc_one_offer_per_listing on public.card_trade_offers(listing_id,proposer_id) where status='pending';
create index if not exists sc_trade_created on public.card_trade_offers(created_at desc);
create index if not exists sc_trade_proposer on public.card_trade_offers(proposer_id,status);

alter table public.player_cards add column if not exists reserved_trade_id uuid;

alter table public.card_listings enable row level security;
alter table public.card_trade_offers enable row level security;
drop policy if exists "Read visible card listings" on public.card_listings;
create policy "Read visible card listings" on public.card_listings for select to authenticated
 using (status='active' or seller_id=auth.uid() or buyer_id=auth.uid());
drop policy if exists "Read own trade negotiations" on public.card_trade_offers;
create policy "Read own trade negotiations" on public.card_trade_offers for select to authenticated
 using(proposer_id=auth.uid() or exists (
   select 1 from public.card_listings l
   where l.id=listing_id and l.seller_id=auth.uid()
 ));
-- Aucun INSERT/UPDATE/DELETE direct pour les listes et échanges.
revoke all on public.card_listings from anon,authenticated;
revoke all on public.card_trade_offers from anon,authenticated;
grant select on public.card_listings to authenticated;
grant select on public.card_trade_offers to authenticated;

-- La protection manuelle est indépendante d'une réservation ou d'une vente.
create or replace function public.set_card_locked(p_card_id uuid,p_locked boolean)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid(); c record;
begin
 if uid is null then raise exception 'Connexion requise'; end if;
 select id,locked,reserved_trade_id into c from public.player_cards
 where id=p_card_id and owner_id=uid for update;
 if not found then raise exception 'Carte inaccessible'; end if;
 if c.reserved_trade_id is not null or exists (
  select 1 from public.card_listings l where l.card_id=p_card_id and l.status='active'
 ) then raise exception 'Carte engagée sur le marché ou dans un échange'; end if;
 update public.player_cards set locked=p_locked where id=p_card_id and owner_id=uid;
 return true;
end $$;

create or replace function public.create_card_listing(p_card_id uuid,p_price integer)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid(); lid uuid; c record;
begin
 if uid is null or not exists(select 1 from public.profiles where id=uid) then
  raise exception 'Compte joueur requis'; end if;
 if p_price is null or p_price<10 or p_price>50000 then
  raise exception 'Prix autorisé : de 10 à 50 000 crédits'; end if;
 -- Limite d'annonces sérialisée pour éviter deux créations simultanées.
 perform 1 from public.profiles where id=uid for update;
 -- Bloquer la carte avant toute vérification de disponibilité.
 select id,locked,reserved_trade_id into c from public.player_cards
 where id=p_card_id and owner_id=uid for update;
 if not found then raise exception 'Cette carte ne t’appartient pas'; end if;
 if c.locked or c.reserved_trade_id is not null then raise exception 'Cette carte est protégée ou réservée'; end if;
 if exists(select 1 from public.card_listings where card_id=p_card_id and status='active') then
  raise exception 'Carte déjà en vente'; end if;
 if (select count(*) from public.card_listings where seller_id=uid and status='active')>=12 then
  raise exception 'Maximum de 12 annonces actives'; end if;
 insert into public.card_listings(seller_id,card_id,price) values(uid,p_card_id,p_price) returning id into lid;
 return lid;
end $$;

create or replace function public.cancel_card_listing(p_listing_id uuid)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid(); l record;
begin
 if uid is null then raise exception 'Connexion requise'; end if;
 select id,seller_id,status into l from public.card_listings where id=p_listing_id for update;
 if not found or l.seller_id<>uid then raise exception 'Annonce introuvable'; end if;
 if l.status<>'active' then raise exception 'Annonce déjà clôturée'; end if;
 update public.card_listings set status='cancelled',closed_at=now() where id=l.id;
 update public.player_cards c set reserved_trade_id=null
 where c.reserved_trade_id in (
  select o.id from public.card_trade_offers o
  where o.listing_id=l.id and o.status='pending'
 );
 update public.card_trade_offers set status='declined',closed_at=now()
 where listing_id=l.id and status='pending';
 return true;
end $$;

create or replace function public.buy_card_listing(p_listing_id uuid)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid(); l record; buyer_balance bigint; moved_id uuid;
begin
 if uid is null or not exists(select 1 from public.profiles where id=uid) then
  raise exception 'Profil requis'; end if;
 -- Une seule transaction concurrente peut conclure cette annonce.
 select * into l from public.card_listings where id=p_listing_id for update;
 if not found or l.status<>'active' then raise exception 'Annonce indisponible'; end if;
 if l.seller_id=uid then raise exception 'Impossible d’acheter sa propre carte'; end if;
 insert into public.player_wallets(player_id) values(uid) on conflict(player_id) do nothing;
 insert into public.player_wallets(player_id) values(l.seller_id) on conflict(player_id) do nothing;
 -- Ordre déterministe pour éviter les interblocages entre acheteurs/vendeurs.
 perform 1 from public.player_wallets where player_id in (uid,l.seller_id)
 order by player_id for update;
 select credits into buyer_balance from public.player_wallets where player_id=uid;
 if buyer_balance<l.price then raise exception 'Crédits insuffisants'; end if;
 update public.player_cards set owner_id=uid,locked=false,reserved_trade_id=null
 where id=l.card_id and owner_id=l.seller_id and not locked and reserved_trade_id is null
 returning id into moved_id;
 if moved_id is null then raise exception 'Carte devenue indisponible'; end if;
 update public.player_wallets set credits=credits-l.price where player_id=uid;
 update public.player_wallets set credits=credits+l.price where player_id=l.seller_id;
 update public.card_listings set status='sold',buyer_id=uid,closed_at=now() where id=l.id;
 update public.player_cards c set reserved_trade_id=null where c.reserved_trade_id in (
  select o.id from public.card_trade_offers o
  where o.listing_id=l.id and o.status='pending'
 );
 update public.card_trade_offers set status='declined',closed_at=now()
 where listing_id=l.id and status='pending';
 insert into public.game_transactions(player_id,kind,amount)
 values (uid,'market_buy',-l.price),(l.seller_id,'market_sell',l.price);
 return moved_id;
end $$;

create or replace function public.propose_card_trade(p_listing_id uuid,p_offered_card_id uuid)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid(); l record; c record; offer_id uuid;
begin
 if uid is null then raise exception 'Connexion requise'; end if;
 -- Sérialise le quota de propositions entre onglets.
 perform 1 from public.profiles where id=uid for update;
 -- SHARE empêche vente et annulation simultanées.
 select id,seller_id,status into l from public.card_listings where id=p_listing_id for share;
 if not found or l.status<>'active' then raise exception 'Annonce clôturée'; end if;
 if l.seller_id=uid then raise exception 'Impossible d’échanger avec soi-même'; end if;
 select id,locked,reserved_trade_id into c from public.player_cards
 where id=p_offered_card_id and owner_id=uid for update;
 if not found or c.locked or c.reserved_trade_id is not null then
  raise exception 'Carte proposée indisponible ou protégée'; end if;
 if exists(select 1 from public.card_listings where card_id=c.id and status='active') then
  raise exception 'Retire cette carte du marché avant de la proposer'; end if;
 if (select count(*) from public.card_trade_offers where proposer_id=uid and status='pending')>=8 then
  raise exception 'Maximum de 8 propositions en cours'; end if;
 insert into public.card_trade_offers(listing_id,proposer_id,offered_card_id)
 values(l.id,uid,c.id) returning id into offer_id;
 update public.player_cards set reserved_trade_id=offer_id where id=c.id;
 return offer_id;
end $$;

create or replace function public.respond_card_trade(p_offer_id uuid,p_accept boolean)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid(); l record; o record; offered record; listed record; listing_key uuid;
begin
 if uid is null then raise exception 'Connexion requise'; end if;
 if p_accept is null then raise exception 'Réponse invalide'; end if;
 -- Trouver l'annonce sans verrou préalable, puis verrouiller annonce et offre dans cet ordre.
 select t.listing_id into listing_key from public.card_trade_offers t where t.id=p_offer_id;
 if not found then raise exception 'Proposition introuvable'; end if;
 select * into l from public.card_listings where id=listing_key for update;
 select * into o from public.card_trade_offers where id=p_offer_id for update;
 if o.status<>'pending' then raise exception 'Proposition déjà traitée'; end if;
 if uid<>l.seller_id and uid<>o.proposer_id then raise exception 'Accès interdit'; end if;
 if uid=o.proposer_id and p_accept then raise exception 'Seul le vendeur peut accepter'; end if;
 if not p_accept then
  update public.card_trade_offers set status=case when uid=o.proposer_id then 'cancelled' else 'declined' end,
  closed_at=now() where id=o.id;
  update public.player_cards set reserved_trade_id=null
  where id=o.offered_card_id and owner_id=o.proposer_id and reserved_trade_id=o.id;
  return true;
 end if;
 if l.status<>'active' then raise exception 'Annonce indisponible'; end if;
 select * into listed from public.player_cards where id=l.card_id for update;
 select * into offered from public.player_cards where id=o.offered_card_id for update;
 if listed.id is null or offered.id is null
    or listed.owner_id is distinct from l.seller_id or listed.locked or listed.reserved_trade_id is not null
    or offered.owner_id is distinct from o.proposer_id or offered.locked
    or offered.reserved_trade_id is distinct from o.id then
   raise exception 'Une des cartes a changé de statut'; end if;
 update public.player_cards set owner_id=o.proposer_id,locked=false where id=l.card_id;
 update public.player_cards set owner_id=l.seller_id,locked=false,reserved_trade_id=null where id=o.offered_card_id;
 update public.card_listings set status='traded',buyer_id=o.proposer_id,closed_at=now() where id=l.id;
 update public.card_trade_offers set status='accepted',closed_at=now() where id=o.id;
 update public.player_cards c set reserved_trade_id=null where c.reserved_trade_id in (
  select x.id from public.card_trade_offers x where x.listing_id=l.id and x.id<>o.id and x.status='pending'
 );
 update public.card_trade_offers set status='declined',closed_at=now()
 where listing_id=l.id and id<>o.id and status='pending';
 insert into public.game_transactions(player_id,kind,amount)
 values(l.seller_id,'trade',0),(o.proposer_id,'trade',0);
 return true;
end $$;

-- Empêcher de fusionner une carte réservée ou mise en vente.
create or replace function public.fuse_cards(p_card_ids uuid[])
returns table(card_id uuid,series_id bigint,name text,image_url text,rarity text)
language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid(); source_rank text; target_rank text;
 ranks text[]:=array['Commune','Peu commune','Rare','Épique','Légendaire','Mythique','Unique'];
 idx integer; chosen record; new_id uuid; n integer; removed integer;
begin
 if uid is null then raise exception 'Connexion nécessaire'; end if;
 if p_card_ids is null or array_length(p_card_ids,1)<>10 or
    (select count(distinct v) from unnest(p_card_ids) v)<>10 then
  raise exception 'Sélectionne dix cartes distinctes'; end if;
 perform 1 from public.player_wallets where player_id=uid for update;
 -- Verrouiller les dix cartes pendant le contrôle ET la suppression.
 perform 1 from public.player_cards c
 where c.id=any(p_card_ids) and c.owner_id=uid order by c.id for update;
 select count(*),min(c.rarity) into n,source_rank from public.player_cards c
 where c.id=any(p_card_ids) and c.owner_id=uid and not c.locked
 and c.reserved_trade_id is null
 and not exists(select 1 from public.card_listings l where l.card_id=c.id and l.status='active');
 if n<>10 then raise exception 'Une carte est protégée, en vente ou engagée dans un échange'; end if;
 if (select count(distinct c.rarity) from public.player_cards c
    where c.id=any(p_card_ids))<>1 then raise exception 'Les cartes doivent avoir la même rareté'; end if;
 idx:=array_position(ranks,source_rank);
 if idx is null or idx>=7 then raise exception 'Fusion indisponible pour cette rareté'; end if;
 target_rank:=ranks[idx+1];
 select s.id as sid,s.name as title,s.image_url as poster into chosen
 from public.series s where s.image_url is not null order by random() limit 1;
 if chosen.sid is null then raise exception 'Catalogue non synchronisé'; end if;
 delete from public.player_cards c where c.id=any(p_card_ids) and c.owner_id=uid
 and not c.locked and c.reserved_trade_id is null;
 get diagnostics removed=row_count;
 if removed<>10 then raise exception 'Impossible de consommer les dix cartes'; end if;
 insert into public.player_cards(owner_id,series_id,rarity)
 values(uid,chosen.sid,target_rank) returning id into new_id;
 update public.player_wallets set fusion_count=fusion_count+1,experience=experience+100 where player_id=uid;
 insert into public.game_transactions(player_id,kind,amount) values(uid,'fusion',0);
 card_id:=new_id;series_id:=chosen.sid;name:=chosen.title;image_url:=chosen.poster;rarity:=target_rank;
 return next;
end $$;

-- Les fonctions ne sont accessibles qu'aux comptes authentifiés.
revoke all on function public.create_card_listing(uuid,integer) from public;
revoke all on function public.cancel_card_listing(uuid) from public;
revoke all on function public.buy_card_listing(uuid) from public;
revoke all on function public.propose_card_trade(uuid,uuid) from public;
revoke all on function public.respond_card_trade(uuid,boolean) from public;
grant execute on function public.create_card_listing(uuid,integer) to authenticated;
grant execute on function public.cancel_card_listing(uuid) to authenticated;
grant execute on function public.buy_card_listing(uuid) to authenticated;
grant execute on function public.propose_card_trade(uuid,uuid) to authenticated;
grant execute on function public.respond_card_trade(uuid,boolean) to authenticated;

-- Le client ne peut pas lire l'inventaire privé des autres joueurs.
-- Seules les annonces volontairement publiées exposent ici leurs données.
create or replace function public.marketplace_feed()
returns table(
 listing_id uuid,seller_id uuid,seller_username text,card_id uuid,
 series_id bigint,series_name text,image_url text,rarity text,
 price integer,created_at timestamptz
) language sql security definer set search_path=public,pg_temp as $$
 select l.id,l.seller_id,p.username,l.card_id,c.series_id,s.name,s.image_url,c.rarity,
  l.price,l.created_at
 from public.card_listings l
 join public.player_cards c on c.id=l.card_id and c.owner_id=l.seller_id
 join public.series s on s.id=c.series_id
 join public.profiles p on p.id=l.seller_id
 where l.status='active'
 order by l.created_at desc limit 80;
$$;

create or replace function public.my_marketplace_activity()
returns table(listing_id uuid,seller_id uuid,card_id uuid,series_name text,rarity text,
 price integer,status text,created_at timestamptz,closed_at timestamptz)
language sql security definer set search_path=public,pg_temp as $$
 select l.id,l.seller_id,l.card_id,s.name,c.rarity,l.price,l.status,l.created_at,l.closed_at
 from public.card_listings l
 join public.player_cards c on c.id=l.card_id
 join public.series s on s.id=c.series_id
 where l.seller_id=auth.uid() or l.buyer_id=auth.uid()
 order by l.created_at desc limit 80;
$$;

create or replace function public.my_trade_offers()
returns table(offer_id uuid,listing_id uuid,proposer_id uuid,seller_id uuid,
 proposer_username text,seller_username text,offered_card_id uuid,
 offered_name text,offered_image text,offered_rarity text,
 requested_name text,requested_image text,requested_rarity text,
 status text,created_at timestamptz)
language sql security definer set search_path=public,pg_temp as $$
 select o.id,o.listing_id,o.proposer_id,l.seller_id,p1.username,p2.username,o.offered_card_id,
  s1.name,s1.image_url,c1.rarity,
  s2.name,s2.image_url,c2.rarity,
  o.status,o.created_at
 from public.card_trade_offers o
 join public.card_listings l on l.id=o.listing_id
 join public.player_cards c1 on c1.id=o.offered_card_id
 join public.series s1 on s1.id=c1.series_id
 join public.player_cards c2 on c2.id=l.card_id
 join public.series s2 on s2.id=c2.series_id
 join public.profiles p1 on p1.id=o.proposer_id
 join public.profiles p2 on p2.id=l.seller_id
 where o.proposer_id=auth.uid() or l.seller_id=auth.uid()
 order by o.created_at desc limit 90;
$$;

revoke all on function public.marketplace_feed() from public;
revoke all on function public.my_marketplace_activity() from public;
revoke all on function public.my_trade_offers() from public;
grant execute on function public.marketplace_feed() to authenticated;
grant execute on function public.my_marketplace_activity() to authenticated;
grant execute on function public.my_trade_offers() to authenticated;


-- SérieClub V4 — communauté, profils publics légers et quêtes quotidiennes.
-- À exécuter après game_v4_market.sql. Pas de messagerie non modérée ouverte.

alter table public.profiles add column if not exists bio text not null default '';
alter table public.profiles add column if not exists favorite_genre text not null default '';
do $$ begin
 if not exists(select 1 from pg_constraint where conname='sc_profile_bio_length') then
  alter table public.profiles add constraint sc_profile_bio_length check(char_length(bio)<=160);
 end if;
 if not exists(select 1 from pg_constraint where conname='sc_profile_genre_length') then
  alter table public.profiles add constraint sc_profile_genre_length check(char_length(favorite_genre)<=32);
 end if;
end $$;

create table if not exists public.player_follows (
 follower_id uuid not null references public.profiles(id) on delete cascade,
 followed_id uuid not null references public.profiles(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(follower_id,followed_id),
 constraint sc_no_self_follow check(follower_id<>followed_id)
);
create index if not exists sc_follows_target on public.player_follows(followed_id);
alter table public.player_follows enable row level security;
drop policy if exists "Read own follows" on public.player_follows;
create policy "Read own follows" on public.player_follows for select to authenticated
 using(follower_id=auth.uid() or followed_id=auth.uid());
revoke all on public.player_follows from anon,authenticated;
grant select on public.player_follows to authenticated;

create or replace function public.toggle_player_follow(p_target uuid)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid();
begin
 if uid is null then raise exception 'Connexion nécessaire'; end if;
 if p_target=uid then raise exception 'Impossible de se suivre soi-même'; end if;
 if not exists(select 1 from public.profiles where id=p_target) then
  raise exception 'Joueur introuvable'; end if;
 -- Sérialise les toggles et limite les abonnements par joueur.
 perform 1 from public.profiles where id=uid for update;
 if exists(select 1 from public.player_follows
   where follower_id=uid and followed_id=p_target) then
  delete from public.player_follows where follower_id=uid and followed_id=p_target;
  return false;
 end if;
 if (select count(*) from public.player_follows where follower_id=uid)>=100 then
  raise exception 'Limite de 100 abonnements atteinte'; end if;
 insert into public.player_follows(follower_id,followed_id) values(uid,p_target);
 return true;
end $$;

create or replace function public.player_directory()
returns table(player_id uuid,username text,bio text,favorite_genre text,
 cards_count bigint,followers_count bigint,is_following boolean)
language sql security definer set search_path=public,pg_temp as $$
 select p.id,p.username,p.bio,p.favorite_genre,
  (select count(*) from public.player_cards c where c.owner_id=p.id)::bigint,
  (select count(*) from public.player_follows f where f.followed_id=p.id)::bigint,
  exists(select 1 from public.player_follows f
    where f.follower_id=auth.uid() and f.followed_id=p.id)
 from public.profiles p
 order by (select count(*) from public.player_cards c where c.owner_id=p.id) desc,
 p.created_at desc
 limit 40;
$$;
revoke all on function public.player_directory() from public;
grant execute on function public.player_directory() to authenticated;

create table if not exists public.player_quest_claims (
 id uuid primary key default gen_random_uuid(),
 player_id uuid not null references public.profiles(id) on delete cascade,
 quest_day date not null,
 quest_key text not null check(quest_key in ('pack1','pack3')),
 credits_awarded integer not null check(credits_awarded between 1 and 500),
 claimed_at timestamptz not null default now(),
 unique(player_id,quest_day,quest_key)
);
create index if not exists sc_quest_claim_history on public.player_quest_claims(player_id,quest_day desc);
alter table public.player_quest_claims enable row level security;
drop policy if exists "Read personal quests" on public.player_quest_claims;
create policy "Read personal quests" on public.player_quest_claims for select to authenticated
 using(player_id=auth.uid());
revoke all on public.player_quest_claims from anon,authenticated;
grant select on public.player_quest_claims to authenticated;

create or replace function public.claim_quest_reward(p_quest_key text)
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid(); paris_day date;
 threshold integer; bonus integer; done_count bigint;
 start_at timestamptz; end_at timestamptz; claim_id uuid;
begin
 if uid is null then raise exception 'Connexion nécessaire'; end if;
 if p_quest_key='pack1' then threshold:=1;bonus:=35;
 elsif p_quest_key='pack3' then threshold:=3;bonus:=100;
 else raise exception 'Quête inconnue';end if;
 if not exists(select 1 from public.profiles where id=uid) then
  raise exception 'Profil requis'; end if;
 perform 1 from public.player_wallets where player_id=uid for update;
 if not found then
  insert into public.player_wallets(player_id) values(uid)
  on conflict(player_id) do nothing;
  perform 1 from public.player_wallets where player_id=uid for update;
 end if;
 paris_day:=(now() at time zone 'Europe/Paris')::date;
 start_at:=paris_day::timestamp at time zone 'Europe/Paris';
 end_at:=(paris_day+1)::timestamp at time zone 'Europe/Paris';
 select count(*) into done_count from public.game_transactions t
 where t.player_id=uid and t.kind in ('booster','halloween')
 and t.created_at>=start_at and t.created_at<end_at;
 if done_count<threshold then raise exception 'Objectif non atteint : % paquets sur %',done_count,threshold; end if;
 insert into public.player_quest_claims(player_id,quest_day,quest_key,credits_awarded)
 values(uid,paris_day,p_quest_key,bonus)
 on conflict(player_id,quest_day,quest_key) do nothing returning id into claim_id;
 if claim_id is null then raise exception 'Cette quête a déjà été récompensée aujourd’hui'; end if;
 update public.player_wallets set credits=credits+bonus,experience=experience+bonus
 where player_id=uid;
 insert into public.game_transactions(player_id,kind,amount)
 values(uid,'quest_'||p_quest_key,bonus);
 return bonus;
end $$;
revoke all on function public.toggle_player_follow(uuid) from public;
revoke all on function public.claim_quest_reward(text) from public;
grant execute on function public.toggle_player_follow(uuid) to authenticated;
grant execute on function public.claim_quest_reward(text) to authenticated;

-- Lecture personnelle de la progression : transactions et récompenses sont sous RLS.

create or replace function public.get_daily_progress()
returns table(packs_today bigint,pack1_claimed boolean,pack3_claimed boolean,reset_at timestamptz)
language sql security definer set search_path=public,pg_temp as $$
 with d as (
  select (now() at time zone 'Europe/Paris')::date as local_day
 )
 select (
   select count(*)::bigint from public.game_transactions t
   where t.player_id=auth.uid() and t.kind in ('booster','halloween')
   and t.created_at>=((d.local_day)::timestamp at time zone 'Europe/Paris')
   and t.created_at<((d.local_day+1)::timestamp at time zone 'Europe/Paris')
 ),
 exists(
   select 1 from public.player_quest_claims q
   where q.player_id=auth.uid() and q.quest_day=d.local_day and q.quest_key='pack1'
 ),
 exists(
   select 1 from public.player_quest_claims q
   where q.player_id=auth.uid() and q.quest_day=d.local_day and q.quest_key='pack3'
 ),
 ((d.local_day+1)::timestamp at time zone 'Europe/Paris')
 from d;
$$;
revoke all on function public.get_daily_progress() from public;
grant execute on function public.get_daily_progress() to authenticated;

-- Albums personnels SérieClub : chaque joueur compose ses propres "saisons".
create table if not exists public.player_albums (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references public.profiles(id) on delete cascade,
 title text not null check(char_length(title) between 3 and 48),
 description text not null default '' check(char_length(description)<=160),
 visibility text not null default 'private' check(visibility in ('private','public')),
 created_at timestamptz not null default now()
);
create index if not exists sc_album_owner on public.player_albums(owner_id,created_at desc);
create table if not exists public.player_album_cards(
 album_id uuid not null references public.player_albums(id) on delete cascade,
 card_id uuid not null references public.player_cards(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(album_id,card_id)
);
create index if not exists sc_album_card_id on public.player_album_cards(card_id);
alter table public.player_albums enable row level security;
alter table public.player_album_cards enable row level security;
drop policy if exists "Read published and own albums" on public.player_albums;
create policy "Read published and own albums" on public.player_albums for select to authenticated
 using(owner_id=auth.uid() or visibility='public');
drop policy if exists "Read visible album contents" on public.player_album_cards;
create policy "Read visible album contents" on public.player_album_cards for select to authenticated
 using(exists(select 1 from public.player_albums a
  where a.id=album_id and (a.owner_id=auth.uid() or a.visibility='public')));
revoke all on public.player_albums from anon,authenticated;
revoke all on public.player_album_cards from anon,authenticated;
grant select on public.player_albums,public.player_album_cards to authenticated;

create or replace function public.create_personal_album(p_title text,p_description text default '',p_public boolean default false)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid(); aid uuid;
begin
 if uid is null then raise exception 'Connexion requise';end if;
 if p_title is null or char_length(trim(p_title)) not between 3 and 48 then
  raise exception 'Titre de 3 à 48 caractères requis';end if;
 if char_length(coalesce(p_description,''))>160 then
  raise exception 'Description limitée à 160 caractères';end if;
 perform 1 from public.profiles where id=uid for update;
 if not found then raise exception 'Profil requis';end if;
 if (select count(*) from public.player_albums where owner_id=uid)>=20 then
  raise exception 'Maximum de 20 albums personnels';end if;
 insert into public.player_albums(owner_id,title,description,visibility)
 values(uid,trim(p_title),coalesce(trim(p_description),''),case when p_public then 'public' else 'private' end)
 returning id into aid;
 return aid;
end $$;

create or replace function public.delete_personal_album(p_album_id uuid)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid(); removed integer;
begin
 if uid is null then raise exception 'Connexion requise';end if;
 delete from public.player_albums where id=p_album_id and owner_id=uid;
 get diagnostics removed=row_count;
 if removed<>1 then raise exception 'Album introuvable ou inaccessible';end if;
 return true;
end $$;

create or replace function public.add_card_to_album(p_album_id uuid,p_card_id uuid)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid(); a record; c record;
begin
 if uid is null then raise exception 'Connexion requise';end if;
 select id,owner_id into a from public.player_albums where id=p_album_id for update;
 if not found or a.owner_id<>uid then raise exception 'Album inaccessible';end if;
 select id,owner_id into c from public.player_cards where id=p_card_id for update;
 if not found or c.owner_id<>uid then raise exception 'La carte ne t’appartient pas';end if;
 if (select count(*) from public.player_album_cards where album_id=a.id)>=100 then
  raise exception 'Maximum de 100 cartes par album';end if;
 insert into public.player_album_cards(album_id,card_id)
 values(a.id,c.id) on conflict(album_id,card_id) do nothing;
 return true;
end $$;

create or replace function public.remove_card_from_album(p_album_id uuid,p_card_id uuid)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid(); removed integer;
begin
 if uid is null then raise exception 'Connexion requise';end if;
 if not exists(select 1 from public.player_albums where id=p_album_id and owner_id=uid) then
  raise exception 'Album inaccessible';end if;
 delete from public.player_album_cards where album_id=p_album_id and card_id=p_card_id;
 get diagnostics removed=row_count;
 return removed>0;
end $$;

create or replace function public.my_personal_albums()
returns table(album_id uuid,title text,description text,visibility text,cards_count bigint,created_at timestamptz)
language sql security definer set search_path=public,pg_temp as $$
 select a.id,a.title,a.description,a.visibility,
  (select count(*) from public.player_album_cards ac
   join public.player_cards c on c.id=ac.card_id
   where ac.album_id=a.id and c.owner_id=a.owner_id)::bigint,
  a.created_at
 from public.player_albums a where a.owner_id=auth.uid()
 order by a.created_at desc limit 20;
$$;
create or replace function public.public_personal_albums()
returns table(album_id uuid,title text,username text,cards_count bigint,created_at timestamptz)
language sql security definer set search_path=public,pg_temp as $$
 select a.id,a.title,p.username,
  (select count(*) from public.player_album_cards ac
   join public.player_cards c on c.id=ac.card_id
   where ac.album_id=a.id and c.owner_id=a.owner_id)::bigint,
  a.created_at
 from public.player_albums a join public.profiles p on p.id=a.owner_id
 where a.visibility='public'
 order by a.created_at desc limit 30;
$$;
create or replace function public.album_card_data(p_album_id uuid)
returns table(card_id uuid,series_id bigint,series_name text,image_url text,rarity text)
language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid(); a record;
begin
 if uid is null then raise exception 'Connexion requise';end if;
 select id,owner_id,visibility into a from public.player_albums where id=p_album_id;
 if not found or (a.owner_id<>uid and a.visibility<>'public') then
  raise exception 'Album inaccessible';end if;
 return query
 select c.id,c.series_id,s.name,s.image_url,c.rarity from public.player_album_cards ac
 join public.player_cards c on c.id=ac.card_id and c.owner_id=a.owner_id
 join public.series s on s.id=c.series_id
 where ac.album_id=a.id order by ac.created_at desc limit 100;
end $$;

revoke all on function public.create_personal_album(text,text,boolean) from public;
revoke all on function public.delete_personal_album(uuid) from public;
revoke all on function public.add_card_to_album(uuid,uuid) from public;
revoke all on function public.remove_card_from_album(uuid,uuid) from public;
revoke all on function public.my_personal_albums() from public;
revoke all on function public.public_personal_albums() from public;
revoke all on function public.album_card_data(uuid) from public;
grant execute on function public.create_personal_album(text,text,boolean) to authenticated;
grant execute on function public.delete_personal_album(uuid) to authenticated;
grant execute on function public.add_card_to_album(uuid,uuid) to authenticated;
grant execute on function public.remove_card_from_album(uuid,uuid) to authenticated;
grant execute on function public.my_personal_albums() to authenticated;
grant execute on function public.public_personal_albums() to authenticated;
grant execute on function public.album_card_data(uuid) to authenticated;

-- V5 : UNE RARETÉ OFFICIELLE PAR SÉRIE
-- Préflight : ne pas démarrer la reclassification si la V4 manque.
-- Le diagnostic est volontairement explicite et la transaction reste atomique.
DO $$
BEGIN
 IF to_regclass('public.card_trade_offers') IS NULL
    OR to_regclass('public.card_listings') IS NULL
    OR NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='player_cards'
        AND column_name='reserved_trade_id'
    ) THEN
  RAISE EXCEPTION USING
    MESSAGE='SérieClub : migration V4 absente (marché ou échanges non créés).',
    HINT='Exécute d’abord supabase/game_v4.sql, puis relance game_v5.sql. Ou utilise le fichier install_v4_v5.sql.';
 END IF;
END $$;
ALTER TABLE public.series ADD COLUMN IF NOT EXISTS rarity text NOT NULL DEFAULT 'Commune';
ALTER TABLE public.series ADD COLUMN IF NOT EXISTS popularity_weight numeric(7,2);
ALTER TABLE public.series ADD COLUMN IF NOT EXISTS rating_average numeric(4,2);
ALTER TABLE public.series ADD COLUMN IF NOT EXISTS rarity_source text NOT NULL DEFAULT 'pending';
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='sc_series_rarity_check') THEN
  ALTER TABLE public.series ADD CONSTRAINT sc_series_rarity_check
  CHECK(rarity IN ('Commune','Peu commune','Rare','Épique','Légendaire','Mythique','Unique'));
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='sc_rarity_source_check') THEN
  ALTER TABLE public.series ADD CONSTRAINT sc_rarity_source_check
  CHECK(rarity_source IN ('pending','popularity','editorial','manual'));
 END IF;
END $$;
CREATE INDEX IF NOT EXISTS sc_series_rarity_index
 ON public.series(rarity,rarity_source) WHERE image_url IS NOT NULL;

-- Exceptions limitées AUX 3 SÉRIES DEMANDÉES.
-- Les années empêchent de classer un remake/homonyme par erreur.
CREATE OR REPLACE FUNCTION public.official_iconic_rarity(p_name text,p_premiered date)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path=public,pg_temp AS $$
 SELECT CASE
 WHEN lower(trim(p_name))='lost' AND
      extract(year FROM p_premiered) BETWEEN 2004 AND 2005 THEN 'Légendaire'
 WHEN lower(trim(p_name))='stranger things' AND
      extract(year FROM p_premiered) BETWEEN 2016 AND 2017 THEN 'Légendaire'
 WHEN lower(trim(p_name)) IN
    ('the x-files','the x files','x-files','x files','xfiles') AND
      extract(year FROM p_premiered) BETWEEN 1993 AND 1994 THEN 'Légendaire'
 ELSE NULL END;
$$;

-- Barème déterministe fondé sur le poids de popularité TVmaze (0 à 100).
-- La note artistique est conservée dans le catalogue, mais n'invente
-- ni audiences ni célébrité. Un rang est FIGÉ après classement.
CREATE OR REPLACE FUNCTION public.popularity_to_rarity(p_weight numeric)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path=public,pg_temp AS $$
 SELECT CASE
 WHEN p_weight>=99 THEN 'Unique'
 WHEN p_weight>=95 THEN 'Mythique'
 WHEN p_weight>=87 THEN 'Légendaire'
 WHEN p_weight>=75 THEN 'Épique'
 WHEN p_weight>=60 THEN 'Rare'
 WHEN p_weight>=40 THEN 'Peu commune'
 ELSE 'Commune' END;
$$;

CREATE OR REPLACE FUNCTION public.assign_series_official_rarity()
RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
DECLARE iconic text;
BEGIN
 iconic:=public.official_iconic_rarity(NEW.name,NEW.premiered);
 IF TG_OP='INSERT' THEN
  IF iconic IS NOT NULL THEN
   NEW.rarity:=iconic;
   NEW.rarity_source:='editorial';
  ELSE
   NEW.rarity:=public.popularity_to_rarity(NEW.popularity_weight);
   NEW.rarity_source:=CASE WHEN NEW.popularity_weight IS NULL
    THEN 'pending' ELSE 'popularity' END;
  END IF;
  RETURN NEW;
 END IF;
 -- OLD n'est consulté que pour une opération UPDATE.
 IF OLD.rarity_source='manual' THEN
  NEW.rarity:=OLD.rarity;NEW.rarity_source:='manual';
 ELSIF iconic IS NOT NULL THEN
  NEW.rarity:=iconic;NEW.rarity_source:='editorial';
 ELSIF OLD.rarity_source='pending' AND NEW.popularity_weight IS NOT NULL THEN
  NEW.rarity:=public.popularity_to_rarity(NEW.popularity_weight);
  NEW.rarity_source:='popularity';
 ELSE
  NEW.rarity:=OLD.rarity;NEW.rarity_source:=OLD.rarity_source;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS sc_assign_series_official_rarity ON public.series;
CREATE TRIGGER sc_assign_series_official_rarity
 BEFORE INSERT OR UPDATE OF name,premiered,popularity_weight,rating_average
 ON public.series FOR EACH ROW EXECUTE FUNCTION public.assign_series_official_rarity();

-- Premier classement : les titres sans score restent marqués 'pending'.
-- Ils ne peuvent pas être tirés avant le prochain import TVmaze.
UPDATE public.series s
 SET rarity=CASE WHEN public.official_iconic_rarity(s.name,s.premiered) IS NOT NULL
    THEN 'Légendaire'
    ELSE public.popularity_to_rarity(s.popularity_weight) END,
 rarity_source=CASE WHEN public.official_iconic_rarity(s.name,s.premiered) IS NOT NULL
    THEN 'editorial'
    WHEN s.popularity_weight IS NULL THEN 'pending'
    ELSE 'popularity' END
 WHERE s.rarity_source='pending'
   OR (s.rarity_source='editorial'
      AND public.official_iconic_rarity(s.name,s.premiered) IS NOT NULL);

-- Lors d'une reclassification : libérer les cartes en échange et annuler
-- les annonces qui concernaient une série dont le rang a changé.
CREATE OR REPLACE FUNCTION public.reclassify_owned_cards()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 -- Annuler les offres sur l'annonce impactée OU utilisant la carte impactée.
 UPDATE public.card_trade_offers o
 SET status='declined',closed_at=now()
 WHERE o.status='pending' AND (
   o.offered_card_id IN (SELECT c.id FROM public.player_cards c WHERE c.series_id=NEW.id)
   OR o.listing_id IN (
     SELECT l.id FROM public.card_listings l
     JOIN public.player_cards c ON c.id=l.card_id WHERE c.series_id=NEW.id
   )
 );
 -- Annuler uniquement les annonces de la série modifiée.
 UPDATE public.card_listings l SET status='cancelled',closed_at=now()
 WHERE l.status='active' AND l.card_id IN
   (SELECT c.id FROM public.player_cards c WHERE c.series_id=NEW.id);
 UPDATE public.player_cards c SET reserved_trade_id=NULL
 WHERE c.reserved_trade_id IN (SELECT o.id FROM public.card_trade_offers o
  WHERE o.status='declined' AND o.closed_at=now());
 UPDATE public.player_cards SET rarity=NEW.rarity WHERE series_id=NEW.id;
 RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS sc_sync_series_rarity ON public.series;
CREATE TRIGGER sc_sync_series_rarity
 AFTER UPDATE OF rarity ON public.series FOR EACH ROW
 WHEN (OLD.rarity IS DISTINCT FROM NEW.rarity)
 EXECUTE FUNCTION public.reclassify_owned_cards();

-- Anciennes cartes : ne clôturer QUE les transactions utilisant un
-- exemplaire dont la rareté va changer. Préserver les annonces sans rapport.
WITH changed_cards AS MATERIALIZED (
 SELECT c.id FROM public.player_cards c
 JOIN public.series s ON s.id=c.series_id
 WHERE c.rarity IS DISTINCT FROM s.rarity
), revoked AS (
 UPDATE public.card_trade_offers o
 SET status='declined',closed_at=now()
 WHERE o.status='pending' AND (
  o.offered_card_id IN (SELECT id FROM changed_cards)
  OR EXISTS (
   SELECT 1 FROM public.card_listings l
   WHERE l.id=o.listing_id AND l.card_id IN (SELECT id FROM changed_cards)
  )
 )
 RETURNING o.id
)
UPDATE public.player_cards c SET reserved_trade_id=NULL
WHERE c.reserved_trade_id IN (SELECT id FROM revoked);
UPDATE public.card_listings l SET status='cancelled',closed_at=now()
WHERE l.status='active' AND EXISTS (
 SELECT 1 FROM public.player_cards c
 JOIN public.series s ON s.id=c.series_id
 WHERE c.id=l.card_id AND c.rarity IS DISTINCT FROM s.rarity
);
UPDATE public.player_cards c SET rarity=s.rarity
FROM public.series s WHERE c.series_id=s.id AND c.rarity IS DISTINCT FROM s.rarity;

-- Même une ancienne RPC de tirage ne peut plus créer des versions multiples
-- d'une série : la BDD écrase le rang de l'exemplaire avec l'officiel.
CREATE OR REPLACE FUNCTION public.enforce_card_series_rarity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE official text;
BEGIN
 SELECT s.rarity INTO official FROM public.series s WHERE s.id=NEW.series_id;
 IF official IS NULL THEN RAISE EXCEPTION 'Série inconnue'; END IF;
 NEW.rarity:=official;RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS sc_enforce_card_series_rarity ON public.player_cards;
CREATE TRIGGER sc_enforce_card_series_rarity
 BEFORE INSERT OR UPDATE OF series_id,rarity ON public.player_cards
 FOR EACH ROW EXECUTE FUNCTION public.enforce_card_series_rarity();

-- Tirage par rang disponible puis série de ce rang.
-- Tirage aléatoire de la SÉRIE uniquement, pas de rareté de la carte.
-- Seules les séries définitivement classées sont éligibles.
CREATE OR REPLACE FUNCTION public.pick_official_pack(p_halloween boolean)
RETURNS TABLE(show_id bigint,show_name text,show_image text,show_rarity text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE
 used_ids bigint[]:=ARRAY[]::bigint[];
 rank_names text[]:=ARRAY['Commune','Peu commune','Rare','Épique','Légendaire','Mythique','Unique'];
 rank_weights numeric[]:=ARRAY[55,23,12,6,2.5,1.2,0.3];
 rank_position integer; pos integer; total numeric; running numeric;
 drawn numeric; chosen_rank text; chosen record;
BEGIN
 FOR pos IN 1..5 LOOP
  total:=0; chosen_rank:=NULL;
  FOR rank_position IN 1..7 LOOP
   IF EXISTS(SELECT 1 FROM public.series s
    WHERE s.rarity=rank_names[rank_position] AND s.rarity_source<>'pending'
     AND s.image_url IS NOT NULL AND NOT (s.id=ANY(used_ids))
     AND (NOT (p_halloween AND pos=1)
      OR s.genres&&ARRAY['Horror','Thriller','Supernatural']::text[])) THEN
    total:=total+rank_weights[rank_position];
   END IF;
  END LOOP;
  IF total<=0 THEN
   RAISE EXCEPTION 'Catalogue classé insuffisant : synchronise TVmaze';
  END IF;
  drawn:=random()*total;running:=0;
  FOR rank_position IN 1..7 LOOP
   IF EXISTS(SELECT 1 FROM public.series s
    WHERE s.rarity=rank_names[rank_position] AND s.rarity_source<>'pending'
     AND s.image_url IS NOT NULL AND NOT (s.id=ANY(used_ids))
     AND (NOT (p_halloween AND pos=1)
      OR s.genres&&ARRAY['Horror','Thriller','Supernatural']::text[])) THEN
    running:=running+rank_weights[rank_position];
    IF drawn<running THEN chosen_rank:=rank_names[rank_position];EXIT;END IF;
   END IF;
  END LOOP;
  IF chosen_rank IS NULL THEN RAISE EXCEPTION 'Tirage impossible'; END IF;
  SELECT s.id AS sid,s.name AS title,s.image_url AS artwork,s.rarity AS official
   INTO chosen FROM public.series s
  WHERE s.rarity=chosen_rank AND s.rarity_source<>'pending'
   AND s.image_url IS NOT NULL AND NOT(s.id=ANY(used_ids))
   AND (NOT (p_halloween AND pos=1)
    OR s.genres&&ARRAY['Horror','Thriller','Supernatural']::text[])
  ORDER BY random() LIMIT 1;
  IF chosen.sid IS NULL THEN RAISE EXCEPTION 'Série indisponible';END IF;
  used_ids:=array_append(used_ids,chosen.sid);
  show_id:=chosen.sid;show_name:=chosen.title;
  show_image:=chosen.artwork;show_rarity:=chosen.official;
  RETURN NEXT;
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.pick_official_pack(boolean) FROM PUBLIC;

-- Booster classique : le serveur renvoie exactement le rang fixé sur la série.
CREATE OR REPLACE FUNCTION public.open_starter_booster()
RETURNS TABLE(card_id uuid,series_id bigint,name text,image_url text,rarity text,
 credits bigint,experience bigint,next_booster_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE
 uid uuid:=auth.uid(); w public.player_wallets%rowtype;
 selected record; new_id uuid;n integer:=0;
 steps integer;available integer;base_at timestamptz;now_at timestamptz:=now();
BEGIN
 IF uid IS NULL OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=uid)
 THEN RAISE EXCEPTION 'Profil requis';END IF;
 INSERT INTO public.player_wallets(player_id) VALUES(uid)
 ON CONFLICT(player_id) DO NOTHING;
 SELECT * INTO w FROM public.player_wallets WHERE player_id=uid FOR UPDATE;
 steps:=greatest(0,floor(extract(epoch FROM(now_at-w.booster_anchor))/600)::integer);
 available:=least(10,w.booster_stock+steps);
 IF available<1 THEN RAISE EXCEPTION 'Réserve vide';END IF;
 base_at:=CASE WHEN available=10 THEN now_at
 ELSE w.booster_anchor+make_interval(secs=>steps*600) END;
 FOR selected IN SELECT * FROM public.pick_official_pack(false) LOOP
  INSERT INTO public.player_cards(owner_id,series_id,rarity)
   VALUES(uid,selected.show_id,selected.show_rarity) RETURNING id INTO new_id;
  n:=n+1;
  card_id:=new_id;series_id:=selected.show_id;name:=selected.show_name;
  image_url:=selected.show_image;rarity:=selected.show_rarity;
  credits:=w.credits+25;experience:=w.experience+50;
  next_booster_at:=CASE WHEN available=1 THEN base_at+interval '10 minutes' ELSE now_at END;
  RETURN NEXT;
 END LOOP;
 IF n<>5 THEN RAISE EXCEPTION 'Paquet incomplet';END IF;
 UPDATE public.player_wallets SET booster_stock=available-1,
  booster_anchor=base_at,last_booster_at=now_at,
  credits=player_wallets.credits+25,experience=player_wallets.experience+50,
  boosters_opened=player_wallets.boosters_opened+1 WHERE player_id=uid;
 INSERT INTO public.game_transactions(player_id,kind,amount) VALUES(uid,'booster',25);
END $$;
REVOKE ALL ON FUNCTION public.open_starter_booster() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.open_starter_booster() TO authenticated;

-- Booster Halloween : mêmes rangs officiels, première série Horror garantie.
CREATE OR REPLACE FUNCTION public.open_halloween_booster()
RETURNS TABLE(card_id uuid,series_id bigint,name text,image_url text,rarity text,
 credits bigint,experience bigint,next_booster_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE
 uid uuid:=auth.uid();w public.player_wallets%rowtype;
 selected record;new_id uuid;n integer:=0;
 steps integer;available integer;base_at timestamptz;now_at timestamptz:=now();
BEGIN
 IF uid IS NULL OR NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=uid)
 THEN RAISE EXCEPTION 'Profil requis';END IF;
 IF extract(month FROM(now_at AT TIME ZONE 'Europe/Paris'))<>10 THEN
  RAISE EXCEPTION 'Halloween est disponible uniquement en octobre';END IF;
 INSERT INTO public.player_wallets(player_id) VALUES(uid)
 ON CONFLICT(player_id) DO NOTHING;
 SELECT * INTO w FROM public.player_wallets WHERE player_id=uid FOR UPDATE;
 steps:=greatest(0,floor(extract(epoch FROM(now_at-w.booster_anchor))/600)::integer);
 available:=least(10,w.booster_stock+steps);
 IF available<1 THEN RAISE EXCEPTION 'Réserve vide';END IF;
 base_at:=CASE WHEN available=10 THEN now_at
 ELSE w.booster_anchor+make_interval(secs=>steps*600) END;
 FOR selected IN SELECT * FROM public.pick_official_pack(true) LOOP
  INSERT INTO public.player_cards(owner_id,series_id,rarity)
   VALUES(uid,selected.show_id,selected.show_rarity) RETURNING id INTO new_id;
  n:=n+1;
  card_id:=new_id;series_id:=selected.show_id;name:=selected.show_name;
  image_url:=selected.show_image;rarity:=selected.show_rarity;
  credits:=w.credits+25;experience:=w.experience+50;
  next_booster_at:=CASE WHEN available=1 THEN base_at+interval '10 minutes' ELSE now_at END;
  RETURN NEXT;
 END LOOP;
 IF n<>5 THEN RAISE EXCEPTION 'Paquet incomplet';END IF;
 UPDATE public.player_wallets SET booster_stock=available-1,
  booster_anchor=base_at,last_booster_at=now_at,
  credits=player_wallets.credits+25,experience=player_wallets.experience+50,
  boosters_opened=player_wallets.boosters_opened+1 WHERE player_id=uid;
 INSERT INTO public.game_transactions(player_id,kind,amount) VALUES(uid,'halloween',25);
END $$;
REVOKE ALL ON FUNCTION public.open_halloween_booster() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.open_halloween_booster() TO authenticated;

-- Fusion : 10 cartes d'un même rang donnent UNE AUTRE série déjà classée
-- au rang supérieur. La série obtenue n'a jamais de version de rang inférieur.
CREATE OR REPLACE FUNCTION public.fuse_cards(p_card_ids uuid[])
RETURNS TABLE(card_id uuid,series_id bigint,name text,image_url text,rarity text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE
 uid uuid:=auth.uid();source_rank text;target_rank text;
 ranks text[]:=ARRAY['Commune','Peu commune','Rare','Épique','Légendaire','Mythique','Unique'];
 idx integer;chosen record;new_id uuid;n integer;removed integer;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'Connexion requise';END IF;
 IF p_card_ids IS NULL OR coalesce(array_length(p_card_ids,1),0)<>10 OR
   (SELECT count(DISTINCT v) FROM unnest(p_card_ids) v)<>10 THEN
  RAISE EXCEPTION 'Sélectionne dix cartes distinctes';END IF;
 PERFORM 1 FROM public.player_wallets WHERE player_id=uid FOR UPDATE;
 PERFORM 1 FROM public.player_cards c WHERE c.id=ANY(p_card_ids)
  AND c.owner_id=uid ORDER BY c.id FOR UPDATE;
 SELECT count(*),min(c.rarity) INTO n,source_rank FROM public.player_cards c
 WHERE c.id=ANY(p_card_ids) AND c.owner_id=uid AND NOT c.locked
  AND c.reserved_trade_id IS NULL
  AND NOT EXISTS(SELECT 1 FROM public.card_listings l
   WHERE l.card_id=c.id AND l.status='active');
 IF n<>10 THEN RAISE EXCEPTION 'Cartes protégées ou réservées';END IF;
 IF (SELECT count(DISTINCT c.rarity) FROM public.player_cards c
  WHERE c.id=ANY(p_card_ids) AND c.owner_id=uid)<>1 THEN
  RAISE EXCEPTION 'Les dix cartes doivent avoir la même rareté';END IF;
 idx:=array_position(ranks,source_rank);
 IF idx IS NULL OR idx>=7 THEN RAISE EXCEPTION 'Fusion impossible pour ce rang';END IF;
 target_rank:=ranks[idx+1];
 SELECT s.id AS sid,s.name AS title,s.image_url AS artwork,s.rarity AS official
  INTO chosen FROM public.series s WHERE s.rarity=target_rank
  AND s.rarity_source<>'pending' AND s.image_url IS NOT NULL
  ORDER BY random() LIMIT 1;
 IF chosen.sid IS NULL THEN RAISE EXCEPTION 'Pas de série du rang supérieur';END IF;
 DELETE FROM public.player_cards c
  WHERE c.id=ANY(p_card_ids) AND c.owner_id=uid AND NOT c.locked
  AND c.reserved_trade_id IS NULL;
 GET DIAGNOSTICS removed=ROW_COUNT;
 IF removed<>10 THEN RAISE EXCEPTION 'Fusion annulée';END IF;
 INSERT INTO public.player_cards(owner_id,series_id,rarity)
  VALUES(uid,chosen.sid,chosen.official) RETURNING id INTO new_id;
 UPDATE public.player_wallets SET fusion_count=fusion_count+1,
  experience=experience+100 WHERE player_id=uid;
 INSERT INTO public.game_transactions(player_id,kind,amount) VALUES(uid,'fusion',0);
 card_id:=new_id;series_id:=chosen.sid;name:=chosen.title;
 image_url:=chosen.artwork;rarity:=chosen.official;RETURN NEXT;
END $$;
REVOKE ALL ON FUNCTION public.fuse_cards(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fuse_cards(uuid[]) TO authenticated;

-- Lecture uniquement : fiches, tri, catalogue et vérifications.
CREATE OR REPLACE FUNCTION public.get_series_rarity(p_show_id bigint)
RETURNS TABLE(official_rarity text,source text,popularity numeric)
LANGUAGE sql SECURITY DEFINER SET search_path=public,pg_temp AS $$
 SELECT s.rarity,s.rarity_source,s.popularity_weight
 FROM public.series s WHERE s.id=p_show_id;
$$;
REVOKE ALL ON FUNCTION public.get_series_rarity(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_series_rarity(bigint) TO authenticated,anon;

COMMIT;
