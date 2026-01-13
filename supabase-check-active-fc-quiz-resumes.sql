-- Script SQL pour identifier les flashcards, quiz et résumés avec le statut actif
-- Le statut "actif" correspond à status = 'ready' dans study_collections

-- ========================================
-- REQUÊTE PRINCIPALE : USER_ID AVEC NOMBRE D'ÉLÉMENTS ACTIFS
-- ========================================
SELECT 
  user_id,
  COUNT(*) as count_actif
FROM (
  -- Collections flashcards actives
  SELECT sc.user_id, sc.id
  FROM study_collections sc
  WHERE sc.status = 'ready'
    AND (sc.type = 'flashcard' OR sc.total_flashcards > 0)
  
  UNION ALL
  
  -- Collections quiz actives
  SELECT sc.user_id, sc.id
  FROM study_collections sc
  WHERE sc.status = 'ready'
    AND (sc.type = 'quiz' OR sc.total_quiz > 0)
  
  UNION ALL
  
  -- Collections résumés actives
  SELECT sc.user_id, sc.id
  FROM study_collections sc
  WHERE sc.status = 'ready'
    AND (sc.type = 'summary' OR (sc.total_flashcards = 0 AND sc.total_quiz = 0))
  
  UNION ALL
  
  -- Flashcards individuelles actives
  SELECT sc.user_id, fc.id
  FROM study_collections sc
  INNER JOIN study_collection_flashcards fc ON sc.id = fc.collection_id
  WHERE sc.status = 'ready'
    AND (sc.type = 'flashcard' OR sc.total_flashcards > 0)
  
  UNION ALL
  
  -- Quiz individuels actifs
  SELECT sc.user_id, qq.id
  FROM study_collections sc
  INNER JOIN study_collection_quiz_questions qq ON sc.id = qq.collection_id
  WHERE sc.status = 'ready'
    AND (sc.type = 'quiz' OR sc.total_quiz > 0)
) all_actifs
GROUP BY user_id
ORDER BY user_id;

-- ========================================
-- 0. VUE DÉTAILLÉE COMPLÈTE - TOUS LES IDs PAR UTILISATEUR
-- ========================================
-- Cette requête liste tous les IDs détaillés pour chaque utilisateur
SELECT 
  sc.user_id,
  'FLASHCARD' as type_element,
  sc.id as collection_id,
  sc.title as collection_title,
  fc.id::text as element_id,
  LEFT(fc.question, 50) as element_preview,
  sc.collection_id as subject_collection_id,
  sc.status,
  fc.order_index,
  sc.created_at
FROM study_collections sc
INNER JOIN study_collection_flashcards fc ON sc.id = fc.collection_id
WHERE sc.status = 'ready'
  AND (sc.type = 'flashcard' OR sc.total_flashcards > 0)

UNION ALL

SELECT 
  sc.user_id,
  'QUIZ' as type_element,
  sc.id as collection_id,
  sc.title as collection_title,
  qq.id::text as element_id,
  LEFT(qq.prompt, 50) as element_preview,
  sc.collection_id as subject_collection_id,
  sc.status,
  qq.order_index,
  sc.created_at
FROM study_collections sc
INNER JOIN study_collection_quiz_questions qq ON sc.id = qq.collection_id
WHERE sc.status = 'ready'
  AND (sc.type = 'quiz' OR sc.total_quiz > 0)

UNION ALL

SELECT 
  sc.user_id,
  'RESUME' as type_element,
  sc.id as collection_id,
  sc.title as collection_title,
  NULL::text as element_id,
  NULL::text as element_preview,
  sc.collection_id as subject_collection_id,
  sc.status,
  0 as order_index,
  sc.created_at
FROM study_collections sc
WHERE sc.status = 'ready'
  AND (sc.type = 'summary' OR (sc.total_flashcards = 0 AND sc.total_quiz = 0))

ORDER BY user_id, collection_id, order_index;

-- ========================================
-- 1. FLASHCARDS ACTIFS (avec tous les IDs détaillés)
-- ========================================
SELECT 
  'FLASHCARD ACTIF' as type,
  sc.user_id,
  sc.id as collection_id,
  sc.title as collection_title,
  fc.id as flashcard_id,
  sc.collection_id as subject_collection_id,
  c.title as subject_title,
  sc.status,
  sc.type,
  sc.total_flashcards as total_claimed,
  COUNT(*) OVER (PARTITION BY sc.id) as total_real_in_collection,
  fc.order_index,
  sc.created_at,
  sc.updated_at
FROM study_collections sc
INNER JOIN study_collection_flashcards fc ON sc.id = fc.collection_id
LEFT JOIN collections c ON sc.collection_id = c.id
WHERE sc.status = 'ready'
  AND (
    sc.type = 'flashcard' 
    OR sc.total_flashcards > 0
    OR EXISTS (SELECT 1 FROM study_collection_flashcards WHERE collection_id = sc.id)
  )
ORDER BY sc.user_id, sc.id, fc.order_index;

-- ========================================
-- 2. QUIZ ACTIFS (avec tous les IDs détaillés)
-- ========================================
SELECT 
  'QUIZ ACTIF' as type,
  sc.user_id,
  sc.id as collection_id,
  sc.title as collection_title,
  qq.id as quiz_question_id,
  sc.collection_id as subject_collection_id,
  c.title as subject_title,
  sc.status,
  sc.type,
  sc.total_quiz as total_claimed,
  COUNT(*) OVER (PARTITION BY sc.id) as total_real_in_collection,
  qq.order_index,
  qq.question_type,
  sc.created_at,
  sc.updated_at
FROM study_collections sc
INNER JOIN study_collection_quiz_questions qq ON sc.id = qq.collection_id
LEFT JOIN collections c ON sc.collection_id = c.id
WHERE sc.status = 'ready'
  AND (
    sc.type = 'quiz' 
    OR sc.total_quiz > 0
    OR EXISTS (SELECT 1 FROM study_collection_quiz_questions WHERE collection_id = sc.id)
  )
ORDER BY sc.user_id, sc.id, qq.order_index;

-- ========================================
-- 3. RÉSUMÉS ACTIFS (avec tous les IDs détaillés)
-- ========================================
SELECT 
  'RESUME ACTIF' as type,
  sc.user_id,
  sc.id as collection_id,
  sc.title as collection_title,
  sc.collection_id as subject_collection_id,
  c.title as subject_title,
  sc.status,
  sc.type,
  sc.total_sources as total_sources,
  sc.created_at,
  sc.updated_at
FROM study_collections sc
LEFT JOIN collections c ON sc.collection_id = c.id
WHERE sc.status = 'ready'
  AND (
    sc.type = 'summary'
    OR (sc.total_flashcards = 0 AND sc.total_quiz = 0)
  )
ORDER BY sc.user_id, sc.created_at DESC;

-- ========================================
-- 4. LISTE SIMPLE DES IDs DE COLLECTIONS PAR UTILISATEUR
-- ========================================
SELECT 
  sc.user_id,
  sc.id as collection_id,
  sc.title as collection_title,
  CASE 
    WHEN sc.type = 'flashcard' OR sc.total_flashcards > 0 THEN 'FLASHCARD'
    WHEN sc.type = 'quiz' OR sc.total_quiz > 0 THEN 'QUIZ'
    WHEN sc.type = 'summary' OR (sc.total_flashcards = 0 AND sc.total_quiz = 0) THEN 'RESUME'
    ELSE 'AUTRE'
  END as type_collection,
  sc.collection_id as subject_collection_id,
  sc.status,
  sc.created_at
FROM study_collections sc
WHERE sc.status = 'ready'
ORDER BY sc.user_id, type_collection, sc.id;

-- ========================================
-- 5. LISTE COMPLÈTE DES IDs PAR UTILISATEUR - UNE LIGNE PAR ID
-- ========================================
-- Tous les IDs de collections flashcards par utilisateur
SELECT 
  sc.user_id,
  'COLLECTION_FLASHCARD' as type_id,
  sc.id as id_element,
  sc.title as titre,
  NULL::uuid as parent_id,
  sc.collection_id as subject_collection_id
FROM study_collections sc
WHERE sc.status = 'ready'
  AND (sc.type = 'flashcard' OR sc.total_flashcards > 0)

UNION ALL

-- Tous les IDs de collections quiz par utilisateur
SELECT 
  sc.user_id,
  'COLLECTION_QUIZ' as type_id,
  sc.id as id_element,
  sc.title as titre,
  NULL::uuid as parent_id,
  sc.collection_id as subject_collection_id
FROM study_collections sc
WHERE sc.status = 'ready'
  AND (sc.type = 'quiz' OR sc.total_quiz > 0)

UNION ALL

-- Tous les IDs de collections résumés par utilisateur
SELECT 
  sc.user_id,
  'COLLECTION_RESUME' as type_id,
  sc.id as id_element,
  sc.title as titre,
  NULL::uuid as parent_id,
  sc.collection_id as subject_collection_id
FROM study_collections sc
WHERE sc.status = 'ready'
  AND (sc.type = 'summary' OR (sc.total_flashcards = 0 AND sc.total_quiz = 0))

UNION ALL

-- Tous les IDs de flashcards individuels par utilisateur
SELECT 
  sc.user_id,
  'FLASHCARD' as type_id,
  fc.id as id_element,
  LEFT(fc.question, 100) as titre,
  fc.collection_id as parent_id,
  sc.collection_id as subject_collection_id
FROM study_collections sc
INNER JOIN study_collection_flashcards fc ON sc.id = fc.collection_id
WHERE sc.status = 'ready'
  AND (sc.type = 'flashcard' OR sc.total_flashcards > 0)

UNION ALL

-- Tous les IDs de quiz individuels par utilisateur
SELECT 
  sc.user_id,
  'QUIZ_QUESTION' as type_id,
  qq.id as id_element,
  LEFT(qq.prompt, 100) as titre,
  qq.collection_id as parent_id,
  sc.collection_id as subject_collection_id
FROM study_collections sc
INNER JOIN study_collection_quiz_questions qq ON sc.id = qq.collection_id
WHERE sc.status = 'ready'
  AND (sc.type = 'quiz' OR sc.total_quiz > 0)

ORDER BY user_id, type_id, id_element;

-- ========================================
-- 6. USER_ID AVEC NOMBRE D'ÉLÉMENTS ACTIFS (identique à la requête principale)
-- ========================================
-- Voir la requête principale en haut du fichier

-- ========================================
-- 7. STATISTIQUES GLOBALES (TOUS UTILISATEURS CONFONDUS)
-- ========================================
SELECT 
  'STATISTIQUES GLOBALES' as type,
  COUNT(DISTINCT sc.user_id) as nombre_utilisateurs,
  COUNT(DISTINCT CASE WHEN sc.status = 'ready' AND (sc.type = 'flashcard' OR sc.total_flashcards > 0) THEN sc.id END) as collections_flashcards_actives,
  COUNT(DISTINCT CASE WHEN sc.status = 'ready' AND (sc.type = 'quiz' OR sc.total_quiz > 0) THEN sc.id END) as collections_quiz_actives,
  COUNT(DISTINCT CASE WHEN sc.status = 'ready' AND (sc.type = 'summary' OR (sc.total_flashcards = 0 AND sc.total_quiz = 0)) THEN sc.id END) as collections_resumes_actives,
  (SELECT COUNT(*) FROM study_collection_flashcards fc 
   INNER JOIN study_collections sc2 ON fc.collection_id = sc2.id 
   WHERE sc2.status = 'ready') as total_flashcards_actifs,
  (SELECT COUNT(*) FROM study_collection_quiz_questions qq 
   INNER JOIN study_collections sc3 ON qq.collection_id = sc3.id 
   WHERE sc3.status = 'ready') as total_quiz_actifs
FROM study_collections sc;
