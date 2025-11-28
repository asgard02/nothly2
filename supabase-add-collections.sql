-- Migration pour ajouter le support des Collections
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

create index if not exists collections_user_id_idx on collections(user_id);
create index if not exists collections_created_at_idx on collections(created_at desc);

-- 2. Ajouter la colonne collection_id à la table documents
alter table documents 
  add column if not exists collection_id uuid references collections(id) on delete set null;

create index if not exists documents_collection_id_idx on documents(collection_id);

-- 3. Fonction pour mettre à jour updated_at sur collections
create or replace function update_collections_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- 4. Trigger pour updated_at sur collections
drop trigger if exists collections_update_timestamp on collections;
create trigger collections_update_timestamp
  before update on collections
  for each row execute function update_collections_timestamp();

-- 5. Vue pour compter les documents et artefacts par collection
create or replace view collection_stats as
  select 
    c.id as collection_id,
    c.title as collection_title,
    c.user_id,
    c.color,
    c.created_at,
    c.updated_at,
    count(distinct d.id) as doc_count,
    count(distinct rn.id) as artifact_count,
    max(d.updated_at) as last_active
  from collections c
  left join documents d on d.collection_id = c.id
  left join document_versions dv on dv.document_id = d.id
  left join document_sections ds on ds.document_version_id = dv.id
  left join revision_notes rn on rn.document_section_id = ds.id
  group by c.id, c.title, c.user_id, c.color, c.created_at, c.updated_at;

comment on view collection_stats is 'Statistiques des collections avec nombre de documents et artefacts';




