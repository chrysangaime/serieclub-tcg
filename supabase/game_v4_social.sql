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
