-- SérieClub V2 : réserve de boosters et fusion atomique.
-- À exécuter après schema.sql et game.sql dans Supabase SQL Editor.
alter table public.player_wallets add column if not exists booster_stock integer not null default 10;
alter table public.player_wallets add column if not exists booster_anchor timestamptz not null default now();
alter table public.player_wallets add column if not exists fusion_count integer not null default 0;
create index if not exists sc_cards_fusion_idx on public.player_cards(owner_id,rarity,locked);
create or replace function public.get_booster_status()
returns table(stock integer,maximum integer,recharge_seconds integer)
language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid(); w public.player_wallets%rowtype; steps integer; now_at timestamptz:=now(); available integer;
begin
 if uid is null then raise exception 'Connexion nécessaire'; end if;
 if not exists(select 1 from public.profiles where id=uid) then raise exception 'Profil nécessaire'; end if;
 insert into public.player_wallets(player_id) values(uid) on conflict(player_id) do nothing;
 select * into w from public.player_wallets where player_id=uid for update;
 steps:=greatest(0,floor(extract(epoch from (now_at-w.booster_anchor))/600)::integer);
 available:=least(10,w.booster_stock+steps);
 if available>=10 then
  update public.player_wallets set booster_stock=10,booster_anchor=now_at where player_id=uid;
  stock:=10;maximum:=10;recharge_seconds:=0;
 else
  update public.player_wallets set booster_stock=available,booster_anchor=w.booster_anchor+make_interval(secs=>steps*600) where player_id=uid;
  stock:=available;maximum:=10;
  recharge_seconds := 600 - floor(extract(epoch from now_at - (w.booster_anchor + make_interval(secs => steps * 600))))::integer;
 end if;
 return next;
end $$;
revoke all on function public.get_booster_status() from public;
grant execute on function public.get_booster_status() to authenticated;

-- DROP nécessaire car l'ancienne fonction a un type de retour différent.
drop function if exists public.open_starter_booster();
create function public.open_starter_booster()
returns table(card_id uuid,series_id bigint,name text,image_url text,rarity text,credits bigint,experience bigint,next_booster_at timestamptz)
language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid(); w public.player_wallets%rowtype; s record; n integer; steps integer; available integer; base_at timestamptz; r double precision; rank_name text; new_id uuid; now_at timestamptz:=now();
begin
 if uid is null or not exists(select 1 from public.profiles where id=uid) then raise exception 'Connecte-toi et crée ton profil'; end if;
 insert into public.player_wallets(player_id) values(uid) on conflict(player_id) do nothing;
 select * into w from public.player_wallets where player_id=uid for update;
 steps:=greatest(0,floor(extract(epoch from (now_at-w.booster_anchor))/600)::integer);
 available:=least(10,w.booster_stock+steps);
 if available<1 then raise exception 'Réserve vide : attends le prochain booster'; end if;
 if (select count(*) from public.series where public.series.image_url is not null)<5 then raise exception 'Catalogue serveur non prêt : lance la synchronisation TVmaze'; end if;
 base_at:=case when available=10 then now_at else w.booster_anchor+make_interval(secs=>steps*600) end;
 update public.player_wallets set booster_stock=available-1,booster_anchor=base_at,last_booster_at=now_at,
 credits=player_wallets.credits+25,experience=player_wallets.experience+50,boosters_opened=player_wallets.boosters_opened+1
 where player_id=uid;
 for s in select id as show_id,public.series.name as title,public.series.image_url as poster from public.series where public.series.image_url is not null order by random() limit 5 loop
  r:=random()*100;
  rank_name:=case when r<0.3 then 'Unique' when r<1.5 then 'Mythique' when r<4 then 'Légendaire' when r<10 then 'Épique' when r<22 then 'Rare' when r<45 then 'Peu commune' else 'Commune' end;
  insert into public.player_cards(owner_id,series_id,rarity) values(uid,s.show_id,rank_name) returning id into new_id;
  card_id:=new_id;series_id:=s.show_id;name:=s.title;image_url:=s.poster;rarity:=rank_name;credits:=w.credits+25;experience:=w.experience+50;
  next_booster_at:=case when available=1 then base_at+interval '10 minutes' else now_at end;
  return next;
 end loop;
 insert into public.game_transactions(player_id,kind,amount) values(uid,'booster',25);
end $$;
revoke all on function public.open_starter_booster() from public;
grant execute on function public.open_starter_booster() to authenticated;

create or replace function public.fuse_cards(p_card_ids uuid[])
returns table(card_id uuid,series_id bigint,name text,image_url text,rarity text)
language plpgsql security definer set search_path=public,pg_temp as $$
declare uid uuid:=auth.uid(); source_rank text; target_rank text; ranks text[]:=array['Commune','Peu commune','Rare','Épique','Légendaire','Mythique','Unique']; idx integer; chosen record; new_id uuid; n integer;
begin
 if uid is null then raise exception 'Connexion nécessaire'; end if;
 if p_card_ids is null or array_length(p_card_ids,1)<>10 or (select count(distinct v) from unnest(p_card_ids) v)<>10 then raise exception 'Sélectionne dix cartes distinctes'; end if;
 perform 1 from public.player_wallets where player_id=uid for update;
 select count(*),min(c.rarity) into n,source_rank from public.player_cards c where c.id=any(p_card_ids) and c.owner_id=uid and not c.locked;
 if n<>10 then raise exception 'Certaines cartes sont absentes, protégées ou indisponibles'; end if;
 if (select count(distinct c.rarity) from public.player_cards c where c.id=any(p_card_ids) and c.owner_id=uid)<>1 then raise exception 'Les dix cartes doivent avoir la même rareté'; end if;
 idx:=array_position(ranks,source_rank);
 if idx is null or idx>=7 then raise exception 'Cette rareté ne peut pas être fusionnée'; end if;
 target_rank:=ranks[idx+1];
 select s.id as sid,s.name as title,s.image_url as poster into chosen from public.series s where s.image_url is not null order by random() limit 1;
 if chosen.sid is null then raise exception 'Catalogue indisponible'; end if;
 delete from public.player_cards c where c.id=any(p_card_ids) and c.owner_id=uid and not c.locked;
 if not found then raise exception 'Fusion impossible'; end if;
 insert into public.player_cards(owner_id,series_id,rarity) values(uid,chosen.sid,target_rank) returning id into new_id;
 update public.player_wallets set fusion_count=fusion_count+1,experience=experience+100 where player_id=uid;
 insert into public.game_transactions(player_id,kind,amount) values(uid,'fusion',0);
 card_id:=new_id;series_id:=chosen.sid;name:=chosen.title;image_url:=chosen.poster;rarity:=target_rank;
 return next;
end $$;
revoke all on function public.fuse_cards(uuid[]) from public;
grant execute on function public.fuse_cards(uuid[]) to authenticated;
