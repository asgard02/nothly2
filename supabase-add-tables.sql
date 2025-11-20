-- 📋 Script pour ajouter les tables manquantes sur Supabase
-- À exécuter dans l'éditeur SQL de Supabase
-- Ce script utilise IF NOT EXISTS pour éviter d'écraser les données existantes

-- ========================================
-- 1. TABLE: users (si elle n'existe pas)
-- ========================================

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  role text NOT NULL DEFAULT 'free',
  created_at timestamptz DEFAULT now()
);

-- Index pour rechercher rapidement par email
CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);

-- ========================================
-- 2. TABLE: documents (si elle n'existe pas)
-- ========================================

CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS documents_tags_idx ON documents USING gin(tags);

-- ========================================
-- 3. TABLE: document_versions (si elle n'existe pas)
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

-- Foreign key pour current_version_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'documents_current_version_fk'
  ) THEN
    ALTER TABLE documents
      ADD CONSTRAINT documents_current_version_fk
      FOREIGN KEY (current_version_id) REFERENCES document_versions(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ========================================
-- 4. TABLE: notes (si elle n'existe pas)
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
-- 5. TABLE: usage_counters (si elle n'existe pas)
-- ========================================

CREATE TABLE IF NOT EXISTS usage_counters (
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  month text NOT NULL, -- Format: YYYY-MM
  tokens_used bigint NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, month)
);

CREATE INDEX IF NOT EXISTS usage_counters_user_month_idx ON usage_counters(user_id, month);

-- ========================================
-- 6. TABLE: async_jobs (si elle n'existe pas)
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
CREATE INDEX IF NOT EXISTS async_jobs_polling_idx ON async_jobs(status, type, created_at ASC) WHERE status = 'pending';

-- ========================================
-- 7. TABLE: study_collections (si elle n'existe pas)
-- ========================================

CREATE TABLE IF NOT EXISTS study_collections (
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

CREATE INDEX IF NOT EXISTS study_collections_user_idx ON study_collections(user_id);
CREATE INDEX IF NOT EXISTS study_collections_status_idx ON study_collections(status);
CREATE INDEX IF NOT EXISTS study_collections_tags_idx ON study_collections USING gin(tags);
CREATE INDEX IF NOT EXISTS study_collections_user_status_idx ON study_collections(user_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS study_collections_user_id_composite_idx ON study_collections(user_id, id);

-- ========================================
-- 8. TABLE: study_collection_sources (si elle n'existe pas)
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
-- 9. TABLE: study_collection_flashcards (si elle n'existe pas)
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
-- 10. TABLE: study_collection_quiz_questions (si elle n'existe pas)
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
-- 11. TABLE: user_credits (si elle n'existe pas)
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
-- 12. TRIGGERS pour updated_at
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
DROP TRIGGER IF EXISTS documents_update_timestamp ON documents;
CREATE TRIGGER documents_update_timestamp
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Trigger pour async_jobs
DROP TRIGGER IF EXISTS async_jobs_update_timestamp ON async_jobs;
CREATE TRIGGER async_jobs_update_timestamp
  BEFORE UPDATE ON async_jobs
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Trigger pour study_collections
DROP TRIGGER IF EXISTS study_collections_update_timestamp ON study_collections;
CREATE TRIGGER study_collections_update_timestamp
  BEFORE UPDATE ON study_collections
  FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Trigger pour user_credits
CREATE OR REPLACE FUNCTION update_user_credits_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_credits_update_timestamp ON user_credits;
CREATE TRIGGER user_credits_update_timestamp
  BEFORE UPDATE ON user_credits
  FOR EACH ROW EXECUTE FUNCTION update_user_credits_timestamp();

-- ========================================
-- 13. VÉRIFICATION FINALE
-- ========================================

-- Afficher toutes les tables créées
SELECT 
  tablename,
  CASE 
    WHEN tablename IN (
      'users', 'documents', 'document_versions', 'notes', 
      'usage_counters', 'async_jobs', 'study_collections',
      'study_collection_sources', 'study_collection_flashcards',
      'study_collection_quiz_questions', 'user_credits'
    ) THEN '✅ Table existe'
    ELSE '⚠️ Table non listée'
  END as status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'users', 'documents', 'document_versions', 'notes', 
    'usage_counters', 'async_jobs', 'study_collections',
    'study_collection_sources', 'study_collection_flashcards',
    'study_collection_quiz_questions', 'user_credits'
  )
ORDER BY tablename;

SELECT '✅ Script terminé - Toutes les tables ont été créées ou vérifiées' as status;

