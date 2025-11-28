-- Migration simple pour ajouter collection_id aux documents
-- À exécuter dans l'éditeur SQL de Supabase

-- 1. Créer la table collections si elle n'existe pas
create table if not exists collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  title text not null,
  color text not null default 'from-blue-500/20 via-blue-400/10 to-purple-500/20',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Ajouter la colonne collection_id à documents (si elle n'existe pas)
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_name = 'documents' and column_name = 'collection_id'
  ) then
    alter table documents 
      add column collection_id uuid references collections(id) on delete set null;
    
    create index if not exists documents_collection_id_idx on documents(collection_id);
    
    raise notice 'Colonne collection_id ajoutée avec succès';
  else
    raise notice 'La colonne collection_id existe déjà';
  end if;
end $$;

-- 3. Créer les index pour les collections
create index if not exists collections_user_id_idx on collections(user_id);
create index if not exists collections_created_at_idx on collections(created_at desc);

-- 4. Fonction et trigger pour updated_at sur collections
create or replace function update_collections_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists collections_update_timestamp on collections;
create trigger collections_update_timestamp
  before update on collections
  for each row execute function update_collections_timestamp();




