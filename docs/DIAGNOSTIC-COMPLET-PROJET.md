# 🔍 Diagnostic Complet du Projet Nothly

## 📋 Résumé Exécutif

Ce document présente un diagnostic complet du projet, identifiant tous les problèmes potentiels et leurs solutions.

---

## 🔴 PROBLÈMES CRITIQUES

### 1. **Polling Excessif - Requêtes Toutes les 200-300ms**

**Symptômes observés :**
- Logs montrent `GET /api/collections` toutes les 200-300ms au lieu de 5 secondes
- Logs montrent `GET /api/collections/[id]` toutes les 300ms

**Cause identifiée :**
- Le `useEffect` dans `useCollections.ts` se réexécute trop souvent
- `processingIdsKey` change à chaque render même si les IDs sont identiques
- Plusieurs instances du hook peuvent être montées simultanément

**Fichiers concernés :**
- `lib/hooks/useCollections.ts` (lignes 91-152)
- `lib/hooks/useCollections.ts` (lignes 157-224 pour `useCollectionDetail`)

**Solution appliquée :**
- ✅ `useMemo` pour mémoriser `processingIdsKey`
- ✅ Logs de debug ajoutés
- ⚠️ **PROBLÈME PERSISTE** - Le `useEffect` se réexécute encore trop souvent

**Solution recommandée :**
```typescript
// Utiliser une référence stable pour éviter les réexécutions
const processingIdsRef = useRef<string>("")
const processingIdsKey = useMemo(() => {
  if (!query.data) return ""
  const key = query.data
    .filter((c) => c.status === "processing")
    .map((c) => c.id)
    .sort()
    .join(",")
  
  // Ne mettre à jour que si la clé change vraiment
  if (key !== processingIdsRef.current) {
    processingIdsRef.current = key
  }
  return processingIdsRef.current
}, [query.data])
```

### 2. **Foreign Keys Incohérentes dans Supabase**

**Problème :**
- `async_jobs.user_id` → `public.users(id)` ❌
- `study_collections.user_id` → `public.users(id)` ❌
- Mais `documents.user_id` → `auth.users(id)` ✅
- `notes.user_id` → `auth.users(id)` ✅

**Impact :**
- Erreurs silencieuses lors des insertions
- Contraintes de foreign keys qui échouent
- Données incohérentes

**Solution :**
- Script créé : `supabase-fix-foreign-keys.sql`
- ⚠️ **NON APPLIQUÉ** - À exécuter dans Supabase SQL Editor

### 3. **Index Manquants dans Supabase**

**Problèmes identifiés :**
- Index GIN sur `tags` peut être manquant → `.overlaps("tags", rawTags)` lent
- Index composite pour polling `async_jobs` peut être manquant
- Index pour optimiser RLS `EXISTS` queries peut être manquant

**Impact :**
- Requêtes très lentes (timeout possible)
- Polling inefficace
- RLS qui ralentit les requêtes

**Solution :**
- Script créé : `supabase-check.sql` et `supabase-optimizations.sql`
- ⚠️ **NON APPLIQUÉ** - À exécuter dans Supabase SQL Editor

---

## 🟡 PROBLÈMES MOYENS

### 4. **Conflit refetchOnMount dans React Query Provider**

**Problème :**
- `ReactQueryProvider` a `refetchOnMount: true` par défaut (ligne 20)
- `useCollections` a aussi `refetchOnMount: true` (ligne 85)
- Cela peut causer des refetches multiples au mount

**Solution recommandée :**
```typescript
// Dans lib/react-query-provider.tsx
refetchOnMount: false, // Laisser chaque hook décider
```

### 5. **Plusieurs Instances de Hooks Potentiellement Montées**

**Problème :**
- `useCollections()` peut être appelé dans plusieurs composants
- Chaque instance crée son propre intervalle de polling
- Pas de mécanisme global pour éviter les doublons

**Fichiers concernés :**
- `app/flashcards/page.tsx` (ligne 83)
- Potentiellement d'autres composants

**Solution recommandée :**
- Utiliser un contexte React Query global pour le polling
- Ou vérifier si un intervalle existe déjà avant d'en créer un nouveau

### 6. **Worker Polling Inefficace**

**Problème :**
- Workers pollent toutes les 2 secondes même s'il n'y a pas de jobs
- Pas de backoff exponentiel
- Consommation inutile de ressources

**Fichiers concernés :**
- `scripts/process-ai-jobs.ts` (ligne 7)
- `scripts/process-collection-jobs.ts` (ligne 10)

**Solution recommandée :**
```typescript
let pollInterval = 1000 // Commencer à 1 seconde
let consecutiveEmptyPolls = 0

while (true) {
  const pendingJob = await fetchNextPendingJob()
  
  if (!pendingJob) {
    consecutiveEmptyPolls++
    // Backoff exponentiel jusqu'à 30 secondes max
    pollInterval = Math.min(pollInterval * 1.5, 30000)
    await sleep(pollInterval)
    continue
  }
  
  // Réinitialiser l'intervalle si un job est trouvé
  consecutiveEmptyPolls = 0
  pollInterval = 1000
  await runJob(pendingJob)
}
```

### 7. **Pas de Timeout sur les Requêtes Supabase**

**Problème :**
- Si Supabase est lent, les requêtes peuvent bloquer indéfiniment
- Pas de timeout configuré
- Workers peuvent rester bloqués

**Solution recommandée :**
- Ajouter `AbortController` avec timeout sur les requêtes critiques
- Timeout de 10-30 secondes selon le contexte

### 8. **Pas de Retry Mechanism pour OpenAI**

**Problème :**
- Les appels OpenAI échouent immédiatement en cas d'erreur temporaire
- Pas de retry avec backoff exponentiel
- Jobs échouent pour des erreurs récupérables

**Fichiers concernés :**
- `lib/ai-generation.ts`
- `lib/ai/jobs.ts`

**Solution recommandée :**
- Utiliser `p-retry` ou implémenter un retry manuel
- Limiter à 3 tentatives avec backoff exponentiel

---

## 🟢 PROBLÈMES MINEURS

### 9. **Logs de Debug en Production**

**Problème :**
- Beaucoup de `console.log` dans le code
- Pas de système de logging structuré
- Logs peuvent ralentir l'application

**Solution recommandée :**
- Utiliser une bibliothèque de logging (ex: `pino`, `winston`)
- Désactiver les logs en production sauf erreurs

### 10. **Pas de Monitoring Centralisé**

**Problème :**
- Difficile de suivre l'état des jobs en production
- Pas de dashboard pour visualiser les erreurs
- Logs dispersés

**Solution recommandée :**
- Intégrer Sentry ou Datadog
- Créer un endpoint de monitoring simple
- Logger les métriques importantes

---

## 📊 ANALYSE DES FICHIERS CLÉS

### `lib/hooks/useCollections.ts`

**Problèmes :**
1. `useEffect` se réexécute trop souvent (ligne 102-152)
2. `processingIdsKey` recalculé même si identique
3. Pas de vérification si plusieurs instances existent

**Recommandations :**
- Utiliser `useRef` pour tracker la dernière clé
- Ajouter une vérification pour éviter les intervalles multiples
- Utiliser un contexte global pour le polling

### `lib/react-query-provider.tsx`

**Problèmes :**
1. `refetchOnMount: true` par défaut peut causer des conflits
2. `staleTime: 30_000` mais `useCollections` a `staleTime: 60_000` (incohérence)

**Recommandations :**
- Harmoniser les `staleTime` entre provider et hooks
- Désactiver `refetchOnMount` par défaut

### `app/api/collections/route.ts`

**Problèmes :**
1. ✅ Vérification admin client ajoutée
2. ✅ Logs détaillés ajoutés
3. ⚠️ Pas de timeout sur les requêtes Supabase
4. ⚠️ Pas de retry sur les erreurs temporaires

**Recommandations :**
- Ajouter timeout sur requêtes Supabase
- Implémenter retry pour erreurs temporaires

### `scripts/process-ai-jobs.ts` et `scripts/process-collection-jobs.ts`

**Problèmes :**
1. Polling constant même sans jobs
2. Pas de backoff exponentiel
3. Pas de timeout sur les jobs
4. Race conditions possibles (SELECT sans lock)

**Recommandations :**
- Implémenter backoff exponentiel
- Ajouter timeout sur les jobs (ex: 30 minutes)
- Utiliser fonction PostgreSQL `claim_next_pending_job` pour éviter les race conditions

---

## 🔧 ACTIONS PRIORITAIRES

### Priorité 1 (Critique) - À faire immédiatement

1. **Corriger le polling excessif**
   - [ ] Utiliser `useRef` pour tracker la dernière clé de manière stable
   - [ ] Ajouter une vérification pour éviter les intervalles multiples
   - [ ] Tester que le polling est bien toutes les 5 secondes

2. **Corriger les foreign keys Supabase**
   - [ ] Exécuter `supabase-fix-foreign-keys.sql` dans Supabase SQL Editor
   - [ ] Vérifier que toutes les foreign keys pointent vers `auth.users`

3. **Créer les index manquants**
   - [ ] Exécuter `supabase-optimizations.sql` dans Supabase SQL Editor
   - [ ] Vérifier les performances des requêtes

### Priorité 2 (Important) - À faire cette semaine

4. **Optimiser les workers**
   - [ ] Implémenter backoff exponentiel
   - [ ] Ajouter timeout sur les jobs
   - [ ] Utiliser fonction PostgreSQL pour éviter les race conditions

5. **Harmoniser React Query**
   - [ ] Désactiver `refetchOnMount` par défaut dans le provider
   - [ ] Harmoniser les `staleTime` entre provider et hooks

6. **Ajouter timeout sur requêtes**
   - [ ] Timeout sur requêtes Supabase critiques
   - [ ] Timeout sur appels OpenAI

### Priorité 3 (Amélioration) - À faire ce mois

7. **Implémenter retry mechanism**
   - [ ] Retry avec backoff pour OpenAI
   - [ ] Retry pour erreurs Supabase temporaires

8. **Améliorer le logging**
   - [ ] Système de logging structuré
   - [ ] Désactiver logs de debug en production

9. **Ajouter monitoring**
   - [ ] Intégrer Sentry ou équivalent
   - [ ] Dashboard simple pour visualiser les jobs

---

## 📈 MÉTRIQUES À SURVEILLER

1. **Fréquence des requêtes**
   - Objectif : Polling toutes les 5 secondes
   - Actuel : Toutes les 200-300ms ❌

2. **Performance Supabase**
   - Objectif : Requêtes < 500ms
   - À surveiller après création des index

3. **Taux d'erreur des jobs**
   - Objectif : < 1%
   - À surveiller après ajout du retry mechanism

4. **Utilisation ressources workers**
   - Objectif : Réduire de 50% avec backoff exponentiel
   - À mesurer après optimisation

---

## 🎯 CONCLUSION

Le projet présente plusieurs problèmes critiques qui doivent être corrigés immédiatement :

1. **Polling excessif** - Cause principale des requêtes trop fréquentes
2. **Foreign keys incohérentes** - Peut causer des erreurs silencieuses
3. **Index manquants** - Peut ralentir considérablement l'application

Les solutions sont identifiées et des scripts SQL sont prêts à être exécutés. Une fois ces corrections appliquées, l'application devrait fonctionner de manière stable et performante.

