# 📋 Guide d'Application du Script Foreign Keys

## 🎯 Objectif

Corriger les foreign keys incohérentes dans Supabase pour que toutes les tables pointent vers `auth.users` au lieu de `public.users`.

---

## 📝 ÉTAPE 1 : Vérifier l'état actuel

1. **Ouvrir Supabase Dashboard**
   - Aller sur [https://supabase.com/dashboard](https://supabase.com/dashboard)
   - Sélectionner votre projet

2. **Ouvrir SQL Editor**
   - Cliquer sur "SQL Editor" dans le menu de gauche
   - Cliquer sur "New query"

3. **Exécuter le script de vérification**
   - Ouvrir le fichier `supabase-verify-foreign-keys.sql`
   - Copier tout le contenu
   - Coller dans l'éditeur SQL
   - Cliquer sur "Run" (ou Ctrl+Enter)

4. **Analyser les résultats**
   - Vérifier la colonne `status` :
     - ✅ `CORRECT` = Déjà pointé vers `auth.users` (pas besoin de correction)
     - ❌ `À CORRIGER` = Pointé vers `public.users` (nécessite correction)
   - Noter les tables qui nécessitent une correction

---

## 🔧 ÉTAPE 2 : Appliquer le script de correction

1. **Ouvrir le script de correction**
   - Ouvrir le fichier `supabase-fix-foreign-keys.sql`
   - Lire attentivement le script pour comprendre ce qu'il fait

2. **Vérifier les prérequis**
   - ✅ Les tables `async_jobs` et `study_collections` existent
   - ✅ La table `auth.users` existe (créée automatiquement par Supabase Auth)
   - ✅ Vous avez les permissions nécessaires (admin)

3. **Exécuter le script**
   - Copier tout le contenu de `supabase-fix-foreign-keys.sql`
   - Coller dans l'éditeur SQL de Supabase
   - Cliquer sur "Run" (ou Ctrl+Enter)

4. **Vérifier les résultats**
   - Le script devrait afficher :
     - Les foreign keys supprimées
     - Les nouvelles foreign keys créées
     - Les résultats de vérification
     - Un message `✅ Script terminé - Foreign keys corrigées`

---

## ✅ ÉTAPE 3 : Vérifier après correction

1. **Ré-exécuter le script de vérification**
   - Exécuter à nouveau `supabase-verify-foreign-keys.sql`
   - Vérifier que toutes les foreign keys pointent maintenant vers `auth.users`

2. **Vérifier manuellement**
   - Dans Supabase Dashboard → Table Editor
   - Ouvrir la table `async_jobs`
   - Vérifier que la colonne `user_id` a une foreign key vers `auth.users`
   - Faire de même pour `study_collections`

---

## ⚠️ IMPORTANT : Ce que fait le script

### 1. Supprime les anciennes foreign keys
```sql
ALTER TABLE public.async_jobs 
  DROP CONSTRAINT IF EXISTS async_jobs_user_id_fkey;

ALTER TABLE public.study_collections 
  DROP CONSTRAINT IF EXISTS study_collections_user_id_fkey;
```

### 2. Crée les nouvelles foreign keys vers auth.users
```sql
ALTER TABLE public.async_jobs
  ADD CONSTRAINT async_jobs_user_id_auth_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

ALTER TABLE public.study_collections
  ADD CONSTRAINT study_collections_user_id_auth_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;
```

### 3. Vérifie les résultats
- Affiche toutes les foreign keys vers `users`
- Vérifie la cohérence des relations

---

## 🚨 En cas d'erreur

### Erreur : "constraint does not exist"
- **Cause :** La foreign key n'existe pas encore
- **Solution :** C'est normal, le script utilise `IF EXISTS` donc il continue

### Erreur : "relation auth.users does not exist"
- **Cause :** Supabase Auth n'est pas activé
- **Solution :** Activer Supabase Auth dans le dashboard

### Erreur : "permission denied"
- **Cause :** Pas les permissions admin
- **Solution :** Vérifier que vous êtes connecté avec un compte admin

### Erreur : "foreign key constraint violation"
- **Cause :** Des données existantes ne respectent pas la contrainte
- **Solution :** 
  1. Vérifier qu'il n'y a pas de `user_id` qui pointent vers des utilisateurs inexistants
  2. Nettoyer les données orphelines si nécessaire

---

## 📊 Tables concernées

- ✅ `async_jobs.user_id` → `auth.users(id)`
- ✅ `study_collections.user_id` → `auth.users(id)`
- ℹ️ `documents.user_id` → Déjà vers `auth.users(id)` (pas besoin de correction)
- ℹ️ `notes.user_id` → Déjà vers `auth.users(id)` (pas besoin de correction)

---

## ✅ Validation finale

Après avoir exécuté le script, vous devriez voir :

1. **Dans les résultats SQL :**
   - Toutes les foreign keys pointent vers `auth.users`
   - Message de succès : `✅ Script terminé - Foreign keys corrigées`

2. **Dans Supabase Dashboard :**
   - Table `async_jobs` : Foreign key `user_id` → `auth.users(id)`
   - Table `study_collections` : Foreign key `user_id` → `auth.users(id)`

3. **Dans l'application :**
   - Les insertions dans `async_jobs` et `study_collections` fonctionnent correctement
   - Pas d'erreurs de contrainte de foreign key

---

## 📝 Notes

- Le script est **idempotent** : il peut être exécuté plusieurs fois sans problème
- Les données existantes ne sont **pas modifiées**, seulement les contraintes
- Le script utilise `ON DELETE CASCADE` : si un utilisateur est supprimé, ses jobs et collections sont aussi supprimés

---

## 🎯 Résultat attendu

Après l'exécution du script, toutes les foreign keys `user_id` dans les tables publiques pointent vers `auth.users(id)`, garantissant la cohérence avec Supabase Auth.
