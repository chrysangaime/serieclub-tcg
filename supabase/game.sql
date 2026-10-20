-- SérieClub TCG : moteur de jeu sécurisé (exécuter APRÈS supabase/schema.sql)
-- Exécuter dans SQL Editor. Aucune clé secrète à publier.
alter table public.player_cards drop constraint if exists player_cards_rarity_check;
alter table public.player_cards add constraint player_cards_rarity_check check (rarity in ('Commune','Peu commune','Rare','Épique','Légendaire','Mythique','Unique'));
alter table public.player_wallets add column if not exists boosters_opened integer not null default 0;
alter table public.player_wallets add column if not exists experience bigint not null default 0;
alter table public.player_wallets add column if not exists last_daily_at timestamptz;
create table if not exists public.game_transactions(
 id bigint generated always as identity primary key,
 player_id uuid not null references public.profiles(id) on delete cascade,
 kind text not null,
 amount bigint not null default 0,
 created_at timestamptz not null default now()
);
alter table public.game_transactions enable row level security;
drop policy if exists "Read own transactions" on public.game_transactions;
create policy "Read own transactions" on public.game_transactions for select to authenticated using(player_id=auth.uid());
create index if not exists idx_tx_player on public.game_transactions(player_id,created_at desc);

-- Import du catalogue uniquement par administrateur SQL ou processus de confiance.
-- Un catalogue vide provoque une erreur explicite, sans fausses cartes.
create or replace function public.open_starter_booster()
returns table(card_id uuid,series_id bigint,name text,image_url text,rarity text,credits bigint,experience bigint,next_booster_at timestamptz)
language plpgsql security definer set search_path=public,pg_temp
as $$
declare uid uuid := auth.uid(); w public.player_wallets%rowtype; s record; r double precision; rarity_name text; card_uuid uuid; next_at timestamptz; n integer := 0;
begin
 if uid is null then raise exception 'Connecte-toi pour ouvrir un booster'; end if;
 if not exists(select 1 from public.profiles where id=uid) then raise exception 'Crée ton profil avant de jouer'; end if;
 insert into public.player_wallets(player_id) values(uid) on conflict(player_id) do nothing;
 select * into w from public.player_wallets where player_id=uid for update;
 if w.last_booster_at is not null and w.last_booster_at + interval '10 minutes' > now() then
   raise exception 'Booster indisponible jusqu’au %', w.last_booster_at + interval '10 minutes';
 end if;
 if (select count(*) from public.series where image_url is not null) < 5 then raise exception 'Catalogue serveur insuffisant : importer au moins cinq séries'; end if;
 next_at := now()+interval '10 minutes';
 for s in select id, public.series.name as title, public.series.image_url as poster from public.series where image_url is not null order by random() limit 5 loop
   r:=random()*100;
   rarity_name:=case when r<0.3 then 'Unique' when r<1.5 then 'Mythique' when r<4 then 'Légendaire' when r<10 then 'Épique' when r<22 then 'Rare' when r<45 then 'Peu commune' else 'Commune' end;
   insert into public.player_cards(owner_id,series_id,rarity) values(uid,s.id,rarity_name) returning id into card_uuid;
   n:=n+1;
   card_id:=card_uuid;series_id:=s.id;name:=s.title;image_url:=s.poster;rarity:=rarity_name;credits:=w.credits+25;experience:=w.experience+50;next_booster_at:=next_at;
   return next;
 end loop;
 update public.player_wallets set last_booster_at=now(),credits=player_wallets.credits+25,experience=player_wallets.experience+50,boosters_opened=player_wallets.boosters_opened+1 where player_id=uid;
 insert into public.game_transactions(player_id,kind,amount) values(uid,'booster',25);
end $$;
revoke all on function public.open_starter_booster() from public;
grant execute on function public.open_starter_booster() to authenticated;

create or replace function public.claim_daily_reward()
returns bigint language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid(); w public.player_wallets%rowtype; result bigint;
begin
 if uid is null or not exists(select 1 from public.profiles where id=uid) then raise exception 'Profil requis'; end if;
 insert into public.player_wallets(player_id) values(uid) on conflict(player_id) do nothing;
 select * into w from public.player_wallets where player_id=uid for update;
 if w.last_daily_at is not null and w.last_daily_at + interval '24 hours' > now() then raise exception 'Récompense déjà récupérée'; end if;
 update public.player_wallets set credits=credits+100,last_daily_at=now() where player_id=uid returning credits into result;
 insert into public.game_transactions(player_id,kind,amount) values(uid,'daily',100);
 return result;
end $$;
revoke all on function public.claim_daily_reward() from public;
grant execute on function public.claim_daily_reward() to authenticated;

create or replace view public.public_leaderboard with (security_invoker=true) as
select p.username, count(c.id)::bigint as card_count, count(distinct c.series_id)::bigint as unique_series
from public.profiles p left join public.player_cards c on c.owner_id=p.id
group by p.id,p.username;
-- Public scoreboard: permit reading counts through a narrowly scoped security-definer function,
-- without exposing individual cards.
create or replace function public.get_leaderboard()
returns table(username text,card_count bigint,unique_series bigint)
language sql security definer set search_path=public,pg_temp as $$
select p.username,count(c.id)::bigint,count(distinct c.series_id)::bigint
from public.profiles p left join public.player_cards c on c.owner_id=p.id
group by p.id,p.username order by count(c.id) desc,p.username limit 30
$$;
revoke all on function public.get_leaderboard() from public;
grant execute on function public.get_leaderboard() to anon,authenticated;


-- Importer au moins cinq séries avec affiches via GitHub Actions avant d'ouvrir un booster.
