-- 🚀 FIX RAPIDE : Créer la table collections
-- Copiez-collez ce script dans l'éditeur SQL de Supabase et exécutez-le

-- 1. Créer la table collections
CREATE TABLE IF NOT EXISTS collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  color text DEFAULT 'from-blue-500/20 via-blue-400/10 to-purple-500/20'
);

-- 2. Créer les index
CREATE INDEX IF NOT EXISTS collections_user_id_idx ON collections(user_id);
CREATE INDEX IF NOT EXISTS collections_created_at_idx ON collections(created_at DESC);

-- 3. Ajouter la colonne collection_id à documents (si elle n'existe pas)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'documents' 
    AND column_name = 'collection_id'
  ) THEN
    ALTER TABLE documents 
      ADD COLUMN collection_id uuid REFERENCES collections(id) ON DELETE SET NULL;
    
    CREATE INDEX IF NOT EXISTS documents_collection_id_idx ON documents(collection_id);
    
    RAISE NOTICE '✅ Colonne collection_id ajoutée avec succès';
  ELSE
    RAISE NOTICE 'ℹ️  La colonne collection_id existe déjà';
  END IF;
END $$;

-- 4. Fonction et trigger pour updated_at sur collections
CREATE OR REPLACE FUNCTION update_collections_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS collections_update_timestamp ON collections;
CREATE TRIGGER collections_update_timestamp
  BEFORE UPDATE ON collections
  FOR EACH ROW EXECUTE FUNCTION update_collections_timestamp();

-- 5. Activer Row Level Security (RLS)
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;

-- 6. Créer les policies RLS
-- Policy simplifiée: Les utilisateurs ont un accès complet à leurs propres collections
DROP POLICY IF EXISTS "Users can all on own collections" ON collections;
CREATE POLICY "Users can all on own collections"
ON collections
FOR ALL
USING (auth.uid() = user_id);

-- 7. Vérification
SELECT '✅ Table collections créée avec succès!' AS status;

-- 8. Vérifier que la table existe
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns 
   WHERE table_schema = 'public' 
   AND table_name = 'collections') AS column_count
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_name = 'collections';

-- 9. Vérifier que RLS est activé
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'collections';

