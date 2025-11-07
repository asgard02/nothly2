"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import type { Note } from "@/lib/hooks/useNotes"

export default function NewNotePage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const once = useRef(false)

  useEffect(() => {
    if (once.current) return
    once.current = true

    const createNoteOptimistic = async () => {
      // 1️⃣ Générer un UUID local (navigation instantanée)
      const tempId = crypto.randomUUID()
      
      // 2️⃣ Créer une note optimiste dans le cache React Query
      const optimisticNote: Note = {
        id: tempId,
        title: "Nouvelle note",
        content: "",
        user_id: "", // Sera rempli par le serveur
        updated_at: new Date().toISOString(),
      }

      // Préparer le cache avec la note temporaire
      queryClient.setQueryData<Note>(["note", tempId], optimisticNote)
      
      // Ajouter aussi à la liste des notes (optimistic)
      queryClient.setQueryData<Note[]>(["notes"], (old = []) => [
        optimisticNote,
        ...old,
      ])

      // 3️⃣ Navigation INSTANTANÉE (0ms perçu par l'utilisateur)
      router.replace(`/note/${tempId}`)

      // 4️⃣ Création réelle en arrière-plan (l'utilisateur ne voit pas l'attente)
      try {
        const res = await fetch("/api/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: tempId }), // Envoyer l'ID pour utiliser le même côté serveur
        })

        if (!res.ok) {
          throw new Error("Erreur lors de la création")
        }

        const realNote = await res.json()

        // 5️⃣ Mettre à jour le cache avec la vraie note (même ID grâce à l'optimistic UI)
        queryClient.setQueryData<Note>(["note", tempId], realNote)

        // Mettre à jour la liste des notes avec la vraie note
        queryClient.setQueryData<Note[]>(["notes"], (old = []) => {
          const filtered = old.filter((n) => n.id !== tempId)
          return [realNote, ...filtered]
        })

        // Invalider pour s'assurer que tout est synchronisé
        queryClient.invalidateQueries({ queryKey: ["notes"] })
      } catch (error) {
        console.error("Erreur création note:", error)
        
        // En cas d'erreur, retirer la note optimiste
        queryClient.removeQueries({ queryKey: ["note", tempId] })
        queryClient.setQueryData<Note[]>(["notes"], (old = []) =>
          old.filter((n) => n.id !== tempId)
        )
        
        // Rediriger vers le dashboard
        router.replace("/dashboard")
      }
    }

    createNoteOptimistic()
  }, [router, queryClient])

  // Retourner null pour une navigation instantanée (pas de rendu UI)
  // L'utilisateur verra directement l'éditeur de note
  return null
}

