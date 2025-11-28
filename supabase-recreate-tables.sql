-- 🔄 SCRIPT POUR RECRÉER TOUTES LES TABLES APRÈS NETTOYAGE
-- ⚠️ Ce script recrée toutes les tables nécessaires pour l'application
-- À exécuter dans l'éditeur SQL de Supabase après avoir nettoyé la base

-- ========================================
-- 1. TABLE: users
-- ========================================
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  role text NOT NULL DEFAULT 'free',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);

-- ========================================
-- 2. TABLE: notes
-- ========================================
CREATE TABLE IF NOT EXISTS notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Nouvelle note',
  content text NOT NULL DEFAULT '',
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notes_user_id_idx ON notes(user_id);
CREATE INDEX IF NOT EXISTS notes_updated_at_idx ON notes(updated_at DESC);

-- ========================================
-- 3. TABLE: collections
-- ========================================
CREATE TABLE IF NOT EXISTS collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  color text NOT NULL DEFAULT 'from-blue-500/20 via-blue-400/10 to-purple-500/20',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS collections_user_id_idx ON collections(user_id);
CREATE INDEX IF NOT EXISTS collections_created_at_idx ON collections(created_at DESC);

-- ========================================
-- 4. TABLE: documents
-- ========================================
CREATE TABLE IF NOT EXISTS documents (
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

CREATE INDEX IF NOT EXISTS documents_user_id_idx ON documents(user_id);
CREATE INDEX IF NOT EXISTS documents_status_idx ON documents(status);
CREATE INDEX IF NOT EXISTS documents_collection_id_idx ON documents(collection_id);

-- ========================================
-- 5. TABLE: document_versions
-- ========================================
CREATE TABLE IF NOT EXISTS document_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  page_count integer NOT NULL DEFAULT 0,
  raw_text text NOT NULL,
  checksum text NOT NULL,
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz
);

CREATE INDEX IF NOT EXISTS document_versions_document_id_idx ON document_versions(document_id);
CREATE INDEX IF NOT EXISTS document_versions_created_at_idx ON document_versions(created_at DESC);

-- Contrainte pour current_version_id
ALTER TABLE documents
  DROP CONSTRAINT IF EXISTS documents_current_version_fk;
  
ALTER TABLE documents
  ADD CONSTRAINT documents_current_version_fk
  FOREIGN KEY (current_version_id) REFERENCES document_versions(id) ON DELETE SET NULL;

-- ========================================
-- 6. TABLE: document_sections
-- ========================================
CREATE TABLE IF NOT EXISTS document_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_version_id uuid REFERENCES document_versions(id) ON DELETE CASCADE,
  parent_section_id uuid REFERENCES document_sections(id) ON DELETE SET NULL,
  order_index integer NOT NULL,
  heading text NOT NULL,
  content text NOT NULL,
  content_hash text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS document_sections_version_idx ON document_sections(document_version_id, order_index);
CREATE INDEX IF NOT EXISTS document_sections_hash_idx ON document_sections(content_hash);

-- ========================================
-- 7. TABLE: study_collections
-- ========================================
CREATE TABLE IF NOT EXISTS study_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  collection_id uuid REFERENCES collections(id) ON DELETE SET NULL,
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

CREATE INDEX IF NOT EXISTS study_collections_user_idx ON study_collections(user_id);
CREATE INDEX IF NOT EXISTS study_collections_status_idx ON study_collections(status);
CREATE INDEX IF NOT EXISTS study_collections_tags_idx ON study_collections USING gin(tags);
CREATE INDEX IF NOT EXISTS study_collections_collection_id_idx ON study_collections(collection_id);

-- ========================================
-- 8. TABLE: study_collection_sources
-- ========================================
CREATE TABLE IF NOT EXISTS study_collection_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid REFERENCES study_collections(id) ON DELETE CASCADE,
  document_id uuid REFERENCES documents(id) ON DELETE CASCADE,
  document_version_id uuid REFERENCES document_versions(id) ON DELETE CASCADE,
  title text,
  tags text[] DEFAULT '{}',
  text_length integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS study_collection_sources_collection_idx ON study_collection_sources(collection_id);
CREATE INDEX IF NOT EXISTS study_collection_sources_document_idx ON study_collection_sources(document_id);

-- ========================================
-- 9. TABLE: study_collection_flashcards
-- ========================================
CREATE TABLE IF NOT EXISTS study_collection_flashcards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid REFERENCES study_collections(id) ON DELETE CASCADE,
  question text NOT NULL,
  answer text NOT NULL,
  tags text[] DEFAULT '{}',
  metadata jsonb DEFAULT '{}'::jsonb,
  order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS study_collection_flashcards_collection_idx ON study_collection_flashcards(collection_id, order_index);
CREATE INDEX IF NOT EXISTS study_collection_flashcards_tags_idx ON study_collection_flashcards USING gin(tags);

-- ========================================
-- 10. TABLE: study_collection_quiz_questions
-- ========================================
CREATE TABLE IF NOT EXISTS study_collection_quiz_questions (
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

CREATE INDEX IF NOT EXISTS study_collection_quiz_collection_idx ON study_collection_quiz_questions(collection_id, order_index);
CREATE INDEX IF NOT EXISTS study_collection_quiz_tags_idx ON study_collection_quiz_questions USING gin(tags);

-- ========================================
-- 11. TABLE: async_jobs
-- ========================================
CREATE TABLE IF NOT EXISTS async_jobs (
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

CREATE INDEX IF NOT EXISTS async_jobs_user_idx ON async_jobs(user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS async_jobs_status_idx ON async_jobs(status, created_at DESC);

-- ========================================
-- 12. TABLE: usage_counters
-- ========================================
CREATE TABLE IF NOT EXISTS usage_counters (
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  month text NOT NULL,
  tokens_used bigint NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, month)
);

CREATE INDEX IF NOT EXISTS usage_counters_user_month_idx ON usage_counters(user_id, month);

-- ========================================
-- 13. TABLE: user_credits
-- ========================================
CREATE TABLE IF NOT EXISTS user_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  plan text NOT NULL CHECK (plan IN ('free', 'plus', 'pro')) DEFAULT 'free',
  tokens_total integer DEFAULT 10000,
  tokens_used integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS user_credits_user_id_idx ON user_credits(user_id);
CREATE INDEX IF NOT EXISTS user_credits_plan_idx ON user_credits(plan);

-- ========================================
-- 14. FONCTIONS ET TRIGGERS
-- ========================================

-- Fonction pour updated_at
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour documents
DROP TRIGGER IF EXISTS documents_update_timestamp ON documents;
CREATE TRIGGER documents_update_timestamp
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Trigger pour async_jobs
DROP TRIGGER IF EXISTS async_jobs_update_timestamp ON async_jobs;
CREATE TRIGGER async_jobs_update_timestamp
  BEFORE UPDATE ON async_jobs
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Fonction pour collections
CREATE OR REPLACE FUNCTION update_collections_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour collections
DROP TRIGGER IF EXISTS collections_update_timestamp ON collections;
CREATE TRIGGER collections_update_timestamp
  BEFORE UPDATE ON collections
  FOR EACH ROW EXECUTE FUNCTION update_collections_timestamp();

-- Trigger pour user_credits
DROP TRIGGER IF EXISTS user_credits_update_timestamp ON user_credits;
CREATE TRIGGER user_credits_update_timestamp
  BEFORE UPDATE ON user_credits
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ========================================
-- 15. VUE: collection_stats
-- ========================================
CREATE OR REPLACE VIEW collection_stats AS
  SELECT 
    c.id AS collection_id,
    c.title AS collection_title,
    c.user_id,
    c.color,
    c.created_at,
    c.updated_at,
    COUNT(DISTINCT d.id) AS doc_count,
    COUNT(DISTINCT sc.id) AS artifact_count,
    MAX(d.updated_at) AS last_active
  FROM collections c
  LEFT JOIN documents d ON d.collection_id = c.id
  LEFT JOIN study_collections sc ON sc.collection_id = c.id
  GROUP BY c.id, c.title, c.user_id, c.color, c.created_at, c.updated_at;

COMMENT ON VIEW collection_stats IS 'Statistiques des collections avec nombre de documents et artefacts';

-- ========================================
-- RÉSUMÉ
-- ========================================
SELECT '✅ Toutes les tables ont été recréées avec succès !' AS status;
SELECT '📋 Tables créées: users, notes, collections, documents, document_versions, document_sections, study_collections, study_collection_*, async_jobs, usage_counters, user_credits' AS info;

