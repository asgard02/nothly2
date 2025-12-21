-- Script pour ajouter le système d'archivage aux collections
-- Exécuter dans l'éditeur SQL de Supabase

-- ============================================================================
-- ÉTAPE 1 : Ajouter la colonne is_archived à la table collections
-- ============================================================================

-- Ajouter la colonne is_archived (par défaut false)
ALTER TABLE collections 
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false NOT NULL;

-- Créer un index pour améliorer les performances des requêtes
CREATE INDEX IF NOT EXISTS idx_collections_is_archived 
ON collections(is_archived);

-- Créer un index composite pour user_id + is_archived
CREATE INDEX IF NOT EXISTS idx_collections_user_archived 
ON collections(user_id, is_archived);

-- ============================================================================
-- ÉTAPE 2 : Archiver la collection "Documents Récupérés"
-- ============================================================================

-- Marquer la collection "Documents Récupérés" comme archivée
UPDATE collections
SET is_archived = true
WHERE title = '📦 Documents Récupérés';

-- ============================================================================
-- ÉTAPE 3 : Vérification
-- ============================================================================

-- Afficher toutes les collections avec leur statut d'archivage
SELECT 
  id,
  title,
  is_archived,
  created_at,
  (SELECT COUNT(*) FROM documents WHERE collection_id = collections.id) as document_count
FROM collections
ORDER BY is_archived, created_at DESC;

-- Compter les collections actives vs archivées
SELECT 
  is_archived,
  COUNT(*) as count
FROM collections
GROUP BY is_archived;

-- Afficher les documents dans les collections archivées
SELECT 
  c.title as collection_title,
  COUNT(d.id) as document_count
FROM collections c
LEFT JOIN documents d ON d.collection_id = c.id
WHERE c.is_archived = true
GROUP BY c.id, c.title;
