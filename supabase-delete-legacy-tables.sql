-- 🗑️ SCRIPT SIMPLE POUR SUPPRIMER LES TABLES LEGACY
-- ⚠️ Ce script supprime uniquement les tables inutiles/legacy
-- Les données des autres tables sont conservées

-- ========================================
-- SUPPRIMER LES TABLES LEGACY
-- ========================================

-- Tables de révision legacy (remplacées par study_collections)
DROP TABLE IF EXISTS revision_attempts CASCADE;
DROP TABLE IF EXISTS revision_sessions CASCADE;
DROP TABLE IF EXISTS revision_reminders CASCADE;
DROP TABLE IF EXISTS revision_notes CASCADE;

-- Tables de quiz legacy (remplacées par study_collection_quiz_questions)
DROP TABLE IF EXISTS quiz_questions CASCADE;
DROP TABLE IF EXISTS quiz_sets CASCADE;

-- Vue legacy (non utilisée)
DROP VIEW IF EXISTS document_revision_overview CASCADE;

-- ========================================
-- VÉRIFICATION
-- ========================================

-- Afficher les tables restantes
SELECT 
  tablename,
  CASE 
    WHEN tablename IN (
      'users', 
      'notes', 
      'documents', 
      'document_versions', 
      'document_sections',
      'collections',
      'study_collections',
      'study_collection_sources',
      'study_collection_flashcards',
      'study_collection_quiz_questions',
      'async_jobs',
      'usage_counters',
      'user_credits'
    ) THEN '✅ Table essentielle'
    ELSE '⚠️ Table non listée'
  END as status
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

SELECT '✅ Tables legacy supprimées !' as status;




