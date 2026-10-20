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
 cards_count bigint,followers_count bigint,following boolean)
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
