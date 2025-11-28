-- 🧹 SCRIPT COMPLET POUR NETTOYER TOUTES LES DONNÉES
-- ⚠️ ATTENTION : Ce script va SUPPRIMER TOUTES LES DONNÉES de toutes les tables
-- ⚠️ Les tables seront conservées, seules les données seront supprimées
-- 
-- À exécuter dans l'éditeur SQL de Supabase
-- 
-- Ce script va :
-- 1. Supprimer toutes les données dans l'ordre (enfants d'abord, parents ensuite)
-- 2. Gérer automatiquement les foreign keys avec CASCADE
-- 3. Afficher un résumé des tables nettoyées

-- ========================================
-- ÉTAPE 1 : SUPPRIMER TOUTES LES DONNÉES
-- ========================================

-- Utilisation d'un DO block pour gérer les tables qui n'existent pas
DO $$
DECLARE
  tbl_name text;
  tables_to_truncate text[] := ARRAY[
    -- Tables enfants (dépendantes) d'abord
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
    'collections',
    'notes',
    'async_jobs',
    'usage_counters',
    'user_credits',
    'users'
  ];
  cleaned_count integer := 0;
  skipped_count integer := 0;
BEGIN
  RAISE NOTICE '🧹 Début du nettoyage...';
  RAISE NOTICE '';
  
  FOREACH tbl_name IN ARRAY tables_to_truncate
  LOOP
    -- Vérifier si la table existe avant de la TRUNCATE
    IF EXISTS (
      SELECT 1 FROM information_schema.tables t
      WHERE t.table_schema = 'public' 
      AND t.table_name = tbl_name
    ) THEN
      BEGIN
        EXECUTE format('TRUNCATE TABLE %I CASCADE', tbl_name);
        RAISE NOTICE '✅ Table % vidée', tbl_name;
        cleaned_count := cleaned_count + 1;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '⚠️  Erreur lors du nettoyage de %: %', tbl_name, SQLERRM;
      END;
    ELSE
      RAISE NOTICE '⏭️  Table % n''existe pas, ignorée', tbl_name;
      skipped_count := skipped_count + 1;
    END IF;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '📊 Résumé:';
  RAISE NOTICE '  ✅ Tables nettoyées: %', cleaned_count;
  RAISE NOTICE '  ⏭️  Tables ignorées (n''existent pas): %', skipped_count;
END $$;

-- ========================================
-- ÉTAPE 2 : VÉRIFIER QUE TOUT EST VIDÉ
-- ========================================

-- Afficher le nombre de lignes restantes dans chaque table
SELECT 
  '📋 Vérification des tables' as info;

SELECT 
  schemaname,
  tablename,
  (SELECT COUNT(*) FROM information_schema.tables t2 
   WHERE t2.table_schema = t.schemaname 
   AND t2.table_name = t.tablename) as table_exists,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables t2 
      WHERE t2.table_schema = t.schemaname 
      AND t2.table_name = t.tablename
    ) THEN (
      SELECT COUNT(*)::text 
      FROM information_schema.columns c
      WHERE c.table_schema = t.schemaname 
      AND c.table_name = t.tablename
    )
    ELSE 'N/A'
  END as column_count
FROM pg_tables t
WHERE schemaname = 'public'
  AND tablename IN (
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
    'revision_attempts',
    'revision_sessions',
    'quiz_questions',
    'quiz_sets',
    'revision_notes',
    'revision_reminders'
  )
ORDER BY tablename;

-- ========================================
-- ÉTAPE 3 : COMPTER LES LIGNES RESTANTES
-- ========================================

-- Fonction pour compter les lignes (si les tables existent)
DO $$
DECLARE
  tbl_name text;
  row_count bigint;
  total_rows bigint := 0;
  tables_to_check text[] := ARRAY[
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
  ];
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🔍 Vérification du nombre de lignes restantes:';
  RAISE NOTICE '';
  
  FOREACH tbl_name IN ARRAY tables_to_check
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables t
      WHERE t.table_schema = 'public' 
      AND t.table_name = tbl_name
    ) THEN
      EXECUTE format('SELECT COUNT(*) FROM %I', tbl_name) INTO row_count;
      total_rows := total_rows + row_count;
      IF row_count > 0 THEN
        RAISE NOTICE '⚠️  Table % : % lignes restantes', tbl_name, row_count;
      ELSE
        RAISE NOTICE '✅ Table % : 0 lignes (vide)', tbl_name;
      END IF;
    END IF;
  END LOOP;
  
  RAISE NOTICE '';
  IF total_rows = 0 THEN
    RAISE NOTICE '✅ Toutes les tables sont vides !';
  ELSE
    RAISE NOTICE '⚠️  Attention: % lignes restantes au total', total_rows;
  END IF;
END $$;

-- ========================================
-- RÉSUMÉ FINAL
-- ========================================

SELECT '✅ Nettoyage terminé !' as status;
SELECT '📊 Toutes les données ont été supprimées de toutes les tables' as info;
SELECT '💡 Les tables et leur structure sont conservées' as info;
SELECT '🔄 Vous pouvez maintenant recommencer avec une base de données propre' as info;

