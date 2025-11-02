# 🔐 Configuration de l'authentification par mot de passe dans Supabase

## ⚠️ ACTION REQUISE

Pour que la connexion par mot de passe fonctionne, vous devez activer cette option dans Supabase.

---

## 📝 **Étapes de configuration**

### 1️⃣ **Allez dans les paramètres d'authentification**

👉 **https://supabase.com/dashboard/project/qwjfwxbnvugqdhhvfajp/auth/providers**

### 2️⃣ **Activer "Email" provider**

1. Dans la liste des providers, trouvez **"Email"**
2. Cliquez sur **"Email"** pour ouvrir les paramètres
3. Assurez-vous que ces options sont activées :
   - ✅ **"Enable Email provider"** (ou "Enable Email Signup")
   - ✅ **"Enable Email/Password Sign In"**

### 3️⃣ **Configuration de la confirmation email (optionnel)**

Vous avez deux options :

#### Option A : Sans confirmation email (recommandé pour le développement)
- ✅ Décochez **"Enable email confirmations"**
- Les utilisateurs peuvent se connecter immédiatement après l'inscription
- Plus rapide pour tester

#### Option B : Avec confirmation email (recommandé pour la production)
- ✅ Cochez **"Enable email confirmations"**
- Les utilisateurs doivent cliquer sur un lien dans leur email pour activer leur compte
- Plus sécurisé

### 4️⃣ **Sauvegarder**

Cliquez sur **"Save"** en bas de la page.

---

## 🧪 **Test de l'authentification**

### **1. Créer un compte**

1. Allez sur `http://localhost:3000/register`
2. Entrez un email et un mot de passe (min. 6 caractères)
3. Cliquez sur "Créer mon compte"

**Si la confirmation email est désactivée :**
- ✅ Vous serez redirigé vers `/dashboard` immédiatement

**Si la confirmation email est activée :**
- ✅ Vous recevrez un email
- ✅ Cliquez sur le lien dans l'email
- ✅ Vous serez redirigé vers `/dashboard`

### **2. Se connecter**

1. Allez sur `http://localhost:3000/login`
2. Cliquez sur l'onglet **"Mot de passe"**
3. Entrez votre email et mot de passe
4. Cliquez sur "Se connecter"
5. Vous devriez être redirigé vers `/dashboard` 🎉

### **3. Alternative : Magic Link**

1. Allez sur `http://localhost:3000/login`
2. Cliquez sur l'onglet **"Lien magique"**
3. Entrez votre email
4. Cliquez sur "Recevoir un lien magique"
5. Vérifiez votre email et cliquez sur le lien

---

## 📊 **Vérifier les utilisateurs créés**

👉 **https://supabase.com/dashboard/project/qwjfwxbnvugqdhhvfajp/auth/users**

Vous verrez la liste de tous les utilisateurs inscrits.

---

## 🔧 **Configuration des URLs de redirection**

Pour que les liens de confirmation fonctionnent correctement :

1. Allez sur : **https://supabase.com/dashboard/project/qwjfwxbnvugqdhhvfajp/auth/url-configuration**
2. Dans **"Redirect URLs"**, ajoutez :
   ```
   http://localhost:3000/auth/callback
   http://localhost:3000/**
   ```
3. Cliquez sur **"Save"**

---

## ✅ **Checklist**

- [ ] Email provider activé dans Supabase
- [ ] Email/Password Sign In activé
- [ ] Configuration de la confirmation email choisie (avec ou sans)
- [ ] Redirect URLs configurées
- [ ] Serveur Next.js redémarré (`npm run dev`)
- [ ] Test de l'inscription sur `/register`
- [ ] Test de la connexion sur `/login`
- [ ] Vérification que les utilisateurs apparaissent dans la table `auth.users`

---

## 🎉 **Résultat attendu**

Une fois tout configuré, vous aurez :
- ✅ Page `/register` : Créer un compte avec email/mot de passe
- ✅ Page `/login` : Se connecter avec mot de passe OU magic link
- ✅ Sessions persistantes automatiques (gérées par Supabase)
- ✅ Redirection vers `/dashboard` après connexion réussie

