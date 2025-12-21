-- Script de diagnostic pour identifier les incohérences dans la base de données
-- Exécuter dans l'éditeur SQL de Supabase

-- 1. Compter les documents par user_id
SELECT 
  user_id,
  COUNT(*) as document_count
FROM documents
GROUP BY user_id
ORDER BY document_count DESC;

-- 2. Compter les collections par user_id
SELECT 
  user_id,
  COUNT(*) as collection_count
FROM collections
GROUP BY user_id
ORDER BY collection_count DESC;

-- 3. Trouver les documents orphelins (sans collection valide)
SELECT 
  d.id,
  d.title,
  d.user_id,
  d.collection_id,
  d.created_at
FROM documents d
LEFT JOIN collections c ON d.collection_id = c.id
WHERE c.id IS NULL
ORDER BY d.created_at DESC
LIMIT 20;

-- 4. Compter les documents orphelins par user_id
SELECT 
  d.user_id,
  COUNT(*) as orphan_document_count
FROM documents d
LEFT JOIN collections c ON d.collection_id = c.id
WHERE c.id IS NULL
GROUP BY d.user_id
ORDER BY orphan_document_count DESC;

-- 5. Vérifier si les documents et collections ont le même user_id
SELECT 
  d.id as document_id,
  d.title as document_title,
  d.user_id as document_user_id,
  c.id as collection_id,
  c.title as collection_title,
  c.user_id as collection_user_id,
  CASE 
    WHEN d.user_id = c.user_id THEN 'OK'
    ELSE 'MISMATCH'
  END as user_id_match
FROM documents d
JOIN collections c ON d.collection_id = c.id
WHERE d.user_id != c.user_id
LIMIT 20;
