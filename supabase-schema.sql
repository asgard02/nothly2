-- Script SQL pour créer les tables Supabase
-- À exécuter dans l'éditeur SQL de votre projet Supabase

-- Table des utilisateurs
create table users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  role text not null default 'free',
  created_at timestamptz default now()
);

-- Index pour rechercher rapidement par email
create index users_email_idx on users(email);

-- Table des notes
create table notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  title text not null default 'Nouvelle note',
  content text not null default '',
  updated_at timestamptz default now()
);

-- Index pour récupérer rapidement les notes d'un utilisateur
create index notes_user_id_idx on notes(user_id);
create index notes_updated_at_idx on notes(updated_at desc);

-- Table de comptage d'usage pour l'IA
create table usage_counters (
  user_id uuid references users(id) on delete cascade,
  month text not null, -- Format: YYYY-MM
  tokens_used bigint not null default 0,
  primary key (user_id, month)
);

-- Index pour rechercher l'usage par utilisateur et mois
create index usage_counters_user_month_idx on usage_counters(user_id, month);

-- Table des crédits IA par utilisateur
create table if not exists public.user_credits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  plan text not null check (plan in ('free', 'plus', 'pro')) default 'free',
  tokens_total integer default 10000,
  tokens_used integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id)
);

-- Index pour rechercher rapidement les crédits d'un utilisateur
create index user_credits_user_id_idx on user_credits(user_id);
create index user_credits_plan_idx on user_credits(plan);

-- Trigger pour mettre à jour updated_at automatiquement
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_user_credits_updated_at
  before update on user_credits
  for each row
  execute function update_updated_at_column();

-- RLS (Row Level Security) - Optionnel mais recommandé
-- Pour activer RLS, décommentez les lignes suivantes :

-- alter table users enable row level security;
-- alter table notes enable row level security;
-- alter table usage_counters enable row level security;

-- create policy "Users can view their own data" on users
--   for select using (auth.uid() = id);

-- create policy "Users can view their own notes" on notes
--   for all using (auth.uid() = user_id);

-- create policy "Users can view their own usage" on usage_counters
--   for select using (auth.uid() = user_id);

