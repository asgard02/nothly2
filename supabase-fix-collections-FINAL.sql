-- 🚀 SCRIPT SIMPLE POUR CORRIGER LA TABLE COLLECTIONS
-- Copiez-collez TOUT ce script dans l'éditeur SQL de Supabase et exécutez-le

-- ========================================
-- ÉTAPE 1 : Créer la table si elle n'existe pas
-- ========================================

CREATE TABLE IF NOT EXISTS collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamptz DEFAULT timezone('utc'::text, now()),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  color text DEFAULT 'from-blue-500/20 via-blue-400/10 to-purple-500/20'
);

-- ========================================
-- ÉTAPE 2 : Ajouter la colonne description si elle n'existe pas
-- ========================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'collections' 
    AND column_name = 'description'
  ) THEN
    ALTER TABLE collections ADD COLUMN description text;
  END IF;
END $$;

-- ========================================
-- ÉTAPE 3 : CORRIGER LA CONTRAINTE DE CLÉ ÉTRANGÈRE
-- Si elle référence users(id) au lieu de auth.users(id)
-- ========================================

DO $$
DECLARE
  constraint_name_var text;
BEGIN
  -- Trouver le nom de la contrainte existante sur user_id
  SELECT tc.constraint_name INTO constraint_name_var
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
    AND tc.table_name = kcu.table_name
  WHERE tc.table_schema = 'public'
    AND tc.table_name = 'collections'
    AND kcu.column_name = 'user_id'
    AND tc.constraint_type = 'FOREIGN KEY'
  LIMIT 1;

  -- Si une contrainte existe, vérifier si elle pointe vers auth.users
  IF constraint_name_var IS NOT NULL THEN
    -- Vérifier si elle référence déjà auth.users
    IF NOT EXISTS (
      SELECT 1 
      FROM information_schema.table_constraints tc
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.constraint_schema = tc.table_schema
      WHERE tc.table_schema = 'public'
        AND tc.table_name = 'collections'
        AND tc.constraint_name = constraint_name_var
        AND ccu.table_schema = 'auth'
        AND ccu.table_name = 'users'
    ) THEN
      -- Supprimer l'ancienne contrainte et en créer une nouvelle vers auth.users
      EXECUTE format('ALTER TABLE collections DROP CONSTRAINT IF EXISTS %I', constraint_name_var);
      EXECUTE 'ALTER TABLE collections ADD CONSTRAINT collections_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE';
      RAISE NOTICE '✅ Contrainte mise à jour vers auth.users(id)';
    ELSE
      RAISE NOTICE 'ℹ️  La contrainte référence déjà auth.users(id)';
    END IF;
  ELSE
    -- Pas de contrainte, en créer une nouvelle
    EXECUTE 'ALTER TABLE collections ADD CONSTRAINT collections_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE';
    RAISE NOTICE '✅ Contrainte créée vers auth.users(id)';
  END IF;
END $$;

-- ========================================
-- ÉTAPE 4 : Créer les index
-- ========================================

CREATE INDEX IF NOT EXISTS collections_user_id_idx ON collections(user_id);
CREATE INDEX IF NOT EXISTS collections_created_at_idx ON collections(created_at DESC);

-- ========================================
-- ÉTAPE 5 : Ajouter collection_id à documents si nécessaire
-- ========================================

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
  END IF;
END $$;

-- ========================================
-- ÉTAPE 6 : Fonction pour updated_at
-- ========================================

CREATE OR REPLACE FUNCTION update_collections_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS collections_update_timestamp ON collections;
CREATE TRIGGER collections_update_timestamp
  BEFORE UPDATE ON collections
  FOR EACH ROW EXECUTE FUNCTION update_collections_timestamp();

-- ========================================
-- ÉTAPE 7 : Activer RLS
-- ========================================

ALTER TABLE collections ENABLE ROW LEVEL SECURITY;

-- ========================================
-- ÉTAPE 8 : Supprimer toutes les anciennes policies
-- ========================================

DROP POLICY IF EXISTS "Users can view their own collections" ON collections;
DROP POLICY IF EXISTS "Users can create their own collections" ON collections;
DROP POLICY IF EXISTS "Users can update their own collections" ON collections;
DROP POLICY IF EXISTS "Users can delete their own collections" ON collections;
DROP POLICY IF EXISTS "Users can all on own collections" ON collections;

-- ========================================
-- ÉTAPE 9 : Créer la nouvelle policy simplifiée
-- ========================================

CREATE POLICY "Users can all on own collections"
ON collections
FOR ALL
USING (auth.uid() = user_id);

-- ========================================
-- ÉTAPE 10 : Vérification finale
-- ========================================

SELECT '✅ Table collections prête!' AS status;

