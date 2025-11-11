# 🚀 Refactoring "Instant Notes" - Nothly

## ✅ Modifications complétées

### 1. Navigation instantanée (`/new`)
- ✅ `/app/new/page.tsx` : Retourne `null` pour une navigation instantanée (<100ms)
- ✅ Génère un UUID local et redirige immédiatement vers `/note/[id]`
- ✅ Aucune requête serveur lors de la création

### 2. API idempotente (`/api/notes/[id]`)
- ✅ PATCH upsert : Crée si n'existe pas, met à jour sinon
- ✅ Gère correctement `updated_at` (via trigger PostgreSQL)
- ✅ Retourne uniquement les champs nécessaires (`id`, `title`, `content`, `updated_at`)

### 3. Composant d'édition (`/app/note/[id]/page.tsx`)
- ✅ Utilise `initialData` pour éviter le fetch GET initial
- ✅ Aucune requête tant que l'utilisateur n'a pas écrit
- ✅ Gère les notes "locales" (non encore créées en DB)

### 4. Auto-save optimisé (`useAutoSave`)
- ✅ Debounce de **300ms** (au lieu de 1000ms)
- ✅ `keepalive: true` sur les requêtes fetch
- ✅ Mise à jour optimiste du cache React Query
- ✅ Clé de cache corrigée : `["note", noteId]` (singulier)

### 5. Temps réel Supabase (`useRealtimeNote`)
- ✅ Clé de cache corrigée : `["note", noteId]` pour correspondre à `useNote`
- ✅ Synchronisation en live entre onglets/fenêtres
- ✅ Met à jour le cache React Query automatiquement

### 6. Persistance React Query
- ✅ Code activé avec import dynamique (évite les erreurs si packages non installés)
- ✅ Persiste dans `localStorage` avec la clé `NOTLHY_QUERY_CACHE`
- ✅ MaxAge : 24 heures
- ✅ Ne persiste que les notes (queryKey: "notes" ou "note")

### 7. RLS (Row Level Security)
- ✅ Fichier SQL créé : `supabase-rls-optimized.sql`
- ✅ Policy combinée "for all" : `user can manage own notes`
- ✅ Utilise `auth.uid() = user_id` pour l'isolation

### 8. Tests Playwright
- ✅ `tests/instant-note.spec.ts` : Tests E2E complets
- ✅ Test navigation instantanée
- ✅ Test création au premier edit
- ✅ Test debounce 300ms
- ✅ Test synchronisation temps réel

## 📋 Actions requises

### 1. Installer les packages de persistance (optionnel mais recommandé)

```bash
npm install @tanstack/react-query-persist-client @tanstack/query-sync-storage-persister
```

**Note** : Si les packages ne sont pas installés, l'application fonctionnera sans persistance (import dynamique).

### 2. Exécuter les scripts SQL dans Supabase

#### A. Trigger pour `updated_at` (obligatoire)

Exécuter `supabase-triggers.sql` dans l'éditeur SQL de Supabase :

```sql
-- Crée le trigger pour mettre à jour updated_at automatiquement
```

#### B. RLS optimisé (recommandé)

Exécuter `supabase-rls-optimized.sql` dans l'éditeur SQL de Supabase :

```sql
-- Active RLS avec policy combinée "for all"
-- Remplace les anciennes policies séparées
```

### 3. Activer Realtime sur Supabase

Dans le dashboard Supabase :
1. Aller dans **Database** → **Replication**
2. Activer la réplication pour la table `notes`
3. Vérifier que les événements `INSERT`, `UPDATE`, `DELETE` sont activés

### 4. Tester l'application

```bash
npm run dev
```

**Tests à effectuer manuellement :**
- ✅ Naviguer vers `/new` → doit être instantané (<100ms)
- ✅ Taper du texte → note créée au premier edit (300ms debounce)
- ✅ Ouvrir deux onglets → modifications synchronisées en temps réel
- ✅ Vérifier qu'il n'y a pas de 404 dans la console pour les nouvelles notes

### 5. Lancer les tests Playwright

```bash
npx playwright test tests/instant-note.spec.ts
```

## 🎯 Résultats attendus

### Performance
- ⚡ Navigation `/new` → `/note/[id]` : **<100ms**
- ⚡ Création de note au premier edit : **<100ms**
- ⚡ Debounce : **300ms** (au lieu de 1000ms)

### Expérience utilisateur
- ✅ Aucun spinner de chargement lors de la création
- ✅ Édition fluide sans latence perceptible
- ✅ Synchronisation en temps réel entre onglets
- ✅ Aucune note "vide" créée inutilement

### Sécurité
- ✅ RLS activé avec policy combinée
- ✅ Isolation des données par utilisateur
- ✅ Validation côté serveur

## 🔍 Vérifications

### Console navigateur
- ✅ Pas de 404 pour les nouvelles notes
- ✅ Requêtes PATCH seulement après debounce
- ✅ Messages Realtime : "✅ Abonné aux changements de la note"

### Network tab
- ✅ Aucune requête GET initiale pour les nouvelles notes
- ✅ Requêtes PATCH avec `keepalive: true`
- ✅ Réponses <100ms

### Base de données
- ✅ Trigger `update_notes_updated_at` actif
- ✅ RLS activé sur table `notes`
- ✅ Policy `user can manage own notes` présente

## 📝 Notes techniques

### Clés de cache React Query
- `["notes"]` : Liste de toutes les notes
- `["note", noteId]` : Note individuelle (singulier)

### Flow de création
1. Utilisateur va sur `/new`
2. UUID généré localement (`crypto.randomUUID()`)
3. Redirection immédiate vers `/note/[uuid]`
4. `useNote` initialise avec `initialData` (note vide locale)
5. Aucun fetch GET initial
6. Au premier edit → `useAutoSave` déclenche PATCH après 300ms
7. API upsert crée la note si elle n'existe pas
8. Realtime synchronise avec les autres onglets

### Gestion des erreurs
- 404 géré silencieusement (note locale)
- Retry désactivé pour les 404
- Rollback optimiste en cas d'erreur

## 🐛 Debugging

### Si la note n'est pas créée
- Vérifier que le trigger `update_notes_updated_at` est actif
- Vérifier les logs serveur pour les erreurs PATCH
- Vérifier que RLS permet l'INSERT

### Si le temps réel ne fonctionne pas
- Vérifier que Realtime est activé sur Supabase
- Vérifier les messages dans la console : "✅ Abonné"
- Vérifier que la clé de cache est correcte : `["note", noteId]`

### Si la persistance ne fonctionne pas
- Installer les packages : `npm install @tanstack/react-query-persist-client @tanstack/query-sync-storage-persister`
- Vérifier `localStorage.getItem("NOTLHY_QUERY_CACHE")`
- Vérifier la console pour les erreurs d'import dynamique

## ✨ Améliorations futures possibles

- [ ] Optimistic updates pour les listes de notes
- [ ] Compression du cache localStorage
- [ ] IndexedDB au lieu de localStorage pour plus de capacité
- [ ] Batch des requêtes PATCH si plusieurs notes sont éditées
- [ ] Metrics de performance (temps de création, latence réseau)



