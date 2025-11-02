# 🔧 Fix : Notes n'apparaissent pas sur le Dashboard

## 🐛 Problème

Les notes ne s'affichaient plus sur la page `/dashboard` après la refonte.

## 💡 Cause

Le dashboard utilisait un client Supabase simple (`createClient`) qui n'avait **pas accès aux cookies d'authentification** côté serveur.

```typescript
// ❌ AVANT (ne fonctionnait pas)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

Ce client n'avait pas l'authentification de l'utilisateur, donc la requête avec `.eq("user_id", user.id)` ne retournait rien.

## ✅ Solution

Utiliser le **client serveur approprié** qui a accès aux cookies :

```typescript
// ✅ APRÈS (fonctionne)
import { createServerClient } from "@/lib/supabase-server"

const supabase = await createServerClient() // ⚠️ N'oubliez pas le await !
```

⚠️ **Important** : `createServerClient()` est une fonction **async**, il faut donc l'attendre avec `await`.

Ce client utilise les cookies de session pour s'authentifier automatiquement.

## 🔄 Changement appliqué

**Fichier : `app/dashboard/page.tsx`**

```diff
- import { createClient } from "@supabase/supabase-js"
+ import { createServerClient } from "@/lib/supabase-server"

export default async function DashboardPage() {
  const user = await getUser()
  
- const supabase = createClient(
-   process.env.NEXT_PUBLIC_SUPABASE_URL!,
-   process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
- )
+ const supabase = await createServerClient()  // ⚠️ await est crucial !

  const { data: notes, error } = await supabase
    .from("notes")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
```

## 🎯 Résultat

- ✅ Les notes s'affichent maintenant correctement
- ✅ Le filtre `user_id` fonctionne
- ✅ Seules les notes de l'utilisateur connecté sont visibles

## 🔍 Comprendre la différence

### `createClient` (client simple)
- ❌ Pas d'authentification automatique
- ❌ Pas d'accès aux cookies
- ❌ À utiliser uniquement avec `service_role` key (admin)

### `createServerClient` (client serveur)
- ✅ Authentification via cookies
- ✅ Row Level Security (RLS) respectée
- ✅ Contexte utilisateur préservé
- ✅ À utiliser dans les Server Components

## 📝 Règle à retenir

**Dans Next.js 13+ avec App Router :**

| Contexte | Client à utiliser |
|----------|-------------------|
| **Server Component** | `createServerClient()` |
| **Client Component** | `createClient()` (via lib/supabase-client) |
| **API Route** | `createServerClient()` ou client custom |
| **Middleware** | `createServerClient()` (via @supabase/ssr) |

## ✅ Vérification

Pour vérifier que ça fonctionne :

1. Connectez-vous
2. Allez sur `/dashboard`
3. Vos notes doivent s'afficher ✅
4. Le compteur doit être correct

## 🐛 Si le problème persiste

### 1. Vérifier la console serveur
```bash
# Regardez les logs dans le terminal où tourne npm run dev
# Vous devriez voir "Erreur chargement notes:" si problème
```

### 2. Vérifier la base de données
```sql
-- Dans Supabase SQL Editor
SELECT * FROM notes WHERE user_id = 'votre_user_id';
```

### 3. Vérifier RLS (Row Level Security)
```sql
-- Les policies doivent permettre SELECT
-- Vérifiez dans Supabase > Authentication > Policies
```

### 4. Redémarrer complètement
```bash
pkill -f "next dev"
rm -rf .next
npm run dev
```

## 🎉 Problème résolu !

Le dashboard affiche maintenant correctement toutes vos notes avec :
- ✅ Authentification via cookies
- ✅ Filtrage par utilisateur
- ✅ RLS respectée
- ✅ Performance optimale

---

**Date de correction :** $(date)  
**Fichier modifié :** `app/dashboard/page.tsx`  
**Status :** ✅ Résolu

