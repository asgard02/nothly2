-- 🔍 VÉRIFICATION ET RÉPARATION DES TABLES ESSENTIELLES
-- Ce script vérifie que toutes les tables utilisées dans le code existent
-- et les recrée si elles manquent

-- ========================================
-- VÉRIFICATION DES TABLES MANQUANTES
-- ========================================

-- Afficher les tables qui devraient exister mais qui n'existent pas
SELECT 
  tablename as "Table manquante"
FROM (
  VALUES 
    ('revision_notes'),
    ('quiz_sets'),
    ('quiz_questions')
) AS required_tables(tablename)
WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.tables t
  WHERE t.table_schema = 'public' 
  AND t.table_name = required_tables.tablename
);

-- ========================================
-- CRÉATION DES TABLES MANQUANTES
-- ========================================

-- Table revision_notes (utilisée pour les fiches de révision des documents)
CREATE TABLE IF NOT EXISTS revision_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_version_id uuid REFERENCES document_versions(id) ON DELETE CASCADE,
  document_section_id uuid REFERENCES document_sections(id) ON DELETE CASCADE,
  generated_at timestamptz DEFAULT now(),
  payload jsonb NOT NULL,
  tokens_used integer DEFAULT 0,
  model text NOT NULL DEFAULT 'gpt-4o-mini'
);

CREATE INDEX IF NOT EXISTS revision_notes_section_idx ON revision_notes(document_section_id);
CREATE INDEX IF NOT EXISTS revision_notes_version_idx ON revision_notes(document_version_id);

-- Table quiz_sets (utilisée pour les quiz des documents)
CREATE TABLE IF NOT EXISTS quiz_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_version_id uuid REFERENCES document_versions(id) ON DELETE CASCADE,
  document_section_id uuid REFERENCES document_sections(id) ON DELETE CASCADE,
  generated_at timestamptz DEFAULT now(),
  recommended_duration_minutes integer NOT NULL DEFAULT 6,
  tokens_used integer DEFAULT 0,
  model text NOT NULL DEFAULT 'gpt-4o-mini'
);

CREATE INDEX IF NOT EXISTS quiz_sets_section_idx ON quiz_sets(document_section_id);
CREATE INDEX IF NOT EXISTS quiz_sets_version_idx ON quiz_sets(document_version_id);

-- Table quiz_questions (utilisée pour les questions des quiz)
CREATE TABLE IF NOT EXISTS quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_set_id uuid REFERENCES quiz_sets(id) ON DELETE CASCADE,
  question_type text NOT NULL CHECK (question_type IN ('multiple_choice', 'true_false', 'completion')),
  prompt text NOT NULL,
  options jsonb,
  answer text NOT NULL,
  explanation text NOT NULL,
  tags text[] DEFAULT '{}',
  order_index integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS quiz_questions_quiz_idx ON quiz_questions(quiz_set_id, order_index);

-- ========================================
-- VÉRIFICATION FINALE
-- ========================================

-- Afficher toutes les tables essentielles et leur statut
WITH required_tables AS (
  SELECT tablename FROM (
    VALUES 
      ('users'),
      ('notes'),
      ('documents'),
      ('document_versions'),
      ('document_sections'),
      ('collections'),
      ('study_collections'),
      ('study_collection_sources'),
      ('study_collection_flashcards'),
      ('study_collection_quiz_questions'),
      ('async_jobs'),
      ('usage_counters'),
      ('user_credits'),
      ('revision_notes'),
      ('quiz_sets'),
      ('quiz_questions')
  ) AS t(tablename)
)
SELECT 
  rt.tablename as "Table",
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables it
      WHERE it.table_schema = 'public' 
      AND it.table_name = rt.tablename
    ) THEN '✅ Existe'
    ELSE '❌ Manquante'
  END as "Statut"
FROM required_tables rt
ORDER BY rt.tablename;

SELECT '✅ Vérification terminée !' as "Résultat";

