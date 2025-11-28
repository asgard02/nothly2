-- 🔥 SCRIPT DE RÉINITIALISATION COMPLÈTE DE LA BASE DE DONNÉES
-- ⚠️ ATTENTION : Ce script va TOUT SUPPRIMER et recréer uniquement les tables essentielles
-- À exécuter dans l'éditeur SQL de Supabase
-- 
-- Ce script va :
-- 1. Supprimer TOUTES les tables (y compris les essentielles)
-- 2. Recréer uniquement les tables essentielles
-- 3. Recréer les index et contraintes nécessaires

-- ========================================
-- ÉTAPE 1 : SUPPRIMER TOUTES LES TABLES
-- ========================================

-- Supprimer les tables dans l'ordre pour respecter les foreign keys
DROP TABLE IF EXISTS revision_attempts CASCADE;
DROP TABLE IF EXISTS revision_sessions CASCADE;
DROP TABLE IF EXISTS quiz_questions CASCADE;
DROP TABLE IF EXISTS quiz_sets CASCADE;
DROP TABLE IF EXISTS revision_notes CASCADE;
DROP TABLE IF EXISTS revision_reminders CASCADE;
DROP TABLE IF EXISTS study_collection_quiz_questions CASCADE;
DROP TABLE IF EXISTS study_collection_flashcards CASCADE;
DROP TABLE IF EXISTS study_collection_sources CASCADE;
DROP TABLE IF EXISTS study_collections CASCADE;
DROP TABLE IF EXISTS document_sections CASCADE;
DROP TABLE IF EXISTS document_versions CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS notes CASCADE;
DROP TABLE IF EXISTS collections CASCADE;
DROP TABLE IF EXISTS async_jobs CASCADE;
DROP TABLE IF EXISTS usage_counters CASCADE;
DROP TABLE IF EXISTS user_credits CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Supprimer les vues
DROP VIEW IF EXISTS document_revision_overview CASCADE;

-- Supprimer les fonctions personnalisées (elles seront recréées si nécessaire)
DROP FUNCTION IF EXISTS update_timestamp() CASCADE;
DROP FUNCTION IF EXISTS update_collections_timestamp() CASCADE;
DROP FUNCTION IF EXISTS update_user_credits_timestamp() CASCADE;

-- ========================================
-- ÉTAPE 2 : RECRÉER LES TABLES ESSENTIELLES
-- ========================================

-- 1. Table users
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  role text NOT NULL DEFAULT 'free',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX users_email_idx ON users(email);

-- 2. Table notes (notes libres)
CREATE TABLE notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Nouvelle note',
  content text NOT NULL DEFAULT '',
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX notes_user_id_idx ON notes(user_id);
CREATE INDEX notes_updated_at_idx ON notes(updated_at DESC);

-- 3. Table collections
CREATE TABLE collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  color text NOT NULL DEFAULT 'from-blue-500/20 via-blue-400/10 to-purple-500/20',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX collections_user_id_idx ON collections(user_id);
CREATE INDEX collections_created_at_idx ON collections(created_at DESC);

-- 4. Table documents
CREATE TABLE documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  collection_id uuid REFERENCES collections(id) ON DELETE SET NULL,
  title text NOT NULL,
  original_filename text NOT NULL,
  status text NOT NULL CHECK (status IN ('processing', 'ready', 'failed')) DEFAULT 'processing',
  tags text[] DEFAULT '{}',
  current_version_id uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX documents_user_id_idx ON documents(user_id);
CREATE INDEX documents_collection_id_idx ON documents(collection_id);
CREATE INDEX documents_status_idx ON documents(status);
CREATE INDEX documents_tags_idx ON documents USING gin(tags);

-- 5. Table document_versions
CREATE TABLE document_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  page_count integer NOT NULL DEFAULT 0,
  raw_text text NOT NULL,
  checksum text NOT NULL,
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz
);

CREATE INDEX document_versions_document_id_idx ON document_versions(document_id);
CREATE INDEX document_versions_created_at_idx ON document_versions(created_at DESC);

-- Foreign key pour current_version_id
ALTER TABLE documents
  ADD CONSTRAINT documents_current_version_fk
  FOREIGN KEY (current_version_id) REFERENCES document_versions(id) ON DELETE SET NULL;

-- 6. Table document_sections
CREATE TABLE document_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_version_id uuid REFERENCES document_versions(id) ON DELETE CASCADE,
  parent_section_id uuid REFERENCES document_sections(id) ON DELETE SET NULL,
  order_index integer NOT NULL,
  heading text NOT NULL,
  content text NOT NULL,
  content_hash text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX document_sections_version_idx ON document_sections(document_version_id, order_index);
CREATE INDEX document_sections_hash_idx ON document_sections(content_hash);

-- 7. Table study_collections
CREATE TABLE study_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  tags text[] DEFAULT '{}',
  status text NOT NULL CHECK (status IN ('processing', 'ready', 'failed')) DEFAULT 'processing',
  total_sources integer DEFAULT 0,
  total_flashcards integer DEFAULT 0,
  total_quiz integer DEFAULT 0,
  prompt_tokens integer,
  completion_tokens integer,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX study_collections_user_idx ON study_collections(user_id);
CREATE INDEX study_collections_status_idx ON study_collections(status);
CREATE INDEX study_collections_tags_idx ON study_collections USING gin(tags);

-- 8. Table study_collection_sources
CREATE TABLE study_collection_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid REFERENCES study_collections(id) ON DELETE CASCADE,
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE,
  document_version_id uuid REFERENCES document_versions(id) ON DELETE CASCADE,
  title text,
  tags text[] DEFAULT '{}',
  text_length integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX study_collection_sources_collection_idx ON study_collection_sources(collection_id);
CREATE INDEX study_collection_sources_document_idx ON study_collection_sources(document_id);

-- 9. Table study_collection_flashcards
CREATE TABLE study_collection_flashcards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid REFERENCES study_collections(id) ON DELETE CASCADE,
  question text NOT NULL,
  answer text NOT NULL,
  tags text[] DEFAULT '{}',
  metadata jsonb DEFAULT '{}'::jsonb,
  order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX study_collection_flashcards_collection_idx ON study_collection_flashcards(collection_id, order_index);
CREATE INDEX study_collection_flashcards_tags_idx ON study_collection_flashcards USING gin(tags);

-- 10. Table study_collection_quiz_questions
CREATE TABLE study_collection_quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid REFERENCES study_collections(id) ON DELETE CASCADE,
  question_type text NOT NULL CHECK (question_type IN ('multiple_choice', 'true_false', 'completion')),
  prompt text NOT NULL,
  options jsonb,
  answer text NOT NULL,
  explanation text,
  tags text[] DEFAULT '{}',
  order_index integer DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX study_collection_quiz_collection_idx ON study_collection_quiz_questions(collection_id, order_index);
CREATE INDEX study_collection_quiz_tags_idx ON study_collection_quiz_questions USING gin(tags);

-- 11. Table async_jobs
CREATE TABLE async_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'running', 'succeeded', 'failed', 'cancelled')) DEFAULT 'pending',
  progress numeric DEFAULT 0 CHECK (progress >= 0 AND progress <= 1),
  payload jsonb,
  result jsonb,
  error text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  started_at timestamptz,
  finished_at timestamptz
);

CREATE INDEX async_jobs_user_idx ON async_jobs(user_id, status, created_at DESC);
CREATE INDEX async_jobs_status_idx ON async_jobs(status, created_at DESC);

-- 12. Table usage_counters
CREATE TABLE usage_counters (
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  month text NOT NULL,
  tokens_used bigint NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, month)
);

CREATE INDEX usage_counters_user_month_idx ON usage_counters(user_id, month);

-- 13. Table user_credits
CREATE TABLE user_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  plan text NOT NULL CHECK (plan IN ('free', 'plus', 'pro')) DEFAULT 'free',
  tokens_total integer DEFAULT 10000,
  tokens_used integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX user_credits_user_id_idx ON user_credits(user_id);
CREATE INDEX user_credits_plan_idx ON user_credits(plan);

-- ========================================
-- ÉTAPE 3 : CRÉER LES TRIGGERS
-- ========================================

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour documents
CREATE TRIGGER documents_update_timestamp
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Trigger pour async_jobs
CREATE TRIGGER async_jobs_update_timestamp
  BEFORE UPDATE ON async_jobs
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Trigger pour study_collections
CREATE TRIGGER study_collections_update_timestamp
  BEFORE UPDATE ON study_collections
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Fonction pour collections
CREATE OR REPLACE FUNCTION update_collections_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER collections_update_timestamp
  BEFORE UPDATE ON collections
  FOR EACH ROW EXECUTE FUNCTION update_collections_timestamp();

-- Fonction pour user_credits
CREATE OR REPLACE FUNCTION update_user_credits_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_credits_update_timestamp
  BEFORE UPDATE ON user_credits
  FOR EACH ROW EXECUTE FUNCTION update_user_credits_timestamp();

-- ========================================
-- ÉTAPE 4 : VÉRIFICATION
-- ========================================

SELECT 
  tablename,
  '✅ Table créée' as status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'users', 'notes', 'documents', 'document_versions', 'document_sections',
    'collections', 'study_collections', 'study_collection_sources',
    'study_collection_flashcards', 'study_collection_quiz_questions',
    'async_jobs', 'usage_counters', 'user_credits'
  )
ORDER BY tablename;

SELECT '✅ Réinitialisation complète terminée !' as status;
SELECT '📋 Tables créées : 13 tables essentielles' as info;
SELECT '🗑️ Tables supprimées : revision_attempts, revision_sessions, quiz_questions, quiz_sets, revision_notes, revision_reminders' as info;

