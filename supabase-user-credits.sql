-- 🎯 CRÉATION DE LA TABLE user_credits
-- Système de gestion des crédits IA par utilisateur
-- À exécuter dans l'éditeur SQL de votre projet Supabase

-- ========================================
-- TABLE: user_credits
-- ========================================

-- Création de la table si elle n'existe pas
create table if not exists public.user_credits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  plan text not null check (plan in ('free', 'plus', 'pro')) default 'free',
  tokens_total integer default 10000,
  tokens_used integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id)
);

-- Index pour optimiser les requêtes
create index if not exists user_credits_user_id_idx on user_credits(user_id);
create index if not exists user_credits_plan_idx on user_credits(plan);

-- Trigger pour mettre à jour updated_at automatiquement
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Création du trigger (supprime d'abord s'il existe)
drop trigger if exists update_user_credits_updated_at on user_credits;
create trigger update_user_credits_updated_at
  before update on user_credits
  for each row
  execute function update_updated_at_column();

-- ========================================
-- 🔒 ROW LEVEL SECURITY (RLS)
-- ========================================

-- Active RLS sur la table user_credits
alter table user_credits enable row level security;

-- Policy: Les utilisateurs peuvent lire leurs propres crédits
drop policy if exists "Users can view their own credits" on user_credits;
create policy "Users can view their own credits"
on user_credits
for select
using (auth.uid() = user_id);

-- Policy: Les utilisateurs peuvent créer leurs propres crédits
drop policy if exists "Users can create their own credits" on user_credits;
create policy "Users can create their own credits"
on user_credits
for insert
with check (auth.uid() = user_id);

-- Policy: Les utilisateurs peuvent modifier leurs propres crédits
drop policy if exists "Users can update their own credits" on user_credits;
create policy "Users can update their own credits"
on user_credits
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- ========================================
-- ✅ VÉRIFICATION
-- ========================================

-- Pour vérifier que la table existe :
-- SELECT * FROM user_credits LIMIT 1;

-- Pour voir les policies RLS :
-- SELECT * FROM pg_policies WHERE tablename = 'user_credits';

-- Pour vérifier qu'un utilisateur a des crédits :
-- SELECT * FROM user_credits WHERE user_id = auth.uid();

