-- 🧹 SCRIPT DE NETTOYAGE COMPLET DE LA BASE DE DONNÉES
-- ⚠️ ATTENTION : Ce script va SUPPRIMER TOUTES LES DONNÉES et les tables inutiles
-- À exécuter dans l'éditeur SQL de Supabase
-- 
-- Ce script va :
-- 1. Supprimer toutes les données des tables
-- 2. Supprimer les tables inutiles/legacy
-- 3. Garder uniquement les tables essentielles

-- ========================================
-- ÉTAPE 1 : SUPPRIMER TOUTES LES DONNÉES
-- ========================================

-- Supprimer les données dans l'ordre pour respecter les foreign keys
-- (on commence par les tables enfants, puis les parents)
-- Utilisation d'un DO block pour gérer les tables qui n'existent pas

DO $$
DECLARE
  tbl_name text;
  tables_to_truncate text[] := ARRAY[
    'revision_attempts',
    'revision_sessions',
    'quiz_questions',
    'quiz_sets',
    'revision_notes',
    'revision_reminders',
    'study_collection_quiz_questions',
    'study_collection_flashcards',
    'study_collection_sources',
    'study_collections',
    'document_sections',
    'document_versions',
    'documents',
    'notes',
    'collections',
    'async_jobs',
    'usage_counters',
    'user_credits',
    'users'
  ];
BEGIN
  FOREACH tbl_name IN ARRAY tables_to_truncate
  LOOP
    -- Vérifier si la table existe avant de la TRUNCATE
    IF EXISTS (
      SELECT 1 FROM information_schema.tables t
      WHERE t.table_schema = 'public' 
      AND t.table_name = tbl_name
    ) THEN
      EXECUTE format('TRUNCATE TABLE %I CASCADE', tbl_name);
      RAISE NOTICE 'Table % vidée', tbl_name;
    ELSE
      RAISE NOTICE 'Table % n''existe pas, ignorée', tbl_name;
    END IF;
  END LOOP;
END $$;

-- ========================================
-- ÉTAPE 2 : SUPPRIMER LES TABLES INUTILES/LEGACY
-- ========================================

-- Ces tables semblent être remplacées par study_collections et ne sont plus utilisées
DROP TABLE IF EXISTS revision_attempts CASCADE;
DROP TABLE IF EXISTS revision_sessions CASCADE;
DROP TABLE IF EXISTS quiz_questions CASCADE;
DROP TABLE IF EXISTS quiz_sets CASCADE;
DROP TABLE IF EXISTS revision_notes CASCADE;
DROP TABLE IF EXISTS revision_reminders CASCADE;

-- Supprimer la vue si elle existe
DROP VIEW IF EXISTS document_revision_overview CASCADE;

-- ========================================
-- ÉTAPE 3 : VÉRIFIER LES TABLES RESTANTES
-- ========================================

-- Afficher toutes les tables restantes dans le schéma public
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
    ELSE '⚠️ Table non listée - à vérifier'
  END as status
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- ========================================
-- ÉTAPE 4 : RÉINITIALISER LES SÉQUENCES (optionnel)
-- ========================================

-- Réinitialiser les séquences si nécessaire (pour les IDs auto-générés)
-- Note: Les UUIDs ne nécessitent pas de séquences, mais on peut nettoyer les autres

-- ========================================
-- RÉSUMÉ
-- ========================================

SELECT '✅ Nettoyage terminé !' as status;
SELECT '📊 Tables supprimées : revision_attempts, revision_sessions, quiz_questions, quiz_sets, revision_notes, revision_reminders' as info;
SELECT '📋 Tables conservées : users, notes, documents, document_versions, document_sections, collections, study_collections, study_collection_*, async_jobs, usage_counters, user_credits' as info;

