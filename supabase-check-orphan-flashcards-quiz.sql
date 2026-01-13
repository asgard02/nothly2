-- Script SQL pour identifier les flashcards et quiz orphelins
-- (collections supprimées mais flashcards/quiz restants)

-- ========================================
-- 1. Vérifier les flashcards orphelines
-- ========================================
SELECT 
  'Flashcards orphelines' as type,
  fc.id as flashcard_id,
  fc.collection_id,
  fc.question,
  fc.answer,
  fc.created_at
FROM study_collection_flashcards fc
LEFT JOIN study_collections sc ON fc.collection_id = sc.id
WHERE sc.id IS NULL
ORDER BY fc.created_at DESC;

-- Compteur de flashcards orphelines
SELECT 
  'Total flashcards orphelines' as type,
  COUNT(*) as count
FROM study_collection_flashcards fc
LEFT JOIN study_collections sc ON fc.collection_id = sc.id
WHERE sc.id IS NULL;

-- ========================================
-- 2. Vérifier les quiz orphelins
-- ========================================
SELECT 
  'Questions de quiz orphelines' as type,
  qq.id as quiz_question_id,
  qq.collection_id,
  qq.prompt,
  qq.answer,
  qq.created_at
FROM study_collection_quiz_questions qq
LEFT JOIN study_collections sc ON qq.collection_id = sc.id
WHERE sc.id IS NULL
ORDER BY qq.created_at DESC;

-- Compteur de quiz orphelins
SELECT 
  'Total questions de quiz orphelines' as type,
  COUNT(*) as count
FROM study_collection_quiz_questions qq
LEFT JOIN study_collections sc ON qq.collection_id = sc.id
WHERE sc.id IS NULL;

-- ========================================
-- 3. Vérifier les collections avec compteurs incorrects
-- ========================================
SELECT 
  sc.id as collection_id,
  sc.title,
  sc.total_flashcards as total_flashcards_claimed,
  COUNT(DISTINCT fc.id) as total_flashcards_real,
  sc.total_quiz as total_quiz_claimed,
  COUNT(DISTINCT qq.id) as total_quiz_real,
  CASE 
    WHEN sc.total_flashcards != COUNT(DISTINCT fc.id) THEN 'Compteur flashcards incorrect'
    WHEN sc.total_quiz != COUNT(DISTINCT qq.id) THEN 'Compteur quiz incorrect'
    ELSE 'OK'
  END as status
FROM study_collections sc
LEFT JOIN study_collection_flashcards fc ON sc.id = fc.collection_id
LEFT JOIN study_collection_quiz_questions qq ON sc.id = qq.collection_id
GROUP BY sc.id, sc.title, sc.total_flashcards, sc.total_quiz
HAVING sc.total_flashcards != COUNT(DISTINCT fc.id) OR sc.total_quiz != COUNT(DISTINCT qq.id)
ORDER BY sc.created_at DESC;

-- ========================================
-- 3b. Détail par collection avec toutes les flashcards/quiz
-- ========================================
SELECT 
  sc.id as collection_id,
  sc.title as collection_title,
  sc.user_id,
  sc.created_at as collection_created_at,
  COUNT(DISTINCT fc.id) as real_flashcard_count,
  COUNT(DISTINCT qq.id) as real_quiz_count,
  sc.total_flashcards as claimed_flashcard_count,
  sc.total_quiz as claimed_quiz_count
FROM study_collections sc
LEFT JOIN study_collection_flashcards fc ON sc.id = fc.collection_id
LEFT JOIN study_collection_quiz_questions qq ON sc.id = qq.collection_id
GROUP BY sc.id, sc.title, sc.user_id, sc.created_at, sc.total_flashcards, sc.total_quiz
ORDER BY sc.created_at DESC;

-- ========================================
-- 4. Statistiques générales
-- ========================================
SELECT 
  'Statistiques générales' as section,
  (SELECT COUNT(*) FROM study_collections) as total_collections,
  (SELECT COUNT(*) FROM study_collection_flashcards) as total_flashcards,
  (SELECT COUNT(*) FROM study_collection_quiz_questions) as total_quiz_questions,
  (SELECT COUNT(*) FROM study_collection_flashcards fc LEFT JOIN study_collections sc ON fc.collection_id = sc.id WHERE sc.id IS NULL) as orphan_flashcards,
  (SELECT COUNT(*) FROM study_collection_quiz_questions qq LEFT JOIN study_collections sc ON qq.collection_id = sc.id WHERE sc.id IS NULL) as orphan_quiz_questions;

-- ========================================
-- 6. Lister toutes les flashcards avec leur collection
-- ========================================
SELECT 
  fc.id as flashcard_id,
  fc.collection_id,
  sc.title as collection_title,
  sc.user_id,
  sc.collection_id as subject_collection_id,
  fc.question,
  fc.created_at
FROM study_collection_flashcards fc
LEFT JOIN study_collections sc ON fc.collection_id = sc.id
ORDER BY fc.created_at DESC;

-- ========================================
-- 6b. Vérifier les collections de flashcards par utilisateur
-- ========================================
SELECT 
  sc.id as collection_id,
  sc.title,
  sc.user_id,
  sc.collection_id as subject_collection_id,
  c.title as subject_title,
  COUNT(fc.id) as flashcard_count,
  sc.total_flashcards as claimed_flashcard_count,
  sc.created_at
FROM study_collections sc
LEFT JOIN collections c ON sc.collection_id = c.id
LEFT JOIN study_collection_flashcards fc ON sc.id = fc.collection_id
WHERE sc.total_flashcards > 0 OR EXISTS (SELECT 1 FROM study_collection_flashcards WHERE collection_id = sc.id)
GROUP BY sc.id, sc.title, sc.user_id, sc.collection_id, c.title, sc.total_flashcards, sc.created_at
ORDER BY sc.created_at DESC;

-- ========================================
-- 7. Lister toutes les questions de quiz avec leur collection
-- ========================================
SELECT 
  qq.id as quiz_question_id,
  qq.collection_id,
  sc.title as collection_title,
  sc.user_id,
  sc.collection_id as subject_collection_id,
  qq.prompt,
  qq.created_at
FROM study_collection_quiz_questions qq
LEFT JOIN study_collections sc ON qq.collection_id = sc.id
ORDER BY qq.created_at DESC;

-- ========================================
-- 7b. Vérifier les collections de quiz par utilisateur
-- ========================================
SELECT 
  sc.id as collection_id,
  sc.title,
  sc.user_id,
  sc.collection_id as subject_collection_id,
  c.title as subject_title,
  COUNT(qq.id) as quiz_count,
  sc.total_quiz as claimed_quiz_count,
  sc.created_at
FROM study_collections sc
LEFT JOIN collections c ON sc.collection_id = c.id
LEFT JOIN study_collection_quiz_questions qq ON sc.id = qq.collection_id
WHERE sc.total_quiz > 0 OR EXISTS (SELECT 1 FROM study_collection_quiz_questions WHERE collection_id = sc.id)
GROUP BY sc.id, sc.title, sc.user_id, sc.collection_id, c.title, sc.total_quiz, sc.created_at
ORDER BY sc.created_at DESC;

-- ========================================
-- 9. Identifier les collections à supprimer (pour un utilisateur spécifique)
-- ========================================
-- Remplacez 'VOTRE_USER_ID' par votre user_id réel
-- SELECT 
--   sc.id as collection_id,
--   sc.title,
--   sc.user_id,
--   COUNT(DISTINCT fc.id) as flashcard_count,
--   COUNT(DISTINCT qq.id) as quiz_count,
--   sc.created_at
-- FROM study_collections sc
-- LEFT JOIN study_collection_flashcards fc ON sc.id = fc.collection_id
-- LEFT JOIN study_collection_quiz_questions qq ON sc.id = qq.collection_id
-- WHERE sc.user_id = 'VOTRE_USER_ID'
-- GROUP BY sc.id, sc.title, sc.user_id, sc.created_at
-- ORDER BY sc.created_at DESC;

-- ========================================
-- 10. Script de nettoyage (à exécuter séparément après vérification)
-- ========================================
-- ATTENTION: Ne décommentez que si vous voulez supprimer les orphelins !

/*
-- Supprimer les flashcards orphelines
DELETE FROM study_collection_flashcards
WHERE collection_id NOT IN (SELECT id FROM study_collections);

-- Supprimer les quiz orphelins
DELETE FROM study_collection_quiz_questions
WHERE collection_id NOT IN (SELECT id FROM study_collections);

-- Corriger les compteurs des collections
UPDATE study_collections sc
SET 
  total_flashcards = (
    SELECT COUNT(*) 
    FROM study_collection_flashcards fc 
    WHERE fc.collection_id = sc.id
  ),
  total_quiz = (
    SELECT COUNT(*) 
    FROM study_collection_quiz_questions qq 
    WHERE qq.collection_id = sc.id
  );

-- Supprimer les collections vides (sans flashcards ni quiz)
DELETE FROM study_collections sc
WHERE NOT EXISTS (
  SELECT 1 FROM study_collection_flashcards WHERE collection_id = sc.id
) AND NOT EXISTS (
  SELECT 1 FROM study_collection_quiz_questions WHERE collection_id = sc.id
);
*/
