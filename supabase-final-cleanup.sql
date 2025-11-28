-- 🧹 NETTOYAGE FINAL - SUPPRIMER UNIQUEMENT LES TABLES VRAIMENT INUTILISÉES
-- ⚠️ ATTENTION : Ce script ne supprime QUE les tables qui ne sont PAS utilisées dans le code
-- ⚠️ Les tables revision_notes, quiz_sets, quiz_questions sont ENCORE UTILISÉES et seront CONSERVÉES
-- À exécuter dans l'éditeur SQL de Supabase

-- ========================================
-- ÉTAPE 1 : SUPPRIMER LA VUE LEGACY (non utilisée)
-- ========================================
DROP VIEW IF EXISTS document_revision_overview CASCADE;

-- ========================================
-- ÉTAPE 2 : SUPPRIMER UNIQUEMENT LES TABLES VRAIMENT INUTILISÉES
-- ========================================

-- Tables de sessions/révisions legacy (NON utilisées dans le code actuel)
DROP TABLE IF EXISTS revision_attempts CASCADE;
DROP TABLE IF EXISTS revision_sessions CASCADE;
DROP TABLE IF EXISTS revision_reminders CASCADE;

-- ⚠️ TABLES CONSERVÉES (encore utilisées dans le code) :
-- - revision_notes (utilisée dans app/api/collections/route.ts et lib/documents/processor.ts)
-- - quiz_sets (utilisée dans lib/documents/processor.ts et app/api/documents/[id]/route.ts)
-- - quiz_questions (utilisée dans lib/documents/processor.ts et app/api/documents/[id]/route.ts)

-- ========================================
-- ÉTAPE 3 : VÉRIFICATION DES TABLES RESTANTES
-- ========================================

SELECT 
  tablename as "Table",
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
      'user_credits',
      -- Tables encore utilisées pour les documents individuels
      'revision_notes',
      'quiz_sets',
      'quiz_questions'
    ) THEN '✅ Essentielle'
    ELSE '⚠️ À vérifier'
  END as "Statut"
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- ========================================
-- RÉSUMÉ
-- ========================================

SELECT '✅ Nettoyage terminé !' as "Résultat";
SELECT '🗑️ Tables supprimées : revision_attempts, revision_sessions, revision_reminders, document_revision_overview (vue)' as "Info";
SELECT '📋 Tables conservées : revision_notes, quiz_sets, quiz_questions (encore utilisées pour les documents)' as "Info";
SELECT '📊 Total : 16 tables essentielles conservées' as "Info";

