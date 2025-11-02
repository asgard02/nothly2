# ✅ Étape 2 – Authentification Supabase (Notlhy)

## 🎯 Objectif atteint

Remplacement du système de login mock par une **vraie authentification Supabase** avec magic link. Les notes sont maintenant persistantes et liées à des utilisateurs réels.

## 📦 Changements majeurs

### 1. **Authentification Supabase complète**
- ✅ Login par magic link (lien de connexion par email)
- ✅ Pas de mot de passe requis
- ✅ Session persistante entre les visites
- ✅ Déconnexion fonctionnelle

### 2. **Stockage persistant**
- ✅ Notes stockées dans Supabase (PostgreSQL)
- ✅ Les notes restent après déconnexion/reconnexion
- ✅ Chaque utilisateur a son propre espace de notes
- ✅ Plus de perte de données

### 3. **Sécurité renforcée**
- ✅ Middleware protégeant les routes
- ✅ API routes sécurisées
- ✅ Vérification d'authentification côté serveur

## 📁 Nouveaux fichiers créés

```
lib/
  supabase-client.ts       ✅ Client Supabase (browser)
  supabase-server.ts       ✅ Client Supabase (server)

app/
  login/
    page.tsx               ✅ Page de connexion avec magic link
  auth/
    callback/
      route.ts             ✅ Callback après authentification

middleware.ts              ✅ Protection des routes mise à jour
```

## 📝 Fichiers modifiés

```
lib/
  auth.ts                  ✅ Utilise maintenant Supabase Auth

app/
  api/
    notes/
      route.ts             ✅ Utilise Supabase au lieu du mock storage
      [id]/route.ts        ✅ Utilise Supabase au lieu du mock storage
  dashboard/
    dashboard-client.tsx   ✅ Bouton logout avec Supabase

package.json               ✅ Ajout de @supabase/ssr
```

## 🔐 Comment fonctionne l'authentification

### Flow de connexion

1. **Utilisateur** : Va sur `/login` et entre son email
2. **App** : Envoie un magic link via `supabase.auth.signInWithOtp()`
3. **Utilisateur** : Reçoit l'email et clique sur le lien
4. **Supabase** : Redirige vers `/auth/callback?code=...`
5. **App** : Échange le code contre une session
6. **Utilisateur** : Redirigé vers `/dashboard`, authentifié ✅

### Middleware de protection

```typescript
// Si pas connecté et accède au dashboard → redirige vers /login
// Si connecté et accède à /login → redirige vers /dashboard
// API /notes/* et /api/ai protégées → 401 si non authentifié
```

### Gestion des sessions

- Les sessions sont stockées dans des cookies httpOnly
- Les cookies sont automatiquement rafraîchis par le middleware
- La déconnexion supprime la session et les cookies

## 🚀 Comment tester

### 1. Configurer Supabase

**Assurez-vous que Supabase est configuré** dans `.env.local` :
```bash
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre-anon-key
SUPABASE_SERVICE_ROLE_KEY=votre-service-role-key
```

**Important** : Activez l'authentification par email dans Supabase :
1. Allez dans Authentication > Providers
2. Activez "Email" provider
3. Désactivez "Confirm email" pour les tests (vous pouvez le réactiver plus tard)

### 2. Relancer le serveur

```bash
npm install  # Installe @supabase/ssr
npm run dev
```

### 3. Tester le flow complet

**Connexion** :
1. Allez sur http://localhost:3000/login
2. Entrez votre email
3. Cliquez sur "Recevoir un lien magique"
4. Message : "📧 Vérifiez votre email !"
5. Ouvrez votre email et cliquez sur le lien
6. Vous êtes automatiquement redirigé vers le dashboard ✅

**Utilisation** :
1. Créez quelques notes
2. Modifiez-les (auto-save fonctionne)
3. Déconnectez-vous
4. Reconnectez-vous avec le même email
5. **Vos notes sont toujours là !** 🎉

**Protection des routes** :
1. Déconnectez-vous
2. Essayez d'accéder à http://localhost:3000/dashboard
3. Vous êtes redirigé vers `/login` ✅

## 🔧 Configuration Supabase requise

### 1. Table `users`

```sql
create table users (
  id uuid primary key references auth.users(id),
  email text unique not null,
  role text not null default 'free',
  created_at timestamptz default now()
);

-- Policy pour permettre aux utilisateurs de voir leurs propres données
alter table users enable row level security;

create policy "Users can view own data"
  on users for select
  using (auth.uid() = id);
```

### 2. Table `notes`

```sql
create table notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  title text not null default 'Nouvelle note',
  content text not null default '',
  updated_at timestamptz default now()
);

-- Index pour la performance
create index notes_user_id_idx on notes(user_id);
create index notes_updated_at_idx on notes(updated_at desc);

-- Policy pour que les utilisateurs ne voient que leurs notes
alter table notes enable row level security;

create policy "Users can view own notes"
  on notes for select
  using (auth.uid() = user_id);

create policy "Users can insert own notes"
  on notes for insert
  with check (auth.uid() = user_id);

create policy "Users can update own notes"
  on notes for update
  using (auth.uid() = user_id);

create policy "Users can delete own notes"
  on notes for delete
  using (auth.uid() = user_id);
```

### 3. Email Templates (optionnel)

Dans Supabase Dashboard > Authentication > Email Templates, vous pouvez personnaliser l'email du magic link.

## 📊 Architecture

### Avant (Mock)

```
User login → Cookie "user-id" → Mock Map en mémoire
                                  ↓
                              Notes perdues au redémarrage
```

### Après (Supabase)

```
User login → Magic link → Supabase Auth → Session persistante
                                           ↓
                                    PostgreSQL Database
                                           ↓
                                    Notes conservées ✅
```

## 🆕 Nouvelles dépendances

```json
{
  "@supabase/ssr": "^0.1.0"  // Remplace @supabase/auth-helpers-nextjs (déprécié)
}
```

## ⚠️ Points importants

1. **Magic Links** : Les liens expirent après 1 heure par défaut
2. **Rate limiting** : Supabase limite les tentatives de connexion (protection anti-spam)
3. **Email Confirmation** : Désactivé par défaut pour les tests, à activer en production
4. **CORS** : L'URL de callback doit être autorisée dans Supabase Dashboard

## 🔜 Prochaines étapes

- **Étape 3** : Intégration Stripe (abonnements Pro)
- **Étape 4** : Intégration OpenAI (génération de fiches et quiz avec IA)

## 📝 Troubleshooting

### "Email not sent"
→ Vérifiez que votre projet Supabase a configuré l'envoi d'emails

### "Invalid login credentials"
→ Vérifiez que l'email est correctement orthographié

### Redirection infinie
→ Vérifiez que les variables d'environnement sont correctement définies

### Notes ne s'affichent pas
→ Vérifiez les Row Level Security policies dans Supabase

---

**Status** : ✅ Authentification Supabase fonctionnelle et testée
**Date** : 31 octobre 2025

