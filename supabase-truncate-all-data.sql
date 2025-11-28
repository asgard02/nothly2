-- 🧹 SCRIPT POUR VIDER TOUTES LES DONNÉES
-- ⚠️ Ce script vide toutes les données mais garde les tables
-- Les tables legacy doivent être supprimées séparément

-- Vider toutes les données dans l'ordre (enfants d'abord, parents ensuite)
-- Le CASCADE gère automatiquement les foreign keys

TRUNCATE TABLE 
  study_collection_quiz_questions,
  study_collection_flashcards,
  study_collection_sources,
  study_collections,
  document_sections,
  document_versions,
  documents,
  notes,
  collections,
  async_jobs,
  usage_counters,
  user_credits,
  users
CASCADE;

SELECT '✅ Toutes les données ont été vidées !' as status;




