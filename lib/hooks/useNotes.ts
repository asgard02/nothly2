import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

export interface Note {
  id: string
  title: string
  content: string
  user_id: string
  created_at?: string
  updated_at?: string
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
export function useNote(noteId: string | null) {
  return useQuery({
    queryKey: ["notes", noteId],
    queryFn: async () => {
      if (!noteId) throw new Error("ID de note invalide")
      const res = await fetch(`/api/notes/${noteId}`)
      if (!res.ok) throw new Error("Erreur lors du chargement de la note")
      return res.json() as Promise<Note>
    },
    enabled: !!noteId, // Ne pas exécuter si noteId est null
    staleTime: 5 * 60 * 1000, // 5 minutes - les notes changent peu souvent
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
      // Annuler les requêtes en cours
      await queryClient.cancelQueries({ queryKey: ["notes", noteId] })

      // Sauvegarder les données précédentes
      const previousNote = queryClient.getQueryData<Note>(["notes", noteId])

      // Mise à jour optimiste
      if (previousNote) {
        queryClient.setQueryData<Note>(["notes", noteId], {
          ...previousNote,
          title: title ?? previousNote.title,
          content: content ?? previousNote.content,
        })
      }

      return { previousNote }
    },
    onError: (err, { noteId }, context) => {
      // Rollback en cas d'erreur
      if (context?.previousNote) {
        queryClient.setQueryData(["notes", noteId], context.previousNote)
      }
    },
    onSettled: (data, error, { noteId }) => {
      // Rafraîchir les données après mutation
      queryClient.invalidateQueries({ queryKey: ["notes", noteId] })
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
      if (!res.ok) throw new Error("Erreur lors de la création")
      return res.json() as Promise<Note>
    },
    onSuccess: () => {
      // Invalider le cache des notes pour recharger la liste
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

