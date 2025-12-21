-- Script SQL pour nettoyer les données orphelines dans Supabase
-- À exécuter AVANT d'ajouter les contraintes CASCADE

-- ============================================================================
-- NETTOYAGE DES DONNÉES ORPHELINES
-- ============================================================================

-- 1. Supprimer les quiz_questions orphelines (sans quiz_set)
DELETE FROM quiz_questions
WHERE quiz_set_id NOT IN (SELECT id FROM quiz_sets);

-- 2. Supprimer les quiz_sets orphelins (sans document_section)
DELETE FROM quiz_sets
WHERE document_section_id NOT IN (SELECT id FROM document_sections);

-- 3. Supprimer les revision_notes orphelines (sans document_section)
DELETE FROM revision_notes
WHERE document_section_id NOT IN (SELECT id FROM document_sections);

-- 4. Supprimer les document_sections orphelines (sans document_version)
DELETE FROM document_sections
WHERE document_version_id NOT IN (SELECT id FROM document_versions);

-- 5. Supprimer les document_versions orphelines (sans document)
DELETE FROM document_versions
WHERE document_id NOT IN (SELECT id FROM documents);

-- 6. Supprimer les documents orphelins (sans collection)
DELETE FROM documents
WHERE collection_id NOT IN (SELECT id FROM collections);

-- 7. Supprimer les study_collection_flashcards orphelines
DELETE FROM study_collection_flashcards
WHERE collection_id NOT IN (SELECT id FROM study_collections);

-- 8. Supprimer les study_collection_quiz_questions orphelines
DELETE FROM study_collection_quiz_questions
WHERE collection_id NOT IN (SELECT id FROM study_collections);

-- 9. Supprimer les study_collection_sources orphelines
DELETE FROM study_collection_sources
WHERE collection_id NOT IN (SELECT id FROM study_collections);

-- ============================================================================
-- STATISTIQUES AVANT/APRÈS
-- ============================================================================

-- Compter les enregistrements par table
SELECT 
  'collections' as table_name, 
  COUNT(*) as count 
FROM collections
UNION ALL
SELECT 'documents', COUNT(*) FROM documents
UNION ALL
SELECT 'document_versions', COUNT(*) FROM document_versions
UNION ALL
SELECT 'document_sections', COUNT(*) FROM document_sections
UNION ALL
SELECT 'revision_notes', COUNT(*) FROM revision_notes
UNION ALL
SELECT 'quiz_sets', COUNT(*) FROM quiz_sets
UNION ALL
SELECT 'quiz_questions', COUNT(*) FROM quiz_questions
UNION ALL
SELECT 'study_collections', COUNT(*) FROM study_collections
UNION ALL
SELECT 'study_collection_flashcards', COUNT(*) FROM study_collection_flashcards
UNION ALL
SELECT 'study_collection_quiz_questions', COUNT(*) FROM study_collection_quiz_questions
UNION ALL
SELECT 'study_collection_sources', COUNT(*) FROM study_collection_sources
ORDER BY table_name;
