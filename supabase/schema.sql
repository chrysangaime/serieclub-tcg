-- SérieClub TCG — PostgreSQL / Supabase
-- Exécuter dans Supabase SQL Editor après création du projet.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (char_length(username) between 3 and 24),
  created_at timestamptz not null default now()
);
create table if not exists public.series (
  id bigint primary key,
  name text not null,
  premiered date,
  genres text[] not null default '{}',
  image_url text,
  source text not null default 'tvmaze',
  created_at timestamptz not null default now()
);
create table if not exists public.player_cards (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  series_id bigint not null references public.series(id),
  rarity text not null check (rarity in ('Commune','Peu commune','Rare','Super rare','Ultra rare','Légendaire','Légendaire+')),
  obtained_at timestamptz not null default now(),
  locked boolean not null default false
);
create index if not exists player_cards_owner_idx on public.player_cards(owner_id);
create table if not exists public.player_wallets (
  player_id uuid primary key references public.profiles(id) on delete cascade,
  credits bigint not null default 0 check (credits >= 0),
  last_booster_at timestamptz
);
alter table public.profiles enable row level security;
alter table public.series enable row level security;
alter table public.player_cards enable row level security;
alter table public.player_wallets enable row level security;

drop policy if exists "Profiles are readable" on public.profiles;
create policy "Profiles are readable" on public.profiles for select using (true);
drop policy if exists "Players create own profile" on public.profiles;
create policy "Players create own profile" on public.profiles for insert to authenticated with check (auth.uid() = id);
drop policy if exists "Players update own profile" on public.profiles;
create policy "Players update own profile" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists "Series catalog readable" on public.series;
create policy "Series catalog readable" on public.series for select using (true);
drop policy if exists "Own cards readable" on public.player_cards;
create policy "Own cards readable" on public.player_cards for select to authenticated using (auth.uid() = owner_id);
drop policy if exists "Own wallet readable" on public.player_wallets;
create policy "Own wallet readable" on public.player_wallets for select to authenticated using (auth.uid() = player_id);

-- Important : aucune permission INSERT/UPDATE/DELETE publique sur les cartes et crédits.
-- L'attribution des boosters et les échanges devront passer par des fonctions
-- transactionnelles contrôlées côté serveur.
