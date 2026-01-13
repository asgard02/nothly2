-- Script SQL pour nettoyer les données excédentaires
-- Basé sur l'état réel : 1 matière, 1 flashcard, 1 quiz, 2 résumés actifs

-- ========================================
-- 1. Identifier toutes les matières (collections)
-- ========================================
SELECT 
  'Toutes les matieres' as type,
  id,
  title,
  user_id,
  created_at,
  updated_at
FROM collections
ORDER BY created_at DESC;

-- ========================================
-- 2. Identifier toutes les collections d'etude (study_collections)
-- ========================================
SELECT 
  'Toutes les collections d etude' as type,
  sc.id,
  sc.title,
  sc.user_id,
  sc.collection_id,
  c.title as subject_title,
  sc.total_flashcards,
  sc.total_quiz,
  sc.status,
  sc.created_at
FROM study_collections sc
LEFT JOIN collections c ON sc.collection_id = c.id
ORDER BY sc.created_at DESC;

-- ========================================
-- 3. Compter les flashcards par collection
-- ========================================
SELECT 
  'Flashcards par collection' as type,
  sc.id as collection_id,
  sc.title as collection_title,
  sc.user_id,
  COUNT(fc.id) as flashcard_count,
  sc.total_flashcards as claimed_count
FROM study_collections sc
LEFT JOIN study_collection_flashcards fc ON sc.id = fc.collection_id
GROUP BY sc.id, sc.title, sc.user_id, sc.total_flashcards
HAVING COUNT(fc.id) > 0
ORDER BY sc.created_at DESC;

-- ========================================
-- 4. Compter les quiz par collection
-- ========================================
SELECT 
  'Quiz par collection' as type,
  sc.id as collection_id,
  sc.title as collection_title,
  sc.user_id,
  COUNT(qq.id) as quiz_count,
  sc.total_quiz as claimed_count
FROM study_collections sc
LEFT JOIN study_collection_quiz_questions qq ON sc.id = qq.collection_id
GROUP BY sc.id, sc.title, sc.user_id, sc.total_quiz
HAVING COUNT(qq.id) > 0
ORDER BY sc.created_at DESC;

-- ========================================
-- 5. Identifier les résumés (revision_notes) actifs
-- ========================================
SELECT 
  'Resumes actifs' as type,
  rn.id,
  rn.document_section_id,
  ds.heading as section_heading,
  dv.document_id,
  d.title as document_title,
  d.collection_id,
  c.title as subject_title,
  d.user_id,
  rn.generated_at,
  LEFT(rn.payload->>'summary', 100) as summary_preview
FROM revision_notes rn
INNER JOIN document_sections ds ON rn.document_section_id = ds.id
INNER JOIN document_versions dv ON ds.document_version_id = dv.id
INNER JOIN documents d ON dv.document_id = d.id
LEFT JOIN collections c ON d.collection_id = c.id
WHERE (rn.payload->>'summary' IS NOT NULL AND rn.payload->>'summary' != '')
   OR (rn.payload->>'sections' IS NOT NULL AND jsonb_array_length(rn.payload->'sections') > 0)
ORDER BY rn.generated_at DESC;

-- Compteur de résumés actifs par utilisateur
SELECT 
  'Resumes actifs par utilisateur' as type,
  d.user_id,
  COUNT(DISTINCT rn.id) as total_resumes
FROM revision_notes rn
INNER JOIN document_sections ds ON rn.document_section_id = ds.id
INNER JOIN document_versions dv ON ds.document_version_id = dv.id
INNER JOIN documents d ON dv.document_id = d.id
WHERE (rn.payload->>'summary' IS NOT NULL AND rn.payload->>'summary' != '')
   OR (rn.payload->>'sections' IS NOT NULL AND jsonb_array_length(rn.payload->'sections') > 0)
GROUP BY d.user_id;

-- ========================================
-- 6. Identifier les collections avec status failed ou processing
-- ========================================
SELECT 
  'Collections en echec ou en traitement' as type,
  sc.id,
  sc.title,
  sc.user_id,
  sc.status,
  sc.total_flashcards,
  sc.total_quiz,
  sc.created_at,
  COUNT(DISTINCT fc.id) as real_flashcard_count,
  COUNT(DISTINCT qq.id) as real_quiz_count
FROM study_collections sc
LEFT JOIN study_collection_flashcards fc ON sc.id = fc.collection_id
LEFT JOIN study_collection_quiz_questions qq ON sc.id = qq.collection_id
WHERE sc.status IN ('failed', 'processing')
GROUP BY sc.id, sc.title, sc.user_id, sc.status, sc.total_flashcards, sc.total_quiz, sc.created_at
ORDER BY sc.created_at DESC;

-- ========================================
-- 7. SCRIPT DE NETTOYAGE - À EXÉCUTER APRÈS VÉRIFICATION
-- ========================================
-- ATTENTION: Ce script supprime les données selon vos besoins
-- Modifiez les conditions selon vos besoins avant d'exécuter !

/*
-- Option A: Supprimer toutes les collections avec status failed ou processing
DELETE FROM study_collections
WHERE status IN ('failed', 'processing');

-- Option B: Supprimer les collections vides (sans flashcards ni quiz)
DELETE FROM study_collections sc
WHERE NOT EXISTS (
  SELECT 1 FROM study_collection_flashcards WHERE collection_id = sc.id
) AND NOT EXISTS (
  SELECT 1 FROM study_collection_quiz_questions WHERE collection_id = sc.id
);

-- Option C: Supprimer les collections spécifiques (remplacez par vos IDs)
DELETE FROM study_collection_flashcards
WHERE collection_id IN (
  -- Liste des IDs de collections à supprimer
  'ID1', 'ID2', 'ID3'
);

DELETE FROM study_collection_quiz_questions
WHERE collection_id IN (
  -- Liste des IDs de collections à supprimer
  'ID1', 'ID2', 'ID3'
);

DELETE FROM study_collections
WHERE id IN (
  -- Liste des IDs de collections à supprimer
  'ID1', 'ID2', 'ID3'
);

-- Corriger les compteurs de TOUTES les collections restantes
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
*/

-- ========================================
-- 8. Vérification finale après nettoyage
-- ========================================
SELECT 
  'Verification finale' as type,
  (SELECT COUNT(*) FROM collections) as total_matieres,
  (SELECT COUNT(*) FROM study_collections WHERE status = 'ready') as total_study_collections_ready,
  (SELECT COUNT(*) FROM study_collections WHERE status = 'failed') as total_study_collections_failed,
  (SELECT COUNT(*) FROM study_collections WHERE status = 'processing') as total_study_collections_processing,
  (SELECT COUNT(*) FROM study_collection_flashcards) as total_flashcards,
  (SELECT COUNT(*) FROM study_collection_quiz_questions) as total_quiz_questions,
  (SELECT COUNT(*) FROM revision_notes 
   WHERE (payload->>'summary' IS NOT NULL AND payload->>'summary' != '')
      OR (payload->>'sections' IS NOT NULL AND jsonb_array_length(payload->'sections') > 0)
  ) as total_resumes_actifs;

-- ========================================
-- 9. Résumé par utilisateur (pour identifier les données par user_id)
-- ========================================
-- Remplacez VOTRE_USER_ID par votre user_id réel pour voir uniquement vos données
/*
SELECT 
  'Resume par utilisateur' as type,
  (SELECT COUNT(*) FROM collections WHERE user_id = 'VOTRE_USER_ID') as mes_matieres,
  (SELECT COUNT(*) FROM study_collections WHERE user_id = 'VOTRE_USER_ID' AND status = 'ready') as mes_collections_ready,
  (SELECT COUNT(*) FROM study_collection_flashcards fc 
   INNER JOIN study_collections sc ON fc.collection_id = sc.id 
   WHERE sc.user_id = 'VOTRE_USER_ID' AND sc.status = 'ready') as mes_flashcards,
  (SELECT COUNT(*) FROM study_collection_quiz_questions qq 
   INNER JOIN study_collections sc ON qq.collection_id = sc.id 
   WHERE sc.user_id = 'VOTRE_USER_ID' AND sc.status = 'ready') as mes_quiz,
  (SELECT COUNT(*) FROM revision_notes rn
   INNER JOIN document_sections ds ON rn.document_section_id = ds.id
   INNER JOIN document_versions dv ON ds.document_version_id = dv.id
   INNER JOIN documents d ON dv.document_id = d.id
   WHERE d.user_id = 'VOTRE_USER_ID'
     AND ((rn.payload->>'summary' IS NOT NULL AND rn.payload->>'summary' != '')
          OR (rn.payload->>'sections' IS NOT NULL AND jsonb_array_length(rn.payload->'sections') > 0))
  ) as mes_resumes;
*/
