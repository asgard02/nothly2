-- ========================================
-- Phase 2: Ajout des index Supabase manquants
-- ========================================
-- Ce script ajoute les index nécessaires pour optimiser les requêtes fréquentes
-- sur les grandes tables.

-- ========================================
-- 1. INDEX COMPOSITE pour async_jobs
-- ========================================
-- Optimise les requêtes des workers qui cherchent les jobs pending par type
-- Requête typique: SELECT ... WHERE status = 'pending' AND type = '...' ORDER BY created_at ASC
CREATE INDEX IF NOT EXISTS async_jobs_status_type_created_idx 
ON async_jobs(status, type, created_at ASC) 
WHERE status = 'pending';

-- Index alternatif pour les requêtes sans filtre WHERE (si nécessaire)
CREATE INDEX IF NOT EXISTS async_jobs_status_type_created_full_idx 
ON async_jobs(status, type, created_at DESC);

-- ========================================
-- 2. INDEX pour flashcard_stats(next_review_at)
-- ========================================
-- Optimise les requêtes qui récupèrent les flashcards à réviser
-- Requête typique: SELECT ... WHERE next_review_at <= NOW() ORDER BY next_review_at ASC
-- Note: Cet index existe peut-être déjà dans supabase-update-flashcards-algorithm.sql
-- mais on le recrée avec IF NOT EXISTS pour être sûr
CREATE INDEX IF NOT EXISTS flashcard_stats_next_review_at_idx 
ON flashcard_stats(next_review_at ASC) 
WHERE next_review_at IS NOT NULL;

-- Index composite pour les requêtes avec user_id
CREATE INDEX IF NOT EXISTS flashcard_stats_user_next_review_idx 
ON flashcard_stats(user_id, next_review_at ASC) 
WHERE next_review_at IS NOT NULL;

-- ========================================
-- 3. INDEX pour document_sections(document_version_id)
-- ========================================
-- Optimise les requêtes qui récupèrent toutes les sections d'une version de document
-- Requête typique: SELECT ... WHERE document_version_id = '...' ORDER BY order_index
-- Note: Un index composite existe peut-être déjà, mais on s'assure qu'il est optimal
CREATE INDEX IF NOT EXISTS document_sections_version_id_idx 
ON document_sections(document_version_id);

-- Index composite existant déjà (document_sections_version_idx) mais on vérifie qu'il est bien créé
CREATE INDEX IF NOT EXISTS document_sections_version_order_idx 
ON document_sections(document_version_id, order_index ASC);

-- ========================================
-- VÉRIFICATION DES INDEX CRÉÉS
-- ========================================
-- Pour vérifier que les index ont été créés, exécuter:
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename IN ('async_jobs', 'flashcard_stats', 'document_sections')
-- ORDER BY tablename, indexname;
