-- 🔍 Script de vérification Supabase
-- À exécuter dans l'éditeur SQL de Supabase pour diagnostiquer les problèmes

-- ========================================
-- 1. VÉRIFIER LES INDEX MANQUANTS
-- ========================================

-- Index GIN sur tags (critique pour .overlaps())
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE schemaname = 'public' 
        AND tablename = 'study_collections' 
        AND indexname = 'study_collections_tags_idx'
    ) THEN '✅ Index study_collections_tags_idx existe'
    ELSE '❌ Index study_collections_tags_idx MANQUANT - À CRÉER'
  END as status_tags_index;

-- Index sur user_id + status (pour les requêtes de collections)
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE schemaname = 'public' 
        AND tablename = 'study_collections' 
        AND indexname = 'study_collections_user_status_idx'
    ) THEN '✅ Index study_collections_user_status_idx existe'
    ELSE '❌ Index study_collections_user_status_idx MANQUANT'
  END as status_user_status_index;

-- Index composite pour polling async_jobs
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE schemaname = 'public' 
        AND tablename = 'async_jobs' 
        AND indexname = 'async_jobs_polling_idx'
    ) THEN '✅ Index async_jobs_polling_idx existe'
    ELSE '❌ Index async_jobs_polling_idx MANQUANT'
  END as status_polling_index;

-- ========================================
-- 2. VÉRIFIER LES FOREIGN KEYS
-- ========================================

SELECT
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  CASE 
    WHEN tc.table_name = 'documents' AND kcu.column_name = 'current_version_id' THEN '✅ documents.current_version_id → document_versions.id'
    WHEN tc.table_name = 'document_versions' AND kcu.column_name = 'document_id' THEN '✅ document_versions.document_id → documents.id'
    ELSE '✅ ' || tc.table_name || '.' || kcu.column_name || ' → ' || ccu.table_name || '.' || ccu.column_name
  END as status
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name IN ('documents', 'document_versions', 'study_collections', 'study_collection_sources')
ORDER BY tc.table_name, kcu.column_name;

-- ========================================
-- 3. VÉRIFIER RLS ET POLICIES
-- ========================================

SELECT 
  tablename,
  CASE 
    WHEN rowsecurity THEN '🔒 RLS ACTIVÉ'
    ELSE '⚠️ RLS DÉSACTIVÉ'
  END as rls_status,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = t.tablename) as policy_count
FROM pg_tables t
WHERE schemaname = 'public'
  AND tablename IN ('documents', 'document_versions', 'study_collections', 'study_collection_sources', 'async_jobs')
ORDER BY tablename;

-- Voir les policies détaillées
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd as operation,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('documents', 'document_versions', 'study_collections')
ORDER BY tablename, policyname;

-- ========================================
-- 4. VÉRIFIER LES PERFORMANCES
-- ========================================

-- Activer pg_stat_statements si pas déjà fait
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Voir les requêtes les plus lentes sur les tables critiques
SELECT 
  LEFT(query, 100) as query_preview,
  calls,
  ROUND(total_time::numeric, 2) as total_time_ms,
  ROUND(mean_time::numeric, 2) as mean_time_ms,
  ROUND(max_time::numeric, 2) as max_time_ms
FROM pg_stat_statements
WHERE query LIKE '%study_collections%'
   OR query LIKE '%documents%'
   OR query LIKE '%async_jobs%'
ORDER BY mean_time DESC
LIMIT 10;

-- ========================================
-- 5. CRÉER LES INDEX MANQUANTS (si nécessaire)
-- ========================================

-- Index GIN sur tags (CRITIQUE pour .overlaps())
CREATE INDEX IF NOT EXISTS study_collections_tags_idx 
ON study_collections USING gin(tags);

-- Index composite pour optimiser les requêtes par user_id + status
CREATE INDEX IF NOT EXISTS study_collections_user_status_idx 
ON study_collections(user_id, status, updated_at DESC);

-- Index pour optimiser RLS EXISTS queries
CREATE INDEX IF NOT EXISTS study_collections_user_id_composite_idx 
ON study_collections(user_id, id);

-- Index pour polling async_jobs
CREATE INDEX IF NOT EXISTS async_jobs_polling_idx 
ON async_jobs(status, type, created_at ASC)
WHERE status = 'pending';

-- Index sur documents pour les requêtes avec tags
CREATE INDEX IF NOT EXISTS documents_tags_idx 
ON documents USING gin(tags);

-- Index sur documents pour user_id + tags
CREATE INDEX IF NOT EXISTS documents_user_tags_idx 
ON documents(user_id) 
WHERE tags IS NOT NULL AND array_length(tags, 1) > 0;

-- ========================================
-- 6. VÉRIFICATION FINALE
-- ========================================

SELECT '✅ Vérification terminée' as status;

