-- Requête simple : USER_ID avec email et nombre d'éléments actifs
-- Le statut "actif" correspond à status = 'ready' dans study_collections
-- ⚠️ Cette requête compte les COLLECTIONS + les éléments individuels (flashcards et quiz)

SELECT 
  u.id as user_id,
  u.email,
  COUNT(*) as count_actif,
  -- Détail du décompte
  COUNT(DISTINCT CASE WHEN type_element = 'COLLECTION' THEN element_id END) as nb_collections,
  COUNT(CASE WHEN type_element = 'FLASHCARD' THEN 1 END) as nb_flashcards_individuelles,
  COUNT(CASE WHEN type_element = 'QUIZ' THEN 1 END) as nb_quiz_individuels
FROM (
  -- Collections flashcards actives
  SELECT sc.user_id, sc.id as element_id, 'COLLECTION' as type_element
  FROM study_collections sc
  WHERE sc.status = 'ready'
    AND (sc.type = 'flashcard' OR sc.total_flashcards > 0)
  
  UNION ALL
  
  -- Collections quiz actives
  SELECT sc.user_id, sc.id as element_id, 'COLLECTION' as type_element
  FROM study_collections sc
  WHERE sc.status = 'ready'
    AND (sc.type = 'quiz' OR sc.total_quiz > 0)
  
  UNION ALL
  
  -- Collections résumés actives
  SELECT sc.user_id, sc.id as element_id, 'COLLECTION' as type_element
  FROM study_collections sc
  WHERE sc.status = 'ready'
    AND (sc.type = 'summary' OR (sc.total_flashcards = 0 AND sc.total_quiz = 0))
  
  UNION ALL
  
  -- Flashcards individuelles actives (chaque flashcard est comptée)
  SELECT sc.user_id, fc.id as element_id, 'FLASHCARD' as type_element
  FROM study_collections sc
  INNER JOIN study_collection_flashcards fc ON sc.id = fc.collection_id
  WHERE sc.status = 'ready'
    AND (sc.type = 'flashcard' OR sc.total_flashcards > 0)
  
  UNION ALL
  
  -- Quiz individuels actifs (chaque question de quiz est comptée)
  SELECT sc.user_id, qq.id as element_id, 'QUIZ' as type_element
  FROM study_collections sc
  INNER JOIN study_collection_quiz_questions qq ON sc.id = qq.collection_id
  WHERE sc.status = 'ready'
    AND (sc.type = 'quiz' OR sc.total_quiz > 0)
) all_actifs
INNER JOIN users u ON all_actifs.user_id = u.id
GROUP BY u.id, u.email
ORDER BY u.email;
