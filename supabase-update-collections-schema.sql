-- 🔄 MIGRATION : Mettre à jour la table collections existante
-- À exécuter si vous avez déjà créé la table avec l'ancien schéma

-- ========================================
-- 1. AJOUTER LA COLONNE description (si elle n'existe pas)
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
    RAISE NOTICE '✅ Colonne description ajoutée';
  ELSE
    RAISE NOTICE 'ℹ️  La colonne description existe déjà';
  END IF;
END $$;

-- ========================================
-- 2. METTRE À JOUR LA CONTRAINTE DE CLÉ ÉTRANGÈRE
-- Si elle référence users(id) au lieu de auth.users(id)
-- ========================================

-- Note: Pour changer une foreign key, il faut d'abord la supprimer puis la recréer
DO $$
DECLARE
  fk_name text;
  fk_schema text := 'public';
  fk_table text := 'collections';
  fk_column text := 'user_id';
BEGIN
  -- Trouver le nom de la contrainte existante
  SELECT tc.constraint_name INTO fk_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
    AND tc.table_name = kcu.table_name
  WHERE tc.table_schema = fk_schema
    AND tc.table_name = fk_table
    AND kcu.column_name = fk_column
    AND tc.constraint_type = 'FOREIGN KEY'
  LIMIT 1;

  -- Si une contrainte existe et qu'elle ne référence pas auth.users, la mettre à jour
  IF fk_name IS NOT NULL THEN
    -- Vérifier si elle référence déjà auth.users
    IF NOT EXISTS (
      SELECT 1 
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
        AND tc.table_name = kcu.table_name
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.constraint_schema = tc.table_schema
      WHERE tc.table_schema = fk_schema
        AND tc.table_name = fk_table
        AND tc.constraint_name = fk_name
        AND ccu.table_schema = 'auth'
        AND ccu.table_name = 'users'
    ) THEN
      -- Supprimer l'ancienne contrainte
      EXECUTE format('ALTER TABLE %I.%I DROP CONSTRAINT IF EXISTS %I', 
                     fk_schema, fk_table, fk_name);
      
      -- Créer la nouvelle contrainte vers auth.users
      EXECUTE format('ALTER TABLE %I.%I 
                      ADD CONSTRAINT collections_user_id_fkey 
                      FOREIGN KEY (%I) REFERENCES auth.users(id) ON DELETE CASCADE',
                     fk_schema, fk_table, fk_column);
      
      RAISE NOTICE '✅ Contrainte de clé étrangère mise à jour vers auth.users(id)';
    ELSE
      RAISE NOTICE 'ℹ️  La contrainte référence déjà auth.users(id)';
    END IF;
  ELSE
    -- Aucune contrainte trouvée, en créer une nouvelle
    EXECUTE format('ALTER TABLE %I.%I 
                    ADD CONSTRAINT collections_user_id_fkey 
                    FOREIGN KEY (%I) REFERENCES auth.users(id) ON DELETE CASCADE',
                   fk_schema, fk_table, fk_column);
    RAISE NOTICE '✅ Contrainte de clé étrangère créée vers auth.users(id)';
  END IF;
END $$;

-- ========================================
-- 3. METTRE À JOUR LA POLICY RLS
-- Remplacer les 4 policies séparées par une seule policy "FOR ALL"
-- ========================================

-- Supprimer les anciennes policies
DROP POLICY IF EXISTS "Users can view their own collections" ON collections;
DROP POLICY IF EXISTS "Users can create their own collections" ON collections;
DROP POLICY IF EXISTS "Users can update their own collections" ON collections;
DROP POLICY IF EXISTS "Users can delete their own collections" ON collections;

-- Créer la nouvelle policy simplifiée
DROP POLICY IF EXISTS "Users can all on own collections" ON collections;
CREATE POLICY "Users can all on own collections"
ON collections
FOR ALL
USING (auth.uid() = user_id);

-- ========================================
-- 4. ASSURER QUE updated_at EST NOT NULL
-- ========================================

-- Mettre à jour les valeurs NULL existantes
UPDATE collections 
SET updated_at = COALESCE(updated_at, created_at, now())
WHERE updated_at IS NULL;

-- Ajouter la contrainte NOT NULL si elle n'existe pas
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'collections' 
    AND column_name = 'updated_at'
    AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE collections ALTER COLUMN updated_at SET NOT NULL;
    ALTER TABLE collections ALTER COLUMN updated_at SET DEFAULT timezone('utc'::text, now());
    RAISE NOTICE '✅ Colonne updated_at mise à jour';
  ELSE
    RAISE NOTICE 'ℹ️  La colonne updated_at est déjà NOT NULL';
  END IF;
END $$;

-- ========================================
-- 5. VÉRIFICATION
-- ========================================

SELECT '✅ Migration terminée!' AS status;

-- Vérifier la structure de la table
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'collections'
ORDER BY ordinal_position;

-- Vérifier les contraintes de clé étrangère
SELECT
  tc.constraint_name,
  kcu.column_name,
  ccu.table_schema AS foreign_table_schema,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
  AND tc.table_name = kcu.table_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.constraint_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name = 'collections';

-- Vérifier les policies RLS
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'collections';

