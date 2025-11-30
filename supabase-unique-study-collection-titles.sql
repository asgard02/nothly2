-- Migration pour ajouter une contrainte d'unicité sur les titres par type
-- Cela empêche d'avoir deux flashcards/quiz/summaries avec le même nom

-- 1. Ajouter la colonne type si elle n'existe pas
ALTER TABLE study_collections 
  ADD COLUMN IF NOT EXISTS type text CHECK (type IN ('flashcard', 'quiz', 'summary'));

-- 2. Mettre à jour les types existants basé sur les données actuelles
-- (flashcards si total_flashcards > 0, quiz si total_quiz > 0, sinon summary)
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

-- 4. Ajouter la contrainte unique sur (user_id, title, type)
-- Cela permet d'avoir "Mathématiques" en flashcard ET "Mathématiques" en quiz
-- MAIS empêche d'avoir deux quiz appelés "Mathématiques"
ALTER TABLE study_collections 
  ADD CONSTRAINT unique_study_collection_title_per_type 
  UNIQUE (user_id, title, type);

-- 5. Créer un index pour améliorer les performances des requêtes par type
CREATE INDEX IF NOT EXISTS study_collections_type_idx ON study_collections(user_id, type);
