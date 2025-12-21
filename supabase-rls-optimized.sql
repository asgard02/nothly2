ß-- 🔒 RLS OPTIMISÉ POUR NOTES INSTANTANÉES
-- Policy combinée "for all" pour meilleures performances
-- À exécuter dans Supabase SQL Editor

-- ========================================
-- TABLE: notes
-- ========================================

-- 1️⃣ Active RLS sur la table notes
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- 2️⃣ Supprime les anciennes policies si elles existent (pour éviter les conflits)
DROP POLICY IF EXISTS "Users can view their own notes" ON notes;
DROP POLICY IF EXISTS "Users can create their own notes" ON notes;
DROP POLICY IF EXISTS "Users can update their own notes" ON notes;
DROP POLICY IF EXISTS "Users can delete their own notes" ON notes;
DROP POLICY IF EXISTS "user can manage own notes" ON notes;

-- 3️⃣ Policy combinée : Les utilisateurs peuvent gérer leurs propres notes (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "user can manage own notes"
ON notes
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ========================================
-- VÉRIFICATION
-- ========================================

-- Pour vérifier que RLS est actif :
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notes';

-- Pour voir les policies :
-- SELECT * FROM pg_policies WHERE schemaname = 'public' AND tablename = 'notes';



