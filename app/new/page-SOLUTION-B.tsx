// SOLUTION B : Client simplifié (ALTERNATIVE)
// Cette solution utilise fetch() direct au lieu de React Query pour éviter les conflits de callbacks
// Avantages : Garde le contrôle côté client, UI de chargement visible

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
    // Protection contre double exécution (React Strict Mode)
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

        // Navigation seulement si pas annulé (cleanup)
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
