# 🔄 Fix : ERR_TOO_MANY_REDIRECTS

## 🎯 Cause du problème

Vous avez une **boucle de redirection infinie** entre `/login` et `/dashboard` causée par :

1. ✅ Le middleware vérifie la **session Supabase** (qui existe)
2. ❌ La page `/dashboard` vérifie l'**utilisateur dans la table `users`** (qui n'existe pas encore)
3. 🔄 Résultat : boucle infinie `dashboard → login → dashboard → login...`

---

## ✅ Solution : Créer les tables Supabase

### Étape 1 : Ouvrir le SQL Editor

👉 **https://supabase.com/dashboard/project/qwjfwxbnvugqdhhvfajp/sql/new**

### Étape 2 : Copier-coller ce SQL

```sql
-- Table des utilisateurs
create table users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  role text not null default 'free',
  created_at timestamptz default now()
);

-- Index pour rechercher rapidement par email
create index users_email_idx on users(email);

-- Table des notes
create table notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  title text not null default 'Nouvelle note',
  content text not null default '',
  updated_at timestamptz default now()
);

-- Index pour récupérer rapidement les notes d'un utilisateur
create index notes_user_id_idx on notes(user_id);
create index notes_updated_at_idx on notes(updated_at desc);

-- Table de comptage d'usage pour l'IA
create table usage_counters (
  user_id uuid references users(id) on delete cascade,
  month text not null, -- Format: YYYY-MM
  tokens_used bigint not null default 0,
  primary key (user_id, month)
);

-- Index pour rechercher l'usage par utilisateur et mois
create index usage_counters_user_month_idx on usage_counters(user_id, month);
```

### Étape 3 : Cliquer sur "Run" (F5)

Vous devriez voir : **Success. No rows returned**

---

## 🔍 Vérification

### 1️⃣ Vérifier que les tables existent

Dans Supabase, allez dans **Table Editor** :
- https://supabase.com/dashboard/project/qwjfwxbnvugqdhhvfajp/editor

Vous devriez voir :
- ✅ `users`
- ✅ `notes`
- ✅ `usage_counters`

### 2️⃣ Vider le cache du navigateur

1. Ouvrez Chrome/Firefox
2. Allez sur `localhost:3000`
3. **Ouvrez les outils de développement** (F12 ou Cmd+Option+I)
4. **Faites un clic droit sur le bouton "Actualiser"** → **"Vider le cache et actualiser"**

OU bien :

- **Chrome** : `Cmd+Shift+Delete` (Mac) ou `Ctrl+Shift+Delete` (Windows)
- Cochez "Cookies" et "Images/fichiers en cache"
- Cliquez sur "Effacer les données"

### 3️⃣ Redémarrer le serveur Next.js

```bash
# Arrêter le serveur (Ctrl+C dans le terminal)
# Puis relancer
npm run dev
```

### 4️⃣ Tester la connexion

1. Allez sur **http://localhost:3000/login**
2. Entrez votre email
3. Cliquez sur "Recevoir un lien magique"
4. Vérifiez votre email et cliquez sur le lien
5. Vous devriez arriver sur `/dashboard` sans erreur !

---

## 🐛 Debugging

Si ça ne marche toujours pas, ouvrez la **console du terminal** où tourne `npm run dev`.

Vous devriez voir des logs comme :
```
[getUser] Utilisateur authentifié: votre@email.com
[getUser] Création du user dans la table users...
[getUser] Utilisateur créé avec succès
```

Si vous voyez :
```
[getUser] Erreur lors de la récupération: relation "public.users" does not exist
```
→ La table `users` n'existe pas, retournez à l'étape 1.

---

## 📋 Checklist finale

- [ ] Tables `users`, `notes`, `usage_counters` créées dans Supabase
- [ ] Cache du navigateur vidé
- [ ] Serveur Next.js redémarré
- [ ] Variables d'environnement correctes (`.env.local`) :
  ```bash
  NEXT_PUBLIC_SUPABASE_URL=https://qwjfwxbnvugqdhhvfajp.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  ```

---

## 🎉 Résultat attendu

Une fois tout configuré :
1. Vous pouvez vous connecter via magic link
2. Vous arrivez sur `/dashboard` sans boucle
3. Vous pouvez créer/éditer/supprimer des notes
4. Tout fonctionne ! 🚀

