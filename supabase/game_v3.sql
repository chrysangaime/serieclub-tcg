-- SerieClub V3 : edition Halloween, liste de souhaits et protection des cartes
-- Prerequis : schema.sql, game.sql et game_v2.sql executes.
-- Migration idempotente : peut etre relancee en cas d'interruption.

create table if not exists public.player_wishlist (
 owner_id uuid not null references public.profiles(id) on delete cascade,
 series_id bigint not null references public.series(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key (owner_id, series_id)
);
create index if not exists player_wishlist_owner_idx on public.player_wishlist(owner_id,created_at desc);
alter table public.player_wishlist enable row level security;
drop policy if exists "Read own wishlist" on public.player_wishlist;
create policy "Read own wishlist" on public.player_wishlist for select to authenticated using(owner_id=auth.uid());
drop policy if exists "Add own wishes" on public.player_wishlist;
create policy "Add own wishes" on public.player_wishlist for insert to authenticated with check(owner_id=auth.uid());
drop policy if exists "Remove own wishes" on public.player_wishlist;
create policy "Remove own wishes" on public.player_wishlist for delete to authenticated using(owner_id=auth.uid());
grant select,insert,delete on public.player_wishlist to authenticated;

create or replace function public.set_card_locked(p_card_id uuid,p_locked boolean)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid(); affected integer;
begin
 if uid is null then raise exception 'Connexion requise'; end if;
 update public.player_cards set locked=p_locked where id=p_card_id and owner_id=uid;
 get diagnostics affected=row_count;
 if affected<>1 then raise exception 'Carte introuvable ou inaccessible'; end if;
 return true;
end $$;
revoke all on function public.set_card_locked(uuid,boolean) from public;
grant execute on function public.set_card_locked(uuid,boolean) to authenticated;

-- Paquet de saison : au moins une serie horreur/thriller, quatre autres series,
-- meme reserve et memes couts que le paquet classique. Limite au mois d'octobre.
create or replace function public.open_halloween_booster()
returns table(card_id uuid,series_id bigint,name text,image_url text,rarity text,credits bigint,experience bigint,next_booster_at timestamptz)
language plpgsql security definer set search_path=public,pg_temp as $$
declare
 uid uuid:=auth.uid();
 w public.player_wallets%rowtype;
 s record;
 steps integer;
 available integer;
 base_at timestamptz;
 current_at timestamptz:=now();
 r double precision;
 quality text;
 new_id uuid;
 found_count integer:=0;
begin
 if uid is null or not exists(select 1 from public.profiles where id=uid) then
   raise exception 'Connecte-toi et complete ton profil';
 end if;
 if extract(month from (current_at at time zone 'Europe/Paris'))<>10 then
   raise exception 'Edition Halloween disponible du 1er au 31 octobre';
 end if;
 if not exists(select 1 from public.series where public.series.image_url is not null and genres && array['Horror','Thriller','Supernatural']::text[]) then
   raise exception 'Importe les series horreur et thriller avant de jouer';
 end if;
 if (select count(*) from public.series where public.series.image_url is not null)<5 then
   raise exception 'Catalogue insuffisant pour ouvrir cinq cartes';
 end if;
 insert into public.player_wallets(player_id) values(uid) on conflict(player_id) do nothing;
 select * into w from public.player_wallets where player_id=uid for update;
 steps:=greatest(0,floor(extract(epoch from (current_at-w.booster_anchor))/600)::integer);
 available:=least(10,w.booster_stock+steps);
 if available<1 then raise exception 'Reserve vide, reviens apres la recharge'; end if;
 base_at:=case when available=10 then current_at else w.booster_anchor+make_interval(secs=>steps*600) end;
 update public.player_wallets
 set booster_stock=available-1,
     booster_anchor=base_at,
     last_booster_at=current_at,
     credits=player_wallets.credits+25,
     experience=player_wallets.experience+50,
     boosters_opened=player_wallets.boosters_opened+1
 where player_id=uid;
 for s in
   with halloween as (
      select id from public.series
      where public.series.image_url is not null and genres && array['Horror','Thriller','Supernatural']::text[]
      order by random() limit 1
   ), other_shows as (
      select id from public.series
      where public.series.image_url is not null and id not in (select id from halloween)
      order by random() limit 4
   ), picked as (
      select id from halloween union all select id from other_shows
   )
   select x.id as show_id,x.name as title,x.image_url as poster
   from picked p join public.series x on x.id=p.id
 loop
   r:=random()*100;
   quality:=case
     when r<0.3 then 'Unique'
     when r<1.5 then 'Mythique'
     when r<4 then 'Légendaire'
     when r<10 then 'Épique'
     when r<22 then 'Rare'
     when r<45 then 'Peu commune'
     else 'Commune' end;
   insert into public.player_cards(owner_id,series_id,rarity)
   values(uid,s.show_id,quality) returning id into new_id;
   found_count:=found_count+1;
   card_id:=new_id;
   series_id:=s.show_id;
   name:=s.title;
   image_url:=s.poster;
   rarity:=quality;
   credits:=w.credits+25;
   experience:=w.experience+50;
   next_booster_at:=case when available=1 then base_at+interval '10 minutes' else current_at end;
   return next;
 end loop;
 if found_count<>5 then raise exception 'Paquet incomplet : transaction annulee'; end if;
 insert into public.game_transactions(player_id,kind,amount) values(uid,'halloween',25);
end $$;
revoke all on function public.open_halloween_booster() from public;
grant execute on function public.open_halloween_booster() to authenticated;
