# 🔍 Vérification Supabase - Causes Possibles de Boucles

## Problèmes potentiels identifiés

### 1. **Requête avec `.overlaps("tags", rawTags)` peut être lente**
```typescript
// Dans app/api/collections/route.ts ligne 134
.overlaps("tags", rawTags)
```
- **Problème** : Si l'index GIN sur `tags` n'existe pas, cette requête peut être très lente
- **Impact** : Timeout → retry → boucle infinie
- **Vérification** : Vérifier que l'index `study_collections_tags_idx` existe

### 2. **Relations Supabase avec foreign keys**
```typescript
// Ligne 119-130
current_version:document_versions!documents_current_version_fk (
  id, storage_path, raw_text, created_at
),
document_versions:document_versions!document_versions_document_id_fkey (
  id, storage_path, raw_text, created_at
)
```
- **Problème** : Si les foreign keys ne sont pas correctement configurées, ces relations peuvent échouer
- **Impact** : Requête qui retourne des données partielles ou échoue silencieusement
- **Vérification** : Vérifier les contraintes de foreign keys dans Supabase

### 3. **RLS qui bloque silencieusement**
- **Problème** : Si RLS bloque une requête mais retourne un tableau vide au lieu d'une erreur
- **Impact** : Le code pense qu'il n'y a pas de données et retente
- **Vérification** : Vérifier les policies RLS sur `documents` et `document_versions`

### 4. **Admin client qui fallback sur client public**
```typescript
// Ligne 44
const admin = getSupabaseAdmin()
const db = admin ?? supabase  // ⚠️ Si admin est null, utilise le client public
```
- **Problème** : Si `getSupabaseAdmin()` retourne `null`, on utilise le client public qui est soumis à RLS
- **Impact** : Requêtes bloquées par RLS → retry → boucle
- **Solution** : Vérifier que `SUPABASE_SERVICE_ROLE_KEY` est bien configuré

### 5. **Pas de timeout sur les requêtes Supabase**
- **Problème** : Si Supabase est lent, les requêtes peuvent bloquer indéfiniment
- **Impact** : Le client pense que la requête a échoué et retente
- **Solution** : Ajouter un timeout

## 🔧 Scripts de vérification SQL

### Vérifier les index
```sql
-- Vérifier que l'index GIN sur tags existe
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'study_collections'
  AND indexname LIKE '%tags%';

-- Si l'index n'existe pas, le créer :
CREATE INDEX IF NOT EXISTS study_collections_tags_idx 
ON study_collections USING gin(tags);
```

### Vérifier les foreign keys
```sql
-- Vérifier les foreign keys sur documents
SELECT
  tc.table_name, 
  kcu.column_name, 
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name IN ('documents', 'document_versions', 'study_collections');
```

### Vérifier les policies RLS
```sql
-- Vérifier que RLS est activé et les policies
SELECT 
  schemaname,
  tablename,
  rowsecurity,
  (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = t.tablename) as policy_count
FROM pg_tables t
WHERE schemaname = 'public'
  AND tablename IN ('documents', 'document_versions', 'study_collections', 'study_collection_sources')
ORDER BY tablename;
```

### Vérifier les performances des requêtes
```sql
-- Activer pg_stat_statements si pas déjà fait
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Voir les requêtes les plus lentes
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
WHERE query LIKE '%study_collections%'
   OR query LIKE '%documents%'
ORDER BY mean_time DESC
LIMIT 10;
```

## 🛠️ Corrections à appliquer

### 1. Ajouter des logs détaillés
```typescript
// Dans app/api/collections/route.ts
const { data: documents, error: documentsError } = await db
  .from("documents")
  .select(...)
  .eq("user_id", user.id)
  .overlaps("tags", rawTags)

if (documentsError) {
  console.error("[POST /api/collections] documents ERROR:", {
    error: documentsError,
    code: documentsError.code,
    message: documentsError.message,
    details: documentsError.details,
    hint: documentsError.hint,
  })
  return NextResponse.json({ error: "Impossible de récupérer les supports" }, { status: 500 })
}

console.log("[POST /api/collections] documents found:", documents?.length || 0)
```

### 2. Vérifier que admin n'est jamais null
```typescript
const admin = getSupabaseAdmin()
if (!admin) {
  console.error("[POST /api/collections] Admin client is null!")
  return NextResponse.json({ error: "Configuration serveur invalide" }, { status: 500 })
}
const db = admin
```

### 3. Ajouter un timeout sur les requêtes
```typescript
// Utiliser AbortController pour timeout
const controller = new AbortController()
const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 secondes

try {
  const { data, error } = await db
    .from("documents")
    .select(...)
    .abortSignal(controller.signal)
  clearTimeout(timeoutId)
} catch (error) {
  clearTimeout(timeoutId)
  if (error.name === 'AbortError') {
    console.error("Request timeout")
  }
}
```

### 4. Vérifier les index manquants
Exécuter le script SQL pour créer les index manquants si nécessaire.

