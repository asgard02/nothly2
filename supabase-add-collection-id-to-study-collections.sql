-- Ajouter le champ collection_id à study_collections pour lier les flashcards/quiz aux collections principales
-- Ce script permet de lier les study_collections (flashcards/quiz) aux collections (dossiers)

-- 1. Ajouter la colonne collection_id (nullable pour rétrocompatibilité)
ALTER TABLE study_collections 
ADD COLUMN IF NOT EXISTS collection_id uuid REFERENCES collections(id) ON DELETE CASCADE;

-- 2. Créer un index pour améliorer les performances des requêtes
CREATE INDEX IF NOT EXISTS study_collections_collection_id_idx ON study_collections(collection_id);

-- 3. Commentaire pour documenter le champ
COMMENT ON COLUMN study_collections.collection_id IS 'Lien vers la collection principale (dossier) qui contient ces flashcards/quiz';


