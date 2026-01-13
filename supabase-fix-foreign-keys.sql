-- 🔧 Script pour corriger les foreign keys incohérentes
-- Problème : Certaines tables référencent public.users, d'autres auth.users
-- Solution : Tout référencer vers auth.users pour être cohérent avec Supabase Auth

-- ========================================
-- 1. SUPPRIMER LES ANCIENNES FOREIGN KEYS
-- ========================================

-- Supprimer les anciennes foreign keys (peuvent avoir des noms différents)
-- On supprime toutes les contraintes possibles pour être sûr

-- async_jobs : supprimer toutes les contraintes user_id possibles
DO $$
DECLARE
  constraint_name text;
BEGIN
  -- Trouver et supprimer toutes les contraintes de foreign key sur user_id
  FOR constraint_name IN
    SELECT tc.constraint_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'async_jobs'
      AND kcu.column_name = 'user_id'
      AND tc.constraint_type = 'FOREIGN KEY'
  LOOP
    EXECUTE format('ALTER TABLE public.async_jobs DROP CONSTRAINT IF EXISTS %I', constraint_name);
    RAISE NOTICE 'Supprimé contrainte: %', constraint_name;
  END LOOP;
END $$;

-- study_collections : supprimer toutes les contraintes user_id possibles
DO $$
DECLARE
  constraint_name text;
BEGIN
  -- Trouver et supprimer toutes les contraintes de foreign key sur user_id
  FOR constraint_name IN
    SELECT tc.constraint_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'study_collections'
      AND kcu.column_name = 'user_id'
      AND tc.constraint_type = 'FOREIGN KEY'
  LOOP
    EXECUTE format('ALTER TABLE public.study_collections DROP CONSTRAINT IF EXISTS %I', constraint_name);
    RAISE NOTICE 'Supprimé contrainte: %', constraint_name;
  END LOOP;
END $$;

-- ========================================
-- 2. CRÉER LES NOUVELLES FOREIGN KEYS VERS auth.users
-- ========================================

-- async_jobs.user_id → auth.users(id)
ALTER TABLE IF EXISTS public.async_jobs
  ADD CONSTRAINT async_jobs_user_id_auth_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

-- study_collections.user_id → auth.users(id)
ALTER TABLE IF EXISTS public.study_collections
  ADD CONSTRAINT study_collections_user_id_auth_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

-- ========================================
-- 3. VÉRIFIER QUE public.users EXISTE ENCORE
-- ========================================

-- Note : public.users devrait exister pour stocker les métadonnées supplémentaires
-- Mais les foreign keys doivent pointer vers auth.users pour être cohérent

-- ========================================
-- 4. VÉRIFICATION DES FOREIGN KEYS EXISTANTES
-- ========================================

-- Vérifier toutes les foreign keys vers users
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_schema AS foreign_table_schema,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND (kcu.column_name = 'user_id' OR ccu.column_name = 'id')
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- ========================================
-- 5. VÉRIFIER LES RELATIONS DOCUMENTS
-- ========================================

-- Vérifier la chaîne de foreign keys après documents
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS references_table,
  ccu.column_name AS references_column
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND (
    tc.table_name IN ('documents', 'document_versions', 'document_sections') OR
    ccu.table_name IN ('documents', 'document_versions', 'document_sections')
  )
ORDER BY 
  CASE tc.table_name
    WHEN 'documents' THEN 1
    WHEN 'document_versions' THEN 2
    WHEN 'document_sections' THEN 3
    ELSE 4
  END,
  kcu.column_name;

SELECT '✅ Script terminé - Foreign keys corrigées' as status;

