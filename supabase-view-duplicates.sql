-- Script pour VISUALISER les doublons avant de les supprimer
-- Exécutez ceci AVANT le script de nettoyage pour voir ce qui sera supprimé

-- 1. D'abord, ajouter temporairement la colonne type si elle n'existe pas
ALTER TABLE study_collections 
  ADD COLUMN IF NOT EXISTS type text;

-- 2. Mettre à jour les types existants 
UPDATE study_collections
SET type = CASE
  WHEN total_flashcards > 0 THEN 'flashcard'
  WHEN total_quiz > 0 THEN 'quiz'
  ELSE 'summary'
END
WHERE type IS NULL;

-- 3. Afficher tous les doublons avec leurs détails
SELECT 
  user_id,
  title,
  type,
  COUNT(*) as nombre_doublons,
  STRING_AGG(id::text, ', ' ORDER BY created_at DESC) as ids,
  STRING_AGG(created_at::text, ', ' ORDER BY created_at DESC) as dates_creation
FROM study_collections
GROUP BY user_id, title, type
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC, title;

-- 4. Afficher les détails de TOUS les doublons (pour voir lequel sera gardé)
SELECT 
  sc.id,
  sc.user_id,
  sc.title,
  sc.type,
  sc.created_at,
  sc.total_flashcards,
  sc.total_quiz,
  ROW_NUMBER() OVER (
    PARTITION BY sc.user_id, sc.title, sc.type 
    ORDER BY sc.created_at DESC, sc.id DESC
  ) as rang,
  CASE 
    WHEN ROW_NUMBER() OVER (
      PARTITION BY sc.user_id, sc.title, sc.type 
      ORDER BY sc.created_at DESC, sc.id DESC
    ) = 1 THEN '✅ GARDER'
    ELSE '❌ SUPPRIMER'
  END as action
FROM study_collections sc
WHERE (sc.user_id, sc.title, sc.type) IN (
  SELECT user_id, title, type
  FROM study_collections
  GROUP BY user_id, title, type
  HAVING COUNT(*) > 1
)
ORDER BY sc.title, sc.type, sc.created_at DESC;
