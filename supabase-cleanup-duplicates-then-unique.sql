-- Script pour nettoyer les doublons puis ajouter la contrainte unique
-- Ce script supprime les doublons en gardant le plus récent

-- 1. Ajouter la colonne type si elle n'existe pas
ALTER TABLE study_collections 
  ADD COLUMN IF NOT EXISTS type text CHECK (type IN ('flashcard', 'quiz', 'summary'));

-- 2. Mettre à jour les types existants basé sur les données actuelles
UPDATE study_collections
SET type = CASE
  WHEN total_flashcards > 0 THEN 'flashcard'
  WHEN total_quiz > 0 THEN 'quiz'
  ELSE 'summary'
END
WHERE type IS NULL;

-- 3. Rendre la colonne type non-nullable
ALTER TABLE study_collections
  ALTER COLUMN type SET NOT NULL;

-- 4. Identifier et afficher les doublons (pour information)
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT user_id, title, type, COUNT(*) as cnt
    FROM study_collections
    GROUP BY user_id, title, type
    HAVING COUNT(*) > 1
  ) duplicates;
  
  RAISE NOTICE 'Nombre de groupes de doublons trouvés: %', duplicate_count;
END $$;

-- 5. Supprimer les doublons en gardant l'enregistrement le plus récent (created_at le plus récent)
-- On garde celui avec l'id le plus grand (généralement le plus récent)
DELETE FROM study_collections
WHERE id IN (
  SELECT id
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY user_id, title, type 
             ORDER BY created_at DESC, id DESC
           ) as rn
    FROM study_collections
  ) ranked
  WHERE rn > 1
);

-- 6. Ajouter la contrainte unique sur (user_id, title, type)
ALTER TABLE study_collections 
  ADD CONSTRAINT unique_study_collection_title_per_type 
  UNIQUE (user_id, title, type);

-- 7. Créer un index pour améliorer les performances des requêtes par type
CREATE INDEX IF NOT EXISTS study_collections_type_idx ON study_collections(user_id, type);

-- Message de confirmation
DO $$
BEGIN
  RAISE NOTICE '✅ Nettoyage terminé et contrainte unique créée avec succès!';
END $$;
