-- Requête détaillée pour comprendre d'où viennent les éléments actifs
-- Remplacez '52b54b05-f4bc-43ef-a797-1cad08c12d45' par votre user_id

-- ========================================
-- DÉTAIL COMPLET DES ÉLÉMENTS ACTIFS PAR UTILISATEUR
-- ========================================
SELECT 
  u.id as user_id,
  u.email,
  'COLLECTION_FLASHCARD' as type_element,
  sc.id as collection_id,
  sc.title as collection_title,
  NULL::uuid as element_id,
  sc.total_flashcards as total_claimed,
  (SELECT COUNT(*) FROM study_collection_flashcards WHERE collection_id = sc.id) as total_real
FROM users u
INNER JOIN study_collections sc ON sc.user_id = u.id
WHERE sc.status = 'ready'
  AND (sc.type = 'flashcard' OR sc.total_flashcards > 0)
  -- Décommentez la ligne suivante pour filtrer par user_id spécifique :
  -- AND u.id = '52b54b05-f4bc-43ef-a797-1cad08c12d45'

UNION ALL

SELECT 
  u.id as user_id,
  u.email,
  'COLLECTION_QUIZ' as type_element,
  sc.id as collection_id,
  sc.title as collection_title,
  NULL::uuid as element_id,
  sc.total_quiz as total_claimed,
  (SELECT COUNT(*) FROM study_collection_quiz_questions WHERE collection_id = sc.id) as total_real
FROM users u
INNER JOIN study_collections sc ON sc.user_id = u.id
WHERE sc.status = 'ready'
  AND (sc.type = 'quiz' OR sc.total_quiz > 0)
  -- AND u.id = '52b54b05-f4bc-43ef-a797-1cad08c12d45'

UNION ALL

SELECT 
  u.id as user_id,
  u.email,
  'COLLECTION_RESUME' as type_element,
  sc.id as collection_id,
  sc.title as collection_title,
  NULL::uuid as element_id,
  sc.total_sources as total_claimed,
  0 as total_real
FROM users u
INNER JOIN study_collections sc ON sc.user_id = u.id
WHERE sc.status = 'ready'
  AND (sc.type = 'summary' OR (sc.total_flashcards = 0 AND sc.total_quiz = 0))
  -- AND u.id = '52b54b05-f4bc-43ef-a797-1cad08c12d45'

UNION ALL

SELECT 
  u.id as user_id,
  u.email,
  'FLASHCARD_INDIVIDUELLE' as type_element,
  sc.id as collection_id,
  sc.title as collection_title,
  fc.id as element_id,
  1 as total_claimed,
  1 as total_real
FROM users u
INNER JOIN study_collections sc ON sc.user_id = u.id
INNER JOIN study_collection_flashcards fc ON sc.id = fc.collection_id
WHERE sc.status = 'ready'
  AND (sc.type = 'flashcard' OR sc.total_flashcards > 0)
  -- AND u.id = '52b54b05-f4bc-43ef-a797-1cad08c12d45'

UNION ALL

SELECT 
  u.id as user_id,
  u.email,
  'QUIZ_QUESTION_INDIVIDUELLE' as type_element,
  sc.id as collection_id,
  sc.title as collection_title,
  qq.id as element_id,
  1 as total_claimed,
  1 as total_real
FROM users u
INNER JOIN study_collections sc ON sc.user_id = u.id
INNER JOIN study_collection_quiz_questions qq ON sc.id = qq.collection_id
WHERE sc.status = 'ready'
  AND (sc.type = 'quiz' OR sc.total_quiz > 0)
  -- AND u.id = '52b54b05-f4bc-43ef-a797-1cad08c12d45'

ORDER BY user_id, email, type_element, collection_id, element_id;

-- ========================================
-- RÉSUMÉ PAR UTILISATEUR (comme avant mais avec détail)
-- ========================================
SELECT 
  u.id as user_id,
  u.email,
  COUNT(DISTINCT CASE WHEN type_element = 'COLLECTION_FLASHCARD' THEN collection_id END) as nb_collections_flashcards,
  COUNT(DISTINCT CASE WHEN type_element = 'COLLECTION_QUIZ' THEN collection_id END) as nb_collections_quiz,
  COUNT(DISTINCT CASE WHEN type_element = 'COLLECTION_RESUME' THEN collection_id END) as nb_collections_resumes,
  COUNT(CASE WHEN type_element = 'FLASHCARD_INDIVIDUELLE' THEN 1 END) as nb_flashcards_individuelles,
  COUNT(CASE WHEN type_element = 'QUIZ_QUESTION_INDIVIDUELLE' THEN 1 END) as nb_quiz_individuels,
  COUNT(*) as total_elements_actifs
FROM users u
LEFT JOIN (
  SELECT 
    sc.user_id,
    'COLLECTION_FLASHCARD' as type_element,
    sc.id as collection_id,
    NULL::uuid as element_id
  FROM study_collections sc
  WHERE sc.status = 'ready'
    AND (sc.type = 'flashcard' OR sc.total_flashcards > 0)
  
  UNION ALL
  
  SELECT 
    sc.user_id,
    'COLLECTION_QUIZ' as type_element,
    sc.id as collection_id,
    NULL::uuid as element_id
  FROM study_collections sc
  WHERE sc.status = 'ready'
    AND (sc.type = 'quiz' OR sc.total_quiz > 0)
  
  UNION ALL
  
  SELECT 
    sc.user_id,
    'COLLECTION_RESUME' as type_element,
    sc.id as collection_id,
    NULL::uuid as element_id
  FROM study_collections sc
  WHERE sc.status = 'ready'
    AND (sc.type = 'summary' OR (sc.total_flashcards = 0 AND sc.total_quiz = 0))
  
  UNION ALL
  
  SELECT 
    sc.user_id,
    'FLASHCARD_INDIVIDUELLE' as type_element,
    sc.id as collection_id,
    fc.id as element_id
  FROM study_collections sc
  INNER JOIN study_collection_flashcards fc ON sc.id = fc.collection_id
  WHERE sc.status = 'ready'
    AND (sc.type = 'flashcard' OR sc.total_flashcards > 0)
  
  UNION ALL
  
  SELECT 
    sc.user_id,
    'QUIZ_QUESTION_INDIVIDUELLE' as type_element,
    sc.id as collection_id,
    qq.id as element_id
  FROM study_collections sc
  INNER JOIN study_collection_quiz_questions qq ON sc.id = qq.collection_id
  WHERE sc.status = 'ready'
    AND (sc.type = 'quiz' OR sc.total_quiz > 0)
) all_actifs ON u.id = all_actifs.user_id
GROUP BY u.id, u.email
HAVING COUNT(*) > 0
ORDER BY u.email;
