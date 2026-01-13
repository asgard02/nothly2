-- Requête : USER_ID avec email et nombre de COLLECTIONS actives uniquement
-- ⚠️ Cette version compte SEULEMENT les collections, pas les éléments individuels
-- Le statut "actif" correspond à status = 'ready' dans study_collections

SELECT 
  u.id as user_id,
  u.email,
  COUNT(*) as count_collections_actives
FROM (
  -- Collections flashcards actives
  SELECT DISTINCT sc.user_id, sc.id
  FROM study_collections sc
  WHERE sc.status = 'ready'
    AND (sc.type = 'flashcard' OR sc.total_flashcards > 0)
  
  UNION
  
  -- Collections quiz actives
  SELECT DISTINCT sc.user_id, sc.id
  FROM study_collections sc 
  WHERE sc.status = 'ready'
    AND (sc.type = 'quiz' OR sc.total_quiz > 0)
  
  UNION
  
  -- Collections résumés actives
  SELECT DISTINCT sc.user_id, sc.id
  FROM study_collections sc
  WHERE sc.status = 'ready'
    AND (sc.type = 'summary' OR (sc.total_flashcards = 0 AND sc.total_quiz = 0))
) all_collections
INNER JOIN users u ON all_collections.user_id = u.id
GROUP BY u.id, u.email
ORDER BY u.email;
