-- 🔒 ACTIVATION DE ROW LEVEL SECURITY (RLS)
-- Ce script sécurise vos tables au niveau de la base de données
-- À exécuter dans Supabase SQL Editor

-- ========================================
-- TABLE: notes
-- ========================================

-- 1️⃣ Active RLS sur la table notes
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- 2️⃣ Policy: Les utilisateurs peuvent lire leurs propres notes
CREATE POLICY "Users can view their own notes"
ON notes
FOR SELECT
USING (auth.uid() = user_id);

-- 3️⃣ Policy: Les utilisateurs peuvent créer leurs propres notes
CREATE POLICY "Users can create their own notes"
ON notes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 4️⃣ Policy: Les utilisateurs peuvent modifier leurs propres notes
CREATE POLICY "Users can update their own notes"
ON notes
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 5️⃣ Policy: Les utilisateurs peuvent supprimer leurs propres notes
CREATE POLICY "Users can delete their own notes"
ON notes
FOR DELETE
USING (auth.uid() = user_id);

-- ========================================
-- TABLE: users
-- ========================================

-- 1️⃣ Active RLS sur la table users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 2️⃣ Policy: Les utilisateurs peuvent lire leur propre profil
CREATE POLICY "Users can view their own profile"
ON users
FOR SELECT
USING (auth.uid() = id);

-- 3️⃣ Policy: Les utilisateurs peuvent modifier leur propre profil
CREATE POLICY "Users can update their own profile"
ON users
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ========================================
-- TABLE: usage_counters
-- ========================================

-- 1️⃣ Active RLS sur la table usage_counters
ALTER TABLE usage_counters ENABLE ROW LEVEL SECURITY;

-- 2️⃣ Policy: Les utilisateurs peuvent lire leur propre usage
CREATE POLICY "Users can view their own usage"
ON usage_counters
FOR SELECT
USING (auth.uid() = user_id);

-- 3️⃣ Policy: Les utilisateurs peuvent insérer leur propre usage
CREATE POLICY "Users can insert their own usage"
ON usage_counters
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 4️⃣ Policy: Les utilisateurs peuvent modifier leur propre usage
CREATE POLICY "Users can update their own usage"
ON usage_counters
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ========================================
-- TABLE: study_collections
-- ========================================

ALTER TABLE study_collections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own study collections" ON study_collections;
CREATE POLICY "Users manage own study collections"
ON study_collections
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ========================================
-- TABLE: study_collection_sources
-- ========================================

ALTER TABLE study_collection_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own collection sources" ON study_collection_sources;
CREATE POLICY "Users manage own collection sources"
ON study_collection_sources
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM study_collections sc
    WHERE sc.id = collection_id
      AND sc.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM study_collections sc
    WHERE sc.id = collection_id
      AND sc.user_id = auth.uid()
  )
);

-- ========================================
-- TABLE: study_collection_flashcards
-- ========================================

ALTER TABLE study_collection_flashcards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own collection flashcards" ON study_collection_flashcards;
CREATE POLICY "Users manage own collection flashcards"
ON study_collection_flashcards
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM study_collections sc
    WHERE sc.id = collection_id
      AND sc.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM study_collections sc
    WHERE sc.id = collection_id
      AND sc.user_id = auth.uid()
  )
);

-- ========================================
-- TABLE: study_collection_quiz_questions
-- ========================================

ALTER TABLE study_collection_quiz_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own collection quiz questions" ON study_collection_quiz_questions;
CREATE POLICY "Users manage own collection quiz questions"
ON study_collection_quiz_questions
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM study_collections sc
    WHERE sc.id = collection_id
      AND sc.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM study_collections sc
    WHERE sc.id = collection_id
      AND sc.user_id = auth.uid()
  )
);

-- ========================================
-- TABLE: async_jobs
-- ========================================

ALTER TABLE async_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own async jobs" ON async_jobs;
CREATE POLICY "Users manage own async jobs"
ON async_jobs
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ========================================
-- TABLE: user_credits
-- ========================================

-- 1️⃣ Active RLS sur la table user_credits
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;

-- 2️⃣ Policy: Les utilisateurs peuvent lire leurs propres crédits
CREATE POLICY "Users can view their own credits"
ON user_credits
FOR SELECT
USING (auth.uid() = user_id);

-- 3️⃣ Policy: Les utilisateurs peuvent créer leurs propres crédits
CREATE POLICY "Users can create their own credits"
ON user_credits
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 4️⃣ Policy: Les utilisateurs peuvent modifier leurs propres crédits
CREATE POLICY "Users can update their own credits"
ON user_credits
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ========================================
-- ✅ VÉRIFICATION
-- ========================================

-- Pour vérifier que RLS est actif :
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- Pour voir les policies :
-- SELECT * FROM pg_policies WHERE schemaname = 'public';

