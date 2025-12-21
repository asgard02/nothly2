-- Script pour récupérer les documents orphelins
-- Exécuter dans l'éditeur SQL de Supabase

-- ============================================================================
-- ÉTAPE 1 : Créer une collection de récupération pour chaque utilisateur ayant des documents orphelins
-- ============================================================================

-- Créer une collection "Documents Récupérés" pour l'utilisateur avec des documents orphelins
-- Cette collection sera automatiquement archivée (is_archived = true)
INSERT INTO collections (user_id, title, color, is_archived, created_at, updated_at)
SELECT DISTINCT
  d.user_id,
  '📦 Documents Récupérés',
  'from-amber-500/20 via-orange-400/10 to-red-500/20',
  true, -- Archiver automatiquement cette collection
  NOW(),
  NOW()
FROM documents d
LEFT JOIN collections c ON d.collection_id = c.id
WHERE c.id IS NULL
  AND NOT EXISTS (
    -- Ne créer la collection que si elle n'existe pas déjà
    SELECT 1 FROM collections 
    WHERE user_id = d.user_id 
    AND title = '📦 Documents Récupérés'
  )
GROUP BY d.user_id;

-- ============================================================================
-- ÉTAPE 2 : Rattacher les documents orphelins à la collection de récupération
-- ============================================================================

-- Mettre à jour les documents orphelins pour les rattacher à la collection de récupération
UPDATE documents d
SET collection_id = (
  SELECT c.id 
  FROM collections c 
  WHERE c.user_id = d.user_id 
  AND c.title = '📦 Documents Récupérés'
  LIMIT 1
)
WHERE d.collection_id NOT IN (SELECT id FROM collections)
  OR d.collection_id IS NULL;

-- ============================================================================
-- ÉTAPE 3 : Vérification
-- ============================================================================

-- Vérifier qu'il n'y a plus de documents orphelins
SELECT 
  'Documents orphelins restants' as status,
  COUNT(*) as count
FROM documents d
LEFT JOIN collections c ON d.collection_id = c.id
WHERE c.id IS NULL;

-- Afficher la collection de récupération et son contenu
SELECT 
  c.id,
  c.title,
  c.user_id,
  COUNT(d.id) as document_count,
  c.created_at
FROM collections c
LEFT JOIN documents d ON d.collection_id = c.id
WHERE c.title = '📦 Documents Récupérés'
GROUP BY c.id, c.title, c.user_id, c.created_at;

-- Afficher les documents récupérés
SELECT 
  d.id,
  d.title,
  d.status,
  c.title as collection_title,
  d.created_at
FROM documents d
JOIN collections c ON d.collection_id = c.id
WHERE c.title = '📦 Documents Récupérés'
ORDER BY d.created_at DESC
LIMIT 50;
