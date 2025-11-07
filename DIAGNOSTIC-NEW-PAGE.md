# 🔍 Diagnostic : Chargement infini sur `/new`

## 📋 Résumé exécutif

**Problème** : La page `/new` reste bloquée sur un loader infini malgré une création de note réussie côté API.

**Cause identifiée** : Conflit entre le callback `onSuccess` défini dans `useMutation` (hook React Query) et celui passé à `mutate()` dans le composant. Les callbacks passés à `mutate()` peuvent ne pas se déclencher de manière fiable avec React Query.

**Impact** : Blocage UX - l'utilisateur ne peut pas créer de notes rapidement.

---

## 🔎 Analyse détaillée

### Fichiers analysés

#### ✅ `app/new/page.tsx` (Ligne 10-116)
**Problème** : Utilise `useCreateNote()` avec un callback `onSuccess` passé à `mutate()`.

```typescript
// Ligne 32-40
createNote(undefined, {
  onSuccess: (newNote) => {
    // ❌ Ce callback peut ne pas se déclencher
    router.replace(`/note/${newNote.id}`)
  },
})
```

**Pourquoi ça ne marche pas** :
- React Query v4+ peut ignorer les callbacks passés à `mutate()` si un `onSuccess` est déjà défini dans `useMutation`.
- Le hook `useCreateNote` définit un `onSuccess` dans `lib/hooks/useNotes.ts`.
- Conflit entre les deux callbacks → celui du composant peut être ignoré.

#### ✅ `lib/hooks/useNotes.ts` (Ligne 94-111)
**Code actuel** :
```typescript
onSuccess: (data) => {
  queryClient.invalidateQueries({ queryKey: ["notes"] })
  queryClient.setQueryData<Note[]>(["notes"], (old) => {
    if (!old) return [data]
    return [data, ...old]
  })
},
```

#### ✅ `app/api/notes/route.ts` (Ligne 52-108)
**Status** : ✅ Fonctionne correctement
- Retourne `{ id, title, content, user_id }` avec status `201`
- Logs montrent que la création réussit

#### ✅ `middleware.ts`
**Status** : ✅ Pas de boucle de redirection
- Protège `/new` comme route protégée (nécessite session)
- Pas de redirect en boucle

#### ✅ `app/layout.tsx`
**Status** : ✅ Pas d'interférence
- Pas de guards ou redirects problématiques

---

## 🎯 Cause exacte

**Ligne problématique** : `app/new/page.tsx:32-40`

Le callback `onSuccess` passé à `mutate()` ne se déclenche pas car :
1. React Query priorise le `onSuccess` défini dans le hook `useMutation`
2. Les callbacks passés à `mutate()` peuvent être ignorés en cas de re-render
3. React Strict Mode peut causer des double-appels qui désynchronisent les callbacks

**Preuve** : Les logs montrent :
- ✅ `[useCreateNote] ✅ onSuccess appelé avec:` (callback du hook)
- ❌ `[NewNote] ✅ Note créée avec succès:` (callback du composant - NE SE DÉCLENCHE PAS)

---

## ✅ Solution A : Server-first (RECOMMANDÉE)

### Avantages
- Plus rapide (pas de round-trip client → API → client)
- Navigation instantanée avec `redirect()` Next.js
- Pas de problème de callbacks React Query
- Meilleure SEO et performance

### Implémentation

**Créer une fonction serveur pour créer une note** :

```typescript
// lib/notes-server.ts
import { createServerClient } from "@/lib/supabase-server"
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function createNote(): Promise<{ id: string }> {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    throw new Error("Non authentifié")
  }

  const { data, error } = await supabaseAdmin
    .from("notes")
    .insert({
      user_id: user.id,
      title: "Nouvelle note",
      content: "",
    })
    .select("id")
    .single()

  if (error || !data) {
    throw new Error(error?.message || "Échec de création")
  }

  return { id: data.id }
}
```

**Modifier `app/new/page.tsx`** :

```typescript
// app/new/page.tsx
import { redirect } from "next/navigation"
import { createNote } from "@/lib/notes-server"

export const dynamic = "force-dynamic"

export default async function NewNotePage() {
  try {
    const { id } = await createNote()
    redirect(`/note/${id}`)
  } catch (error: any) {
    // En cas d'erreur, rediriger vers dashboard
    redirect("/dashboard")
  }
}
```

### Impact
- ✅ Supprime complètement le problème de callbacks
- ✅ Plus simple (moins de code)
- ⚠️ Perd les composants UI (Sidebar, ChatButton) pendant la création
- ✅ Navigation instantanée

---

## ✅ Solution B : Client simplifié (ALTERNATIVE)

### Avantages
- Garde le contrôle côté client (UI, loading states)
- Pas besoin de fonction serveur supplémentaire
- Plus facile à déboguer côté client

### Implémentation

**Modifier `app/new/page.tsx`** :

```typescript
// app/new/page.tsx
"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Sidebar from "@/components/Sidebar"
import ChatButton from "@/components/ChatButton"
import { Loader2 } from "lucide-react"

export default function NewNotePage() {
  const router = useRouter()
  const hasCreated = useRef(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Protection contre double exécution
    if (hasCreated.current) return
    hasCreated.current = true

    let cancelled = false

    const createNote = async () => {
      try {
        const res = await fetch("/api/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        })

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}))
          throw new Error(errorData.error || `HTTP ${res.status}`)
        }

        const data = await res.json()
        
        if (!data?.id) {
          throw new Error("Réponse invalide : pas d'ID")
        }

        // Navigation seulement si pas annulé
        if (!cancelled) {
          router.replace(`/note/${data.id}`)
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error("[NewNote] ❌ Erreur:", err)
          setError(err.message || "Erreur lors de la création")
          // Rediriger vers dashboard après 2 secondes
          setTimeout(() => {
            router.replace("/dashboard")
          }, 2000)
        }
      }
    }

    createNote()

    return () => {
      cancelled = true
    }
  }, [router])

  if (error) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex-1 ml-64 flex items-center justify-center">
          <div className="text-center">
            <p className="text-destructive font-medium mb-4">{error}</p>
            <p className="text-muted-foreground text-sm">Redirection en cours...</p>
          </div>
        </div>
        <ChatButton />
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 ml-64 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground font-medium">Création de votre note...</p>
        </div>
      </div>
      <ChatButton />
    </div>
  )
}
```

**Optionnel : Retirer `onSuccess` du hook** pour éviter les conflits futurs :

```typescript
// lib/hooks/useNotes.ts - useCreateNote
export function useCreateNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || "Erreur lors de la création")
      }
      return res.json() as Promise<Note>
    },
    // ❌ Retirer onSuccess du hook - laisser les composants gérer
    onSettled: () => {
      // Invalider le cache après succès ou erreur
      queryClient.invalidateQueries({ queryKey: ["notes"] })
    },
  })
}
```

### Impact
- ✅ Résout le problème de callbacks
- ✅ Garde les composants UI
- ⚠️ Nécessite de retirer `onSuccess` du hook (ou utiliser uniquement `onSettled`)

---

## 🧪 Test de validation

### Script E2E (Playwright)

```typescript
// tests/new-note.spec.ts
import { test, expect } from '@playwright/test'

test('Création de note depuis /new', async ({ page }) => {
  // 1. Se connecter (si nécessaire)
  await page.goto('/login')
  // ... flow de connexion ...

  // 2. Visiter /new
  await page.goto('/new')

  // 3. Attendre la navigation vers /note/:id
  await page.waitForURL(/\/note\/[a-f0-9-]+/, { timeout: 5000 })

  // 4. Vérifier que l'URL a changé
  const url = page.url()
  expect(url).toMatch(/\/note\/[a-f0-9-]+/)

  // 5. Vérifier qu'il n'y a pas de spinner infini
  const loader = page.locator('[class*="animate-spin"]')
  await expect(loader).not.toBeVisible({ timeout: 2000 })
})
```

### Test manuel

1. Se connecter
2. Aller sur `http://localhost:3000/new`
3. Observer les logs console :
   - ✅ `[POST /api/notes] ✅ Note créée avec succès, ID: ...`
   - ✅ Navigation vers `/note/[id]` en < 2 secondes
4. Vérifier que la page d'édition de la note s'affiche correctement

---

## 📊 Comparaison des solutions

| Critère | Solution A (Server) | Solution B (Client) |
|---------|---------------------|---------------------|
| **Simplicité** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Performance** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **UX (Loading state)** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Fiabilité** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Compatibilité** | Next.js 13+ | Tous |

---

## 🚀 Recommandation

**Solution A (Server-first)** est recommandée car :
- Plus simple et robuste
- Performance optimale (pas de round-trip)
- Élimine complètement le problème de callbacks React Query
- Pattern recommandé par Next.js 13+ App Router

**Utiliser Solution B** si :
- Vous avez besoin d'états de chargement visuels complexes
- Vous voulez garder le contrôle côté client pour des raisons spécifiques

---

## 📝 Commandes pour tester

```bash
# Installer les dépendances (si nécessaire)
npm install

# Lancer le serveur de développement
npm run dev

# Tester manuellement
# 1. Ouvrir http://localhost:3000/new
# 2. Vérifier la navigation vers /note/:id
# 3. Vérifier les logs dans la console et le terminal
```

---

**Date de diagnostic** : $(date)  
**Fichier principal** : `app/new/page.tsx`  
**Cause** : Conflit entre callbacks React Query  
**Status** : ✅ Solutions prêtes à déployer
