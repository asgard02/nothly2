import { useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { createClient } from "@/lib/supabase-client"
import type { Note } from "./useNotes"

/**
 * Hook pour écouter les changements en temps réel d'une note
 * Utilise Supabase Realtime pour synchroniser les modifications entre utilisateurs
 */
export function useRealtimeNote(noteId: string | null) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!noteId) return

    const supabase = createClient()
    
    // Créer un channel pour cette note spécifique
    const channel = supabase
      .channel(`note:${noteId}`)
      .on(
        "postgres_changes",
        {
          event: "*", // INSERT, UPDATE, DELETE
          schema: "public",
          table: "notes",
          filter: `id=eq.${noteId}`,
        },
        (payload) => {
          console.log("[Realtime] Changement reçu:", payload.eventType, payload.new)
          
          // Mettre à jour le cache React Query avec les nouvelles données
          // ⚡ Clé corrigée : "note" au singulier pour correspondre à useNote
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            queryClient.setQueryData<Note>(["note", noteId], payload.new as Note)
            // Invalider aussi la liste des notes pour rafraîchir l'ordre
            queryClient.invalidateQueries({ queryKey: ["notes"] })
          } else if (payload.eventType === "DELETE") {
            // Si la note est supprimée, retirer du cache
            queryClient.removeQueries({ queryKey: ["note", noteId] })
            queryClient.invalidateQueries({ queryKey: ["notes"] })
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("[Realtime] ✅ Abonné aux changements de la note:", noteId)
        } else if (status === "CHANNEL_ERROR") {
          console.error("[Realtime] ❌ Erreur d'abonnement:", noteId)
        }
      })

    // Cleanup : se désabonner quand le composant se démonte
    return () => {
      supabase.removeChannel(channel)
      console.log("[Realtime] 🔌 Désabonné de la note:", noteId)
    }
  }, [noteId, queryClient])
}
