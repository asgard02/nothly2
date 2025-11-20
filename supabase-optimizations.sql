-- 🔧 Optimisations Supabase pour le système d'IA
-- À exécuter dans l'éditeur SQL de Supabase

-- ========================================
-- 1. INDEX OPTIMISÉS POUR LE POLLING
-- ========================================

-- Index composite pour optimiser le polling des workers
-- Permet de trouver rapidement les jobs pending d'un type spécifique
CREATE INDEX IF NOT EXISTS async_jobs_polling_idx 
ON async_jobs(status, type, created_at ASC)
WHERE status = 'pending';

-- Index pour optimiser les EXISTS dans les policies RLS
CREATE INDEX IF NOT EXISTS study_collections_user_id_composite_idx 
ON study_collections(user_id, id);

-- Index pour optimiser les requêtes sur study_collections par status
CREATE INDEX IF NOT EXISTS study_collections_user_status_idx 
ON study_collections(user_id, status, updated_at DESC);

-- ========================================
-- 2. FONCTION POSTGRESQL POUR POLLING ATOMIQUE
-- ========================================

-- Fonction pour réclamer un job de manière atomique (évite les race conditions)
CREATE OR REPLACE FUNCTION claim_next_pending_job(job_type TEXT)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  type TEXT,
  status TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ
) AS $$
DECLARE
  claimed_job RECORD;
BEGIN
  -- Sélectionner et verrouiller le premier job pending
  SELECT * INTO claimed_job
  FROM async_jobs
  WHERE status = 'pending'
    AND type = job_type
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;
  
  -- Si un job a été trouvé, le marquer comme running
  IF FOUND THEN
    UPDATE async_jobs
    SET status = 'running',
        started_at = NOW(),
        updated_at = NOW()
    WHERE async_jobs.id = claimed_job.id;
    
    -- Retourner le job réclamé
    RETURN QUERY 
    SELECT 
      claimed_job.id,
      claimed_job.user_id,
      claimed_job.type,
      'running'::TEXT as status,
      claimed_job.payload,
      claimed_job.created_at
    FROM async_jobs
    WHERE async_jobs.id = claimed_job.id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 3. VÉRIFICATIONS
-- ========================================

-- Vérifier les index créés
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('async_jobs', 'study_collections')
  AND indexname LIKE '%polling%' OR indexname LIKE '%user%'
ORDER BY tablename, indexname;

-- Vérifier que la fonction existe
SELECT 
  proname,
  prosrc
FROM pg_proc
WHERE proname = 'claim_next_pending_job';

-- ========================================
-- 4. NOTES
-- ========================================

-- Pour utiliser la fonction dans les workers :
-- SELECT * FROM claim_next_pending_job('ai-generation');
-- SELECT * FROM claim_next_pending_job('collection-generation');

-- Cette fonction garantit qu'un seul worker peut réclamer un job à la fois
-- grâce à SELECT FOR UPDATE SKIP LOCKED


