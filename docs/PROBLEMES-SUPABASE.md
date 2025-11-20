# 🔍 Analyse des Problèmes Potentiels Supabase

## ⚠️ Problèmes identifiés

### 1. **RLS sur async_jobs peut bloquer les workers**
- **Problème** : RLS activé sur `async_jobs` avec policy "Users manage own async jobs"
- **Impact** : Si les workers n'utilisent pas correctement `service_role_key`, ils ne peuvent pas accéder aux jobs
- **Vérification** : Les workers utilisent `getSupabaseAdmin()` qui devrait bypass RLS ✅
- **Risque** : Si `SUPABASE_SERVICE_ROLE_KEY` n'est pas configuré, les workers échouent

### 2. **Index non optimisé pour le polling**
- **Problème** : Requête `SELECT * FROM async_jobs WHERE status = 'pending' AND type = 'ai-generation' ORDER BY created_at`
- **Index actuel** : 
  - `async_jobs_status_idx` sur `(status, created_at desc)`
  - Mais pas d'index composite incluant `type`
- **Impact** : Requêtes plus lentes, surtout avec beaucoup de jobs
- **Solution** : Créer index composite `(status, type, created_at)`

### 3. **Race conditions dans les workers**
- **Problème** : Les workers font `SELECT` puis `UPDATE` sans verrouillage
- **Impact** : Plusieurs workers peuvent prendre le même job
- **Solution** : Utiliser `SELECT FOR UPDATE SKIP LOCKED` (PostgreSQL)

### 4. **RLS ralentit les requêtes côté client**
- **Problème** : `/api/collections` utilise parfois le client public avec RLS
- **Impact** : RLS ajoute une surcharge sur chaque requête
- **Vérification** : Le code utilise `getSupabaseAdmin()` ✅ mais pourrait être optimisé

### 5. **Pas de timeout sur les requêtes Supabase**
- **Problème** : Si Supabase est lent, les requêtes peuvent bloquer indéfiniment
- **Impact** : Workers bloqués, jobs non traités
- **Solution** : Ajouter timeout sur les requêtes

### 6. **Pas de retry sur les erreurs Supabase**
- **Problème** : Erreurs temporaires Supabase causent l'échec immédiat des jobs
- **Impact** : Jobs échouent pour des erreurs récupérables
- **Solution** : Retry avec backoff exponentiel

### 7. **RLS sur study_collections avec sous-requêtes**
- **Problème** : Policy RLS sur `study_collection_sources` fait des `EXISTS` sur `study_collections`
- **Impact** : Requêtes plus lentes avec beaucoup de collections
- **Solution** : Index sur `study_collections(user_id, id)` pour optimiser les EXISTS

### 8. **Pas de monitoring des performances Supabase**
- **Problème** : Pas de logs sur la durée des requêtes Supabase
- **Impact** : Difficile d'identifier les requêtes lentes
- **Solution** : Logger la durée des requêtes critiques

## 🔧 Solutions recommandées

### 1. Créer index optimisé pour le polling
```sql
-- Index composite pour optimiser le polling des workers
CREATE INDEX IF NOT EXISTS async_jobs_polling_idx 
ON async_jobs(status, type, created_at ASC)
WHERE status = 'pending';
```

### 2. Utiliser SELECT FOR UPDATE SKIP LOCKED
```typescript
// Dans scripts/process-ai-jobs.ts
const { data, error } = await admin
  .from("async_jobs")
  .select("*")
  .eq("status", "pending")
  .eq("type", AI_GENERATION_JOB_TYPE)
  .order("created_at", { ascending: true })
  .limit(1)
  // ⚠️ Supabase JS ne supporte pas directement SELECT FOR UPDATE
  // Il faut utiliser une fonction PostgreSQL ou rpc()
```

### 3. Créer fonction PostgreSQL pour le polling atomique
```sql
CREATE OR REPLACE FUNCTION claim_next_pending_job(job_type TEXT)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  type TEXT,
  status TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ
) AS $$
DECLARE
  claimed_job RECORD;
BEGIN
  SELECT * INTO claimed_job
  FROM async_jobs
  WHERE status = 'pending'
    AND type = job_type
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;
  
  IF FOUND THEN
    UPDATE async_jobs
    SET status = 'running',
        started_at = NOW(),
        updated_at = NOW()
    WHERE async_jobs.id = claimed_job.id;
    
    RETURN QUERY SELECT * FROM async_jobs WHERE id = claimed_job.id;
  END IF;
END;
$$ LANGUAGE plpgsql;
```

### 4. Ajouter index pour optimiser RLS
```sql
-- Index pour optimiser les EXISTS dans les policies RLS
CREATE INDEX IF NOT EXISTS study_collections_user_id_idx 
ON study_collections(user_id, id);
```

### 5. Vérifier que service_role_key est bien utilisée
```typescript
// Dans lib/db.ts - vérifier que le client admin bypass bien RLS
export function getSupabaseAdmin(): AnySupabaseClient | null {
  // Vérifier que SUPABASE_SERVICE_ROLE_KEY est bien configuré
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[Supabase Admin] Service role key not configured')
    return null
  }
  // Le client créé avec service_role_key bypass automatiquement RLS
}
```

## 📊 Requêtes à vérifier dans Supabase

### Vérifier les index
```sql
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('async_jobs', 'study_collections', 'study_collection_sources')
ORDER BY tablename, indexname;
```

### Vérifier les policies RLS
```sql
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('async_jobs', 'study_collections')
ORDER BY tablename, policyname;
```

### Vérifier les performances des requêtes
```sql
-- Voir les requêtes lentes
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
WHERE query LIKE '%async_jobs%'
   OR query LIKE '%study_collections%'
ORDER BY mean_time DESC
LIMIT 10;
```

## 🎯 Priorités

1. **Haute** : Créer index composite pour le polling
2. **Haute** : Implémenter SELECT FOR UPDATE pour éviter les race conditions
3. **Moyenne** : Optimiser les index pour RLS
4. **Moyenne** : Ajouter timeout sur les requêtes
5. **Basse** : Ajouter monitoring des performances


