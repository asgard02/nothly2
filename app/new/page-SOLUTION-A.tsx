// SOLUTION A : Server-first (RECOMMANDÉE)
// Cette solution utilise un Server Component avec redirect() Next.js
// Avantages : Plus rapide, plus simple, pas de problème de callbacks React Query

import { redirect } from "next/navigation"
import { createNote } from "@/lib/notes-server"

export const dynamic = "force-dynamic"

export default async function NewNotePage() {
  try {
    const { id } = await createNote()
    redirect(`/note/${id}`)
  } catch (error: any) {
    // En cas d'erreur (non authentifié, problème DB, etc.), rediriger vers dashboard
    console.error("[NewNote] ❌ Erreur création note:", error)
    redirect("/dashboard")
  }
}
