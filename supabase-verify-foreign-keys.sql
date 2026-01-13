-- 🔍 Script de vérification des foreign keys avant correction
-- À exécuter AVANT supabase-fix-foreign-keys.sql pour voir l'état actuel

-- ========================================
-- VÉRIFIER L'ÉTAT ACTUEL DES FOREIGN KEYS
-- ========================================

-- Vérifier toutes les foreign keys vers users (public.users ou auth.users)
SELECT
  tc.table_schema,
  tc.table_name,
  kcu.column_name,
  ccu.table_schema AS foreign_table_schema,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  tc.constraint_name,
  CASE 
    WHEN ccu.table_schema = 'auth' AND ccu.table_name = 'users' THEN '✅ CORRECT'
    WHEN ccu.table_schema = 'public' AND ccu.table_name = 'users' THEN '❌ À CORRIGER'
    ELSE '⚠️ AUTRE'
  END AS status
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.constraint_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND kcu.column_name = 'user_id'
  AND tc.table_schema = 'public'
  AND (
    ccu.table_name = 'users' OR
    tc.table_name IN ('async_jobs', 'study_collections', 'documents', 'notes')
  )
ORDER BY 
  CASE 
    WHEN ccu.table_schema = 'auth' THEN 1
    WHEN ccu.table_schema = 'public' THEN 2
    ELSE 3
  END,
  tc.table_name;

-- ========================================
-- VÉRIFIER SPÉCIFIQUEMENT LES TABLES CONCERNÉES
-- ========================================

-- async_jobs
SELECT 
  'async_jobs' AS table_name,
  tc.constraint_name,
  ccu.table_schema AS references_schema,
  ccu.table_name AS references_table,
  CASE 
    WHEN ccu.table_schema = 'auth' AND ccu.table_name = 'users' THEN '✅ OK'
    ELSE '❌ À CORRIGER'
  END AS status
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.table_name = 'async_jobs'
  AND kcu.column_name = 'user_id'
  AND tc.constraint_type = 'FOREIGN KEY';

-- study_collections
SELECT 
  'study_collections' AS table_name,
  tc.constraint_name,
  ccu.table_schema AS references_schema,
  ccu.table_name AS references_table,
  CASE 
    WHEN ccu.table_schema = 'auth' AND ccu.table_name = 'users' THEN '✅ OK'
    ELSE '❌ À CORRIGER'
  END AS status
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.table_name = 'study_collections'
  AND kcu.column_name = 'user_id'
  AND tc.constraint_type = 'FOREIGN KEY';

-- documents (pour référence)
SELECT 
  'documents' AS table_name,
  tc.constraint_name,
  ccu.table_schema AS references_schema,
  ccu.table_name AS references_table,
  CASE 
    WHEN ccu.table_schema = 'auth' AND ccu.table_name = 'users' THEN '✅ OK'
    ELSE '❌ À CORRIGER'
  END AS status
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.table_name = 'documents'
  AND kcu.column_name = 'user_id'
  AND tc.constraint_type = 'FOREIGN KEY';

-- ========================================
-- RÉSUMÉ
-- ========================================

SELECT 
  '📊 RÉSUMÉ' AS info,
  COUNT(*) FILTER (WHERE ccu.table_schema = 'auth' AND ccu.table_name = 'users') AS correct_count,
  COUNT(*) FILTER (WHERE ccu.table_schema = 'public' AND ccu.table_name = 'users') AS incorrect_count,
  COUNT(*) AS total_count
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND kcu.column_name = 'user_id'
  AND tc.table_schema = 'public'
  AND tc.table_name IN ('async_jobs', 'study_collections', 'documents', 'notes');
