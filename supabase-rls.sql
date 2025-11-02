-- 🔒 ACTIVATION DE ROW LEVEL SECURITY (RLS)
-- Ce script sécurise vos tables au niveau de la base de données
-- À exécuter dans Supabase SQL Editor

-- ========================================
-- TABLE: notes
-- ========================================

-- 1️⃣ Active RLS sur la table notes
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- 2️⃣ Policy: Les utilisateurs peuvent lire leurs propres notes
CREATE POLICY "Users can view their own notes"
ON notes
FOR SELECT
USING (auth.uid() = user_id);

-- 3️⃣ Policy: Les utilisateurs peuvent créer leurs propres notes
CREATE POLICY "Users can create their own notes"
ON notes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 4️⃣ Policy: Les utilisateurs peuvent modifier leurs propres notes
CREATE POLICY "Users can update their own notes"
ON notes
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 5️⃣ Policy: Les utilisateurs peuvent supprimer leurs propres notes
CREATE POLICY "Users can delete their own notes"
ON notes
FOR DELETE
USING (auth.uid() = user_id);

-- ========================================
-- TABLE: users
-- ========================================

-- 1️⃣ Active RLS sur la table users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 2️⃣ Policy: Les utilisateurs peuvent lire leur propre profil
CREATE POLICY "Users can view their own profile"
ON users
FOR SELECT
USING (auth.uid() = id);

-- 3️⃣ Policy: Les utilisateurs peuvent modifier leur propre profil
CREATE POLICY "Users can update their own profile"
ON users
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ========================================
-- TABLE: usage_counters
-- ========================================

-- 1️⃣ Active RLS sur la table usage_counters
ALTER TABLE usage_counters ENABLE ROW LEVEL SECURITY;

-- 2️⃣ Policy: Les utilisateurs peuvent lire leur propre usage
CREATE POLICY "Users can view their own usage"
ON usage_counters
FOR SELECT
USING (auth.uid() = user_id);

-- 3️⃣ Policy: Les utilisateurs peuvent insérer leur propre usage
CREATE POLICY "Users can insert their own usage"
ON usage_counters
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 4️⃣ Policy: Les utilisateurs peuvent modifier leur propre usage
CREATE POLICY "Users can update their own usage"
ON usage_counters
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ========================================
-- TABLE: user_credits
-- ========================================

-- 1️⃣ Active RLS sur la table user_credits
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;

-- 2️⃣ Policy: Les utilisateurs peuvent lire leurs propres crédits
CREATE POLICY "Users can view their own credits"
ON user_credits
FOR SELECT
USING (auth.uid() = user_id);

-- 3️⃣ Policy: Les utilisateurs peuvent créer leurs propres crédits
CREATE POLICY "Users can create their own credits"
ON user_credits
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 4️⃣ Policy: Les utilisateurs peuvent modifier leurs propres crédits
CREATE POLICY "Users can update their own credits"
ON user_credits
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ========================================
-- ✅ VÉRIFICATION
-- ========================================

-- Pour vérifier que RLS est actif :
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- Pour voir les policies :
-- SELECT * FROM pg_policies WHERE schemaname = 'public';

