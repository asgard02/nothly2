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

-- Documents importés
create table documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  title text not null,
  original_filename text not null,
  status text not null check (status in ('processing', 'ready', 'failed')) default 'processing',
  tags text[] default '{}',
  current_version_id uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index documents_user_id_idx on documents(user_id);
create index documents_status_idx on documents(status);

-- Table de comptage d'usage pour l'IA
create table usage_counters (
  user_id uuid references users(id) on delete cascade,
  month text not null, -- Format: YYYY-MM
  tokens_used bigint not null default 0,
  primary key (user_id, month)
);

-- Index pour rechercher l'usage par utilisateur et mois
create index usage_counters_user_month_idx on usage_counters(user_id, month);

-- Versions d'un document pour gérer les mises à jour
create table document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete cascade,
  storage_path text not null,
  page_count integer not null default 0,
  raw_text text not null,
  checksum text not null,
  created_at timestamptz default now(),
  processed_at timestamptz
);

create index document_versions_document_id_idx on document_versions(document_id);
create index document_versions_created_at_idx on document_versions(created_at desc);

-- Sections (chapitres, sous-parties) découpées dans le document
create table document_sections (
  id uuid primary key default gen_random_uuid(),
  document_version_id uuid references document_versions(id) on delete cascade,
  parent_section_id uuid references document_sections(id) on delete set null,
  order_index integer not null,
  heading text not null,
  content text not null,
  content_hash text not null,
  created_at timestamptz default now()
);

create index document_sections_version_idx on document_sections(document_version_id, order_index);
create index document_sections_hash_idx on document_sections(content_hash);

-- Fiches de révision générées
create table revision_notes (
  id uuid primary key default gen_random_uuid(),
  document_version_id uuid references document_versions(id) on delete cascade,
  document_section_id uuid references document_sections(id) on delete cascade,
  generated_at timestamptz default now(),
  payload jsonb not null,
  tokens_used integer default 0,
  model text not null default 'gpt-4o-mini'
);

create index revision_notes_section_idx on revision_notes(document_section_id);
create index revision_notes_version_idx on revision_notes(document_version_id);

-- Quiz générés automatiquement
create table quiz_sets (
  id uuid primary key default gen_random_uuid(),
  document_version_id uuid references document_versions(id) on delete cascade,
  document_section_id uuid references document_sections(id) on delete cascade,
  generated_at timestamptz default now(),
  recommended_duration_minutes integer not null default 6,
  tokens_used integer default 0,
  model text not null default 'gpt-4o-mini'
);

create index quiz_sets_section_idx on quiz_sets(document_section_id);
create index quiz_sets_version_idx on quiz_sets(document_version_id);

create table quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_set_id uuid references quiz_sets(id) on delete cascade,
  question_type text not null check (question_type in ('multiple_choice', 'true_false', 'completion')),
  prompt text not null,
  options jsonb,
  answer text not null,
  explanation text not null,
  tags text[] default '{}',
  order_index integer not null,
  created_at timestamptz default now()
);

create index quiz_questions_quiz_idx on quiz_questions(quiz_set_id, order_index);

-- Sessions de quiz pour suivre la progression
create table revision_sessions (
  id uuid primary key default gen_random_uuid(),
  quiz_set_id uuid references quiz_sets(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  started_at timestamptz default now(),
  completed_at timestamptz,
  score_ratio numeric,
  total_questions integer,
  correct_answers integer
);

create index revision_sessions_user_idx on revision_sessions(user_id);
create index revision_sessions_quiz_idx on revision_sessions(quiz_set_id);

-- Table des tâches asynchrones (file d'attente)
create table async_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  type text not null,
  status text not null check (status in ('pending', 'running', 'succeeded', 'failed', 'cancelled')) default 'pending',
  progress numeric default 0 check (progress >= 0 and progress <= 1),
  payload jsonb,
  result jsonb,
  error text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  started_at timestamptz,
  finished_at timestamptz
);

create index async_jobs_user_idx on async_jobs(user_id, status, created_at desc);
create index async_jobs_status_idx on async_jobs(status, created_at desc);

create table revision_attempts (
  id uuid primary key default gen_random_uuid(),
  revision_session_id uuid references revision_sessions(id) on delete cascade,
  quiz_question_id uuid references quiz_questions(id) on delete cascade,
  user_answer text,
  is_correct boolean,
  attempted_at timestamptz default now()
);

create index revision_attempts_session_idx on revision_attempts(revision_session_id);
create index revision_attempts_question_idx on revision_attempts(quiz_question_id);

-- Rappels pour planifier les révisions
create table revision_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  document_section_id uuid references document_sections(id) on delete cascade,
  due_at timestamptz not null,
  status text not null check (status in ('pending', 'sent', 'snoozed', 'completed')) default 'pending',
  created_at timestamptz default now()
);

create index revision_reminders_user_idx on revision_reminders(user_id, due_at);

-- Collections de révision (flashcards + quiz générés à partir des supports)
create table study_collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  title text not null,
  tags text[] default '{}',
  status text not null check (status in ('processing', 'ready', 'failed')) default 'processing',
  total_sources integer default 0,
  total_flashcards integer default 0,
  total_quiz integer default 0,
  prompt_tokens integer,
  completion_tokens integer,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index study_collections_user_idx on study_collections(user_id);
create index study_collections_status_idx on study_collections(status);
create index study_collections_tags_idx on study_collections using gin(tags);

create table study_collection_sources (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid references study_collections(id) on delete cascade,
  document_id uuid references documents(id) on delete cascade,
  document_version_id uuid references document_versions(id) on delete cascade,
  title text,
  tags text[] default '{}',
  text_length integer default 0,
  created_at timestamptz default now()
);

create index study_collection_sources_collection_idx on study_collection_sources(collection_id);
create index study_collection_sources_document_idx on study_collection_sources(document_id);

create table study_collection_flashcards (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid references study_collections(id) on delete cascade,
  question text not null,
  answer text not null,
  tags text[] default '{}',
  metadata jsonb default '{}'::jsonb,
  order_index integer default 0,
  created_at timestamptz default now()
);

create index study_collection_flashcards_collection_idx on study_collection_flashcards(collection_id, order_index);
create index study_collection_flashcards_tags_idx on study_collection_flashcards using gin(tags);

create table study_collection_quiz_questions (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid references study_collections(id) on delete cascade,
  question_type text not null check (question_type in ('multiple_choice', 'true_false', 'completion')),
  prompt text not null,
  options jsonb,
  answer text not null,
  explanation text,
  tags text[] default '{}',
  order_index integer default 0,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index study_collection_quiz_collection_idx on study_collection_quiz_questions(collection_id, order_index);
create index study_collection_quiz_tags_idx on study_collection_quiz_questions using gin(tags);

-- Met à jour automatiquement updated_at
create or replace function update_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger documents_update_timestamp
  before update on documents
  for each row execute function update_timestamp();

create trigger async_jobs_update_timestamp
  before update on async_jobs
  for each row execute function update_timestamp();

-- Relie la version courante au document
alter table documents
  add constraint documents_current_version_fk
  foreign key (current_version_id) references document_versions(id) on delete set null;

-- Vue de synthèse pour le dashboard
create view document_revision_overview as
  select
    d.id as document_id,
    d.title as document_title,
    d.user_id,
    dv.id as version_id,
    dv.created_at as version_created_at,
    ds.id as section_id,
    ds.order_index,
    ds.heading,
    rn.payload as revision_note,
    qs.id as quiz_set_id,
    qs.recommended_duration_minutes,
    count(qq.id) as quiz_questions_count
  from documents d
  join document_versions dv on dv.document_id = d.id
  left join document_sections ds on ds.document_version_id = dv.id
  left join revision_notes rn on rn.document_section_id = ds.id
  left join quiz_sets qs on qs.document_section_id = ds.id
  left join quiz_questions qq on qq.quiz_set_id = qs.id
  group by d.id, dv.id, ds.id, rn.payload, qs.id;

comment on view document_revision_overview is 'Vue de synthèse documents + sections + notes + quiz.';

-- Table legacy des notes libres (éditeur instantané)
create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  title text not null default 'Nouvelle note',
  content text not null default '',
  updated_at timestamptz default now()
);

create index if not exists notes_user_id_idx on notes(user_id);
create index if not exists notes_updated_at_idx on notes(updated_at desc);

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

create index if not exists user_credits_user_id_idx on user_credits(user_id);
create index if not exists user_credits_plan_idx on user_credits(plan);

create or replace function update_user_credits_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger if not exists user_credits_update_timestamp
  before update on user_credits
  for each row execute function update_user_credits_timestamp();

-- RLS (Row Level Security) - Optionnel mais recommandé
-- Pour activer RLS, décommentez les lignes suivantes :

-- alter table users enable row level security;
-- alter table documents enable row level security;
-- alter table document_versions enable row level security;
-- alter table document_sections enable row level security;
-- alter table revision_notes enable row level security;
-- alter table quiz_sets enable row level security;
-- alter table quiz_questions enable row level security;
-- alter table notes enable row level security;
-- alter table usage_counters enable row level security;

-- create policy "Users can view their own data" on users
--   for select using (auth.uid() = id);
-- create policy "Users access leurs documents" on documents
--   for all using (auth.uid() = user_id);
-- create policy "Users access leurs versions" on document_versions
--   for select using (exists (
--     select 1
--     from documents d
--     where d.id = document_versions.document_id
--       and d.user_id = auth.uid()
--   ));
-- create policy "Users access leurs sections" on document_sections
--   for select using (exists (
--     select 1
--     from document_versions dv
--     join documents d on dv.document_id = d.id
--     where dv.id = document_sections.document_version_id
--       and d.user_id = auth.uid()
--   ));
-- create policy "Users access leurs fiches" on revision_notes
--   for select using (exists (
--     select 1
--     from document_sections ds
--     join document_versions dv on ds.document_version_id = dv.id
--     join documents d on dv.document_id = d.id
--     where ds.id = revision_notes.document_section_id
--       and d.user_id = auth.uid()
--   ));
-- create policy "Users access leurs quiz sets" on quiz_sets
--   for select using (exists (
--     select 1
--     from document_sections ds
--     join document_versions dv on ds.document_version_id = dv.id
--     join documents d on dv.document_id = d.id
--     where ds.id = quiz_sets.document_section_id
--       and d.user_id = auth.uid()
--   ));
-- create policy "Users access leurs quiz questions" on quiz_questions
--   for select using (exists (
--     select 1
--     from quiz_sets qs
--     join document_versions dv on qs.document_version_id = dv.id
--     join documents d on dv.document_id = d.id
--     where qs.id = quiz_questions.quiz_set_id
--       and d.user_id = auth.uid()
--   ));
-- create policy "Users can view their own notes" on notes
--   for all using (auth.uid() = user_id);
-- create policy "Users can view their own usage" on usage_counters
--   for select using (auth.uid() = user_id);

