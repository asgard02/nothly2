-- Script SQL pour ajouter les contraintes CASCADE sur toutes les tables
-- À exécuter dans l'éditeur SQL de Supabase

-- ============================================================================
-- ÉTAPE 1 : Supprimer les anciennes contraintes de clés étrangères
-- ============================================================================

-- Table: document_versions
ALTER TABLE document_versions 
  DROP CONSTRAINT IF EXISTS document_versions_document_id_fkey;

-- Table: document_sections
ALTER TABLE document_sections 
  DROP CONSTRAINT IF EXISTS document_sections_document_version_id_fkey;

-- Table: revision_notes
ALTER TABLE revision_notes 
  DROP CONSTRAINT IF EXISTS revision_notes_document_section_id_fkey;

-- Table: quiz_sets
ALTER TABLE quiz_sets 
  DROP CONSTRAINT IF EXISTS quiz_sets_document_section_id_fkey;

-- Table: quiz_questions
ALTER TABLE quiz_questions 
  DROP CONSTRAINT IF EXISTS quiz_questions_quiz_set_id_fkey;

-- Table: study_collection_flashcards
ALTER TABLE study_collection_flashcards 
  DROP CONSTRAINT IF EXISTS study_collection_flashcards_collection_id_fkey;

-- Table: study_collection_quiz_questions
ALTER TABLE study_collection_quiz_questions 
  DROP CONSTRAINT IF EXISTS study_collection_quiz_questions_collection_id_fkey;

-- Table: study_collection_sources
ALTER TABLE study_collection_sources 
  DROP CONSTRAINT IF EXISTS study_collection_sources_collection_id_fkey;

-- Table: documents
ALTER TABLE documents 
  DROP CONSTRAINT IF EXISTS documents_collection_id_fkey;

-- ============================================================================
-- ÉTAPE 2 : Recréer les contraintes avec CASCADE
-- ============================================================================

-- Document versions -> Documents (CASCADE)
ALTER TABLE document_versions
  ADD CONSTRAINT document_versions_document_id_fkey
  FOREIGN KEY (document_id)
  REFERENCES documents(id)
  ON DELETE CASCADE;

-- Document sections -> Document versions (CASCADE)
ALTER TABLE document_sections
  ADD CONSTRAINT document_sections_document_version_id_fkey
  FOREIGN KEY (document_version_id)
  REFERENCES document_versions(id)
  ON DELETE CASCADE;

-- Revision notes -> Document sections (CASCADE)
ALTER TABLE revision_notes
  ADD CONSTRAINT revision_notes_document_section_id_fkey
  FOREIGN KEY (document_section_id)
  REFERENCES document_sections(id)
  ON DELETE CASCADE;

-- Quiz sets -> Document sections (CASCADE)
ALTER TABLE quiz_sets
  ADD CONSTRAINT quiz_sets_document_section_id_fkey
  FOREIGN KEY (document_section_id)
  REFERENCES document_sections(id)
  ON DELETE CASCADE;

-- Quiz questions -> Quiz sets (CASCADE)
ALTER TABLE quiz_questions
  ADD CONSTRAINT quiz_questions_quiz_set_id_fkey
  FOREIGN KEY (quiz_set_id)
  REFERENCES quiz_sets(id)
  ON DELETE CASCADE;

-- Study collection flashcards -> Study collections (CASCADE)
ALTER TABLE study_collection_flashcards
  ADD CONSTRAINT study_collection_flashcards_collection_id_fkey
  FOREIGN KEY (collection_id)
  REFERENCES study_collections(id)
  ON DELETE CASCADE;

-- Study collection quiz questions -> Study collections (CASCADE)
ALTER TABLE study_collection_quiz_questions
  ADD CONSTRAINT study_collection_quiz_questions_collection_id_fkey
  FOREIGN KEY (collection_id)
  REFERENCES study_collections(id)
  ON DELETE CASCADE;

-- Study collection sources -> Study collections (CASCADE)
ALTER TABLE study_collection_sources
  ADD CONSTRAINT study_collection_sources_collection_id_fkey
  FOREIGN KEY (collection_id)
  REFERENCES study_collections(id)
  ON DELETE CASCADE;

-- Documents -> Collections (CASCADE)
ALTER TABLE documents
  ADD CONSTRAINT documents_collection_id_fkey
  FOREIGN KEY (collection_id)
  REFERENCES collections(id)
  ON DELETE CASCADE;

-- ============================================================================
-- ÉTAPE 3 : Vérification
-- ============================================================================

-- Afficher toutes les contraintes de clés étrangères
SELECT
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
LEFT JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name IN (
    'documents',
    'document_versions',
    'document_sections',
    'revision_notes',
    'quiz_sets',
    'quiz_questions',
    'study_collections',
    'study_collection_flashcards',
    'study_collection_quiz_questions',
    'study_collection_sources'
  )
ORDER BY tc.table_name, tc.constraint_name;
