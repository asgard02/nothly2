import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

export interface Note {
  id: string
  title: string
  content: string
  user_id: string
  created_at?: string
  updated_at: string
}

// Hook pour récupérer toutes les notes
export function useNotes() {
  return useQuery({
    queryKey: ["notes"],
    queryFn: async () => {
      const res = await fetch("/api/notes")
      if (!res.ok) throw new Error("Erreur lors du chargement des notes")
      return res.json() as Promise<Note[]>
    },
  })
}

// Hook pour récupérer une note spécifique
// ⚡ Support des notes "locales" : initialise avec une note vide, fetch en arrière-plan si nécessaire
export function useNote(noteId: string | null) {
  return useQuery({
    queryKey: ["note", noteId], // Clé corrigée : "note" au singulier pour correspondre à useRealtimeNote
    queryFn: async (): Promise<Note> => {
      if (!noteId) throw new Error("ID de note invalide")
      
      const res = await fetch(`/api/notes/${noteId}`)
      
      // Si 404, la note n'existe pas encore → retourner une note "locale" vide
      // Elle sera créée au premier edit via PATCH upsert
      if (res.status === 404) {
        const emptyNote: Note = {
          id: noteId,
          title: "",
          content: "",
          user_id: "", // Sera rempli par le serveur au premier upsert
          updated_at: new Date().toISOString(),
        }
        // Ne pas throw pour les 404 - c'est normal pour les nouvelles notes
        return emptyNote
      }
      
      if (!res.ok) {
        const error = new Error(`Erreur ${res.status} lors du chargement de la note`)
        ;(error as any).status = res.status
        throw error
      }
      return res.json() as Promise<Note>
    },
    enabled: !!noteId, // Ne pas exécuter si noteId est null
    // ⚡ Toujours refetch au mount pour charger les notes existantes
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    staleTime: 5 * 60 * 1000, // 5 minutes - les données sont considérées fraîches pendant 5 min
    retry: (failureCount, error: any) => {
      // Ne pas retry si c'est un 404 (note n'existe pas) - c'est normal
      if (error?.status === 404 || (error instanceof Error && error.message.includes("404"))) {
        return false
      }
      // Retry jusqu'à 2 fois pour les autres erreurs
      return failureCount < 2
    },
    gcTime: 10 * 60 * 1000, // 10 minutes en cache
    // ⚡ Ne pas utiliser initialData pour les notes existantes - toujours fetch depuis le serveur
  })
}

// Hook pour mettre à jour une note
export function useUpdateNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      noteId,
      title,
      content,
    }: {
      noteId: string
      title?: string
      content?: string
    }) => {
      const res = await fetch(`/api/notes/${noteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content }),
      })
      if (!res.ok) throw new Error("Erreur lors de la mise à jour")
      return res.json() as Promise<Note>
    },
    onMutate: async ({ noteId, title, content }) => {
      // Annuler les requêtes en cours (clé corrigée : "note" au singulier)
      await queryClient.cancelQueries({ queryKey: ["note", noteId] })

      // Sauvegarder les données précédentes
      const previousNote = queryClient.getQueryData<Note>(["note", noteId])

      // Mise à jour optimiste
      if (previousNote) {
        queryClient.setQueryData<Note>(["note", noteId], {
          ...previousNote,
          title: title ?? previousNote.title,
          content: content ?? previousNote.content,
          updated_at: new Date().toISOString(),
        })
      }

      return { previousNote }
    },
    onError: (err, { noteId }, context) => {
      // Rollback en cas d'erreur
      if (context?.previousNote) {
        queryClient.setQueryData(["note", noteId], context.previousNote)
      }
    },
    onSettled: (data, error, { noteId }) => {
      // Rafraîchir les données après mutation
      queryClient.invalidateQueries({ queryKey: ["note", noteId] })
      queryClient.invalidateQueries({ queryKey: ["notes"] })
    },
  })
}

// Hook pour créer une note
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
        throw new Error(errorData.error || `HTTP ${res.status}`)
      }
      return res.json() as Promise<Note>
    },
    // ❌ Pas d'onSuccess ici - laisser le composant gérer la navigation
    // ✅ Utiliser onSettled pour invalider le cache après succès ou erreur
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] })
    },
  })
}

// Hook pour supprimer une note
export function useDeleteNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (noteId: string) => {
      const res = await fetch(`/api/notes/${noteId}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Erreur lors de la suppression")
      return noteId
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] })
    },
  })
}

