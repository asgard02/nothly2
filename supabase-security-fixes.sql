-- ============================================
-- CORRECTIONS DE SÉCURITÉ RLS - VERSION CORRIGÉE
-- Exécuter dans la console SQL de Supabase
-- ============================================

-- ============================================
-- PARTIE 1: Corriger les politiques WITH CHECK manquantes
-- ============================================

-- 1.1 Corriger la politique collections (si la table existe)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'collections' AND table_schema = 'public') THEN
    -- Supprimer l'ancienne politique si elle existe
    DROP POLICY IF EXISTS "Users can all on own collections" ON collections;
    
    -- Recréer avec WITH CHECK
    CREATE POLICY "Users can all on own collections"
    ON collections
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
    
    RAISE NOTICE '✅ Politique collections corrigée';
  ELSE
    RAISE NOTICE '⚠️ Table collections non trouvée, ignorée';
  END IF;
END $$;

-- 1.2 Corriger la politique UPDATE de calendar_events (si la table existe)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'calendar_events' AND table_schema = 'public') THEN
    DROP POLICY IF EXISTS "Users can update their own calendar events" ON public.calendar_events;
    
    CREATE POLICY "Users can update their own calendar events"
    ON public.calendar_events
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
    
    RAISE NOTICE '✅ Politique calendar_events UPDATE corrigée';
  ELSE
    RAISE NOTICE '⚠️ Table calendar_events non trouvée, ignorée';
  END IF;
END $$;

-- ============================================
-- PARTIE 2: Activer RLS sur les tables utilisateur
-- (Tables avec user_id direct)
-- ============================================

-- 2.1 Table documents
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'documents' AND table_schema = 'public') THEN
    ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Users can view own documents" ON documents;
    DROP POLICY IF EXISTS "Users can insert own documents" ON documents;
    DROP POLICY IF EXISTS "Users can update own documents" ON documents;
    DROP POLICY IF EXISTS "Users can delete own documents" ON documents;
    
    CREATE POLICY "Users can view own documents"
    ON documents FOR SELECT
    USING (auth.uid() = user_id);

    CREATE POLICY "Users can insert own documents"
    ON documents FOR INSERT
    WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can update own documents"
    ON documents FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can delete own documents"
    ON documents FOR DELETE
    USING (auth.uid() = user_id);
    
    RAISE NOTICE '✅ RLS activé sur documents';
  ELSE
    RAISE NOTICE '⚠️ Table documents non trouvée';
  END IF;
END $$;

-- 2.2 Table revision_sessions (a user_id)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'revision_sessions' AND table_schema = 'public') THEN
    ALTER TABLE revision_sessions ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Users can access own revision sessions" ON revision_sessions;
    
    CREATE POLICY "Users can access own revision sessions"
    ON revision_sessions FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
    
    RAISE NOTICE '✅ RLS activé sur revision_sessions';
  ELSE
    RAISE NOTICE '⚠️ Table revision_sessions non trouvée';
  END IF;
END $$;

-- 2.3 Table revision_reminders (a user_id)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'revision_reminders' AND table_schema = 'public') THEN
    ALTER TABLE revision_reminders ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Users can access own revision reminders" ON revision_reminders;
    
    CREATE POLICY "Users can access own revision reminders"
    ON revision_reminders FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
    
    RAISE NOTICE '✅ RLS activé sur revision_reminders';
  ELSE
    RAISE NOTICE '⚠️ Table revision_reminders non trouvée';
  END IF;
END $$;

-- ============================================
-- PARTIE 3: Tables liées (sans user_id direct)
-- Utilise EXISTS pour vérifier la propriété
-- ============================================

-- 3.1 Table document_versions (liée via document_id -> documents.user_id)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'document_versions' AND table_schema = 'public') THEN
    ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Users can access own document versions" ON document_versions;
    
    CREATE POLICY "Users can access own document versions"
    ON document_versions FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM documents
        WHERE documents.id = document_versions.document_id
        AND documents.user_id = auth.uid()
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM documents
        WHERE documents.id = document_versions.document_id
        AND documents.user_id = auth.uid()
      )
    );
    
    RAISE NOTICE '✅ RLS activé sur document_versions';
  ELSE
    RAISE NOTICE '⚠️ Table document_versions non trouvée';
  END IF;
END $$;

-- 3.2 Table document_sections (liée via document_version_id)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'document_sections' AND table_schema = 'public') THEN
    ALTER TABLE document_sections ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Users can access own document sections" ON document_sections;
    
    CREATE POLICY "Users can access own document sections"
    ON document_sections FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM document_versions dv
        JOIN documents d ON d.id = dv.document_id
        WHERE dv.id = document_sections.document_version_id
        AND d.user_id = auth.uid()
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM document_versions dv
        JOIN documents d ON d.id = dv.document_id
        WHERE dv.id = document_sections.document_version_id
        AND d.user_id = auth.uid()
      )
    );
    
    RAISE NOTICE '✅ RLS activé sur document_sections';
  ELSE
    RAISE NOTICE '⚠️ Table document_sections non trouvée';
  END IF;
END $$;

-- 3.3 Table revision_notes (liée via document_version_id)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'revision_notes' AND table_schema = 'public') THEN
    ALTER TABLE revision_notes ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Users can access own revision notes" ON revision_notes;
    
    CREATE POLICY "Users can access own revision notes"
    ON revision_notes FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM document_versions dv
        JOIN documents d ON d.id = dv.document_id
        WHERE dv.id = revision_notes.document_version_id
        AND d.user_id = auth.uid()
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM document_versions dv
        JOIN documents d ON d.id = dv.document_id
        WHERE dv.id = revision_notes.document_version_id
        AND d.user_id = auth.uid()
      )
    );
    
    RAISE NOTICE '✅ RLS activé sur revision_notes';
  ELSE
    RAISE NOTICE '⚠️ Table revision_notes non trouvée';
  END IF;
END $$;

-- 3.4 Table quiz_sets (liée via document_version_id)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quiz_sets' AND table_schema = 'public') THEN
    ALTER TABLE quiz_sets ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Users can access own quiz sets" ON quiz_sets;
    
    CREATE POLICY "Users can access own quiz sets"
    ON quiz_sets FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM document_versions dv
        JOIN documents d ON d.id = dv.document_id
        WHERE dv.id = quiz_sets.document_version_id
        AND d.user_id = auth.uid()
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM document_versions dv
        JOIN documents d ON d.id = dv.document_id
        WHERE dv.id = quiz_sets.document_version_id
        AND d.user_id = auth.uid()
      )
    );
    
    RAISE NOTICE '✅ RLS activé sur quiz_sets';
  ELSE
    RAISE NOTICE '⚠️ Table quiz_sets non trouvée';
  END IF;
END $$;

-- 3.5 Table quiz_questions (liée via quiz_set_id)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quiz_questions' AND table_schema = 'public') THEN
    ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Users can access own quiz questions" ON quiz_questions;
    
    CREATE POLICY "Users can access own quiz questions"
    ON quiz_questions FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM quiz_sets qs
        JOIN document_versions dv ON dv.id = qs.document_version_id
        JOIN documents d ON d.id = dv.document_id
        WHERE qs.id = quiz_questions.quiz_set_id
        AND d.user_id = auth.uid()
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM quiz_sets qs
        JOIN document_versions dv ON dv.id = qs.document_version_id
        JOIN documents d ON d.id = dv.document_id
        WHERE qs.id = quiz_questions.quiz_set_id
        AND d.user_id = auth.uid()
      )
    );
    
    RAISE NOTICE '✅ RLS activé sur quiz_questions';
  ELSE
    RAISE NOTICE '⚠️ Table quiz_questions non trouvée';
  END IF;
END $$;

-- 3.6 Table revision_attempts (liée via revision_session_id)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'revision_attempts' AND table_schema = 'public') THEN
    ALTER TABLE revision_attempts ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Users can access own revision attempts" ON revision_attempts;
    
    CREATE POLICY "Users can access own revision attempts"
    ON revision_attempts FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM revision_sessions rs
        WHERE rs.id = revision_attempts.revision_session_id
        AND rs.user_id = auth.uid()
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM revision_sessions rs
        WHERE rs.id = revision_attempts.revision_session_id
        AND rs.user_id = auth.uid()
      )
    );
    
    RAISE NOTICE '✅ RLS activé sur revision_attempts';
  ELSE
    RAISE NOTICE '⚠️ Table revision_attempts non trouvée';
  END IF;
END $$;

-- ============================================
-- PARTIE 4: Vérification finale
-- ============================================

-- Afficher le statut RLS de toutes les tables
SELECT 
  schemaname,
  tablename,
  CASE WHEN rowsecurity THEN '✅ RLS activé' ELSE '❌ RLS désactivé' END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'users',
  'notes',
  'documents',
  'document_versions',
  'document_sections',
  'collections',
  'calendar_events',
  'revision_notes',
  'quiz_sets',
  'quiz_questions',
  'revision_sessions',
  'revision_attempts',
  'revision_reminders',
  'study_collections',
  'study_collection_sources',
  'study_collection_flashcards',
  'study_collection_quiz_questions',
  'async_jobs',
  'user_credits',
  'usage_counters'
)
ORDER BY tablename;

-- Compter les politiques par table
SELECT 
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;
