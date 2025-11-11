# 🧪 Test d'isolation des utilisateurs

## ✅ Statut actuel

Votre application est **déjà sécurisée au niveau du code** :
- ✅ Chaque note est liée au `user_id` lors de la création
- ✅ Seules les notes du user connecté sont affichées
- ✅ Impossible de modifier/supprimer les notes d'un autre utilisateur

---

## 🔒 Sécurité supplémentaire : Row Level Security (RLS)

Pour une **protection maximale**, activez RLS au niveau de Supabase.

### **Pourquoi RLS ?**

| Sans RLS | Avec RLS |
|----------|----------|
| ✅ Protection au niveau API Next.js | ✅ Protection au niveau API Next.js |
| ❌ Si quelqu'un contourne l'API → accès à toutes les données | ✅ Protection au niveau base de données |
| ❌ Si quelqu'un utilise directement Supabase client → accès à tout | ✅ Impossible d'accéder aux données des autres |

---

## 📝 Activation de RLS (optionnel mais recommandé)

### **Étape 1 : Ouvrir SQL Editor**

👉 https://supabase.com/dashboard/project/qwjfwxbnvugqdhhvfajp/sql/new

### **Étape 2 : Copier le SQL**

Ouvrez le fichier `supabase-rls.sql` et copiez tout son contenu.

### **Étape 3 : Exécuter**

1. Collez le SQL dans l'éditeur
2. Cliquez sur **"Run"** (ou F5)
3. Vous devriez voir : **"Success. No rows returned"**

---

## 🧪 Test manuel d'isolation

### **Test 1 : Créer 2 comptes différents**

#### **Compte 1 : alice@example.com**

1. Allez sur `http://localhost:3000/register`
2. Créez un compte avec `alice@example.com`
3. Créez 2 notes :
   - "Note d'Alice 1"
   - "Note d'Alice 2"
4. **Déconnectez-vous** (bouton en haut à droite)

#### **Compte 2 : bob@example.com**

1. Allez sur `http://localhost:3000/register`
2. Créez un compte avec `bob@example.com`
3. Créez 1 note :
   - "Note de Bob"
4. **Vérifiez** : Vous ne devez **PAS** voir les notes d'Alice ✅

---

## 🔍 Vérification dans Supabase

### **Voir toutes les notes**

👉 https://supabase.com/dashboard/project/qwjfwxbnvugqdhhvfajp/editor

1. Cliquez sur la table **"notes"**
2. Vous devriez voir :

| id | user_id | title | content |
|----|---------|-------|---------|
| uuid-1 | alice-user-id | Note d'Alice 1 | ... |
| uuid-2 | alice-user-id | Note d'Alice 2 | ... |
| uuid-3 | bob-user-id | Note de Bob | ... |

✅ Chaque note a un `user_id` différent

---

## 🐛 Problèmes possibles

### **Problème 1 : Je vois les notes d'un autre utilisateur**

❌ **Cause** : RLS n'est pas activé, ou vous utilisez `supabaseAdmin` au lieu de `supabase`

✅ **Solution** : Exécutez le fichier `supabase-rls.sql`

### **Problème 2 : Les notes n'ont pas de `user_id`**

❌ **Cause** : Problème dans l'API de création

✅ **Solution** : Vérifiez que `POST /api/notes` insère bien `user_id: user.id`

### **Problème 3 : Erreur 401 "Non authentifié"**

❌ **Cause** : La session Supabase a expiré

✅ **Solution** : Reconnectez-vous

---

## 📊 Checklist finale

- [ ] RLS activé sur `notes`, `users`, `usage_counters`
- [ ] Test avec 2 comptes différents effectué
- [ ] Chaque utilisateur voit uniquement ses notes
- [ ] Impossible de modifier/supprimer les notes d'un autre user
- [ ] Vérification dans Supabase Table Editor : chaque note a un `user_id`

---

## 🎉 Résultat attendu

✅ **Compte Alice** : Voit 2 notes ("Note d'Alice 1", "Note d'Alice 2")  
✅ **Compte Bob** : Voit 1 note ("Note de Bob")  
✅ **Bob ne voit PAS les notes d'Alice**  
✅ **Alice ne voit PAS les notes de Bob**

---

## 🔐 Sécurité finale

| Protection | Status |
|------------|--------|
| 🔒 Vérification au niveau API | ✅ Implémenté |
| 🔒 Middleware de protection des routes | ✅ Implémenté |
| 🔒 Row Level Security (RLS) | ⚠️ À activer (optionnel mais recommandé) |

**Votre application est déjà sécurisée. RLS ajoute une couche de protection supplémentaire.**

