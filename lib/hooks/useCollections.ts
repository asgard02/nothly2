import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

export interface Collection {
  id: string
  title: string
  color: string
  doc_count: number
  artifact_count: number
  last_active: string
}

// Hook pour récupérer toutes les collections
export function useCollections() {
  return useQuery<Collection[]>({
    queryKey: ["collections"],
    queryFn: async () => {
      const response = await fetch("/api/collections")
      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        if (error.error?.includes("collections") || error.error?.includes("does not exist")) {
          throw new Error("La table 'collections' n'existe pas. Veuillez exécuter la migration SQL dans Supabase.")
        }
        throw new Error(error.error || "Erreur lors du chargement des collections")
      }
      const data = await response.json()
      console.log("[useCollections] Collections chargées:", data.length)
      return data
    },
    staleTime: 30 * 1000, // 30 secondes - les données sont considérées fraîches pendant 30s
    gcTime: 10 * 60 * 1000, // 10 minutes - garder en cache pendant 10 minutes
    refetchOnMount: true, // Toujours refetch au montage pour avoir les dernières données
    refetchOnWindowFocus: false, // Ne pas refetch automatiquement au focus
    retry: 1, // Réessayer une fois en cas d'erreur
  })
}

// Hook pour créer une collection
export function useCreateCollection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { title: string; color: string }) => {
      const response = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        if (error.error?.includes("collections") || error.error?.includes("does not exist")) {
          throw new Error("La table 'collections' n'existe pas. Veuillez exécuter la migration SQL dans Supabase.")
        }
        throw new Error(error.error || "Erreur lors de la création")
      }

      const newCollection = await response.json()
      console.log("[useCreateCollection] Collection créée:", newCollection)
      return newCollection
    },
    onSuccess: (newCollection) => {
      // Mettre à jour optimistiquement le cache
      queryClient.setQueryData<Collection[]>(["collections"], (old = []) => {
        console.log("[useCreateCollection] Mise à jour du cache, anciennes collections:", old.length)
        const updated = [newCollection, ...old]
        console.log("[useCreateCollection] Nouvelles collections:", updated.length)
        return updated
      })
      // Invalider en arrière-plan de manière différée pour éviter le lag
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["collections"] })
      }, 100)
    },
    onError: (error) => {
      console.error("[useCreateCollection] Erreur:", error)
    },
  })
}

// Hook pour supprimer une collection
export function useDeleteCollection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (collectionId: string) => {
      console.log("[useDeleteCollection] Tentative de suppression de la collection:", collectionId)
      
      // Récupérer le cache actuel pour la mise à jour optimiste
      const currentCache = queryClient.getQueryData<Collection[]>(["collections"]) || []
      const collectionExists = currentCache.some(c => c.id === collectionId)
      
      // Mettre à jour le cache optimistiquement seulement si la collection existe dans le cache
      if (collectionExists) {
        queryClient.setQueryData<Collection[]>(["collections"], (old = []) => {
          const filtered = old.filter(c => c.id !== collectionId)
          console.log("[useDeleteCollection] Mise à jour optimiste du cache:", old.length, "->", filtered.length)
          return filtered
        })
      } else {
        console.log("[useDeleteCollection] Collection non trouvée dans le cache, pas de mise à jour optimiste")
      }
      
      const response = await fetch(`/api/collections/${collectionId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Erreur inconnue" }))
        
        // Si la collection n'existe pas (404), c'est OK - elle est déjà supprimée
        if (response.status === 404) {
          console.log("[useDeleteCollection] Collection non trouvée (404) - probablement déjà supprimée")
          // Si on avait fait une mise à jour optimiste, on la garde, sinon on invalide pour rafraîchir
          if (!collectionExists) {
            queryClient.invalidateQueries({ queryKey: ["collections"] })
          }
          return { success: true, alreadyDeleted: true }
        }
        
        // Pour les autres erreurs, restaurer le cache et lancer l'erreur
        console.error("[useDeleteCollection] Erreur lors de la suppression:", errorData)
        queryClient.invalidateQueries({ queryKey: ["collections"] }) // Restaurer depuis le serveur
        throw new Error(errorData.error || "Erreur lors de la suppression")
      }

      const result = await response.json()
      console.log("[useDeleteCollection] Collection supprimée avec succès")
      return result
    },
    onSuccess: () => {
      // Invalider pour s'assurer que tout est synchronisé
      queryClient.invalidateQueries({ queryKey: ["collections"] })
    },
    onError: (error) => {
      console.error("[useDeleteCollection] Erreur dans la mutation:", error)
      // Restaurer le cache en cas d'erreur
      queryClient.invalidateQueries({ queryKey: ["collections"] })
    },
  })
}

// Interfaces pour les study_collections (flashcards et quiz)
export interface StudyCollectionFlashcard {
  id: string
  collection_id: string
  question: string
  answer: string
  tags: string[]
  metadata: Record<string, any>
  order_index: number
  created_at: string
}

export interface StudyCollectionQuizQuestion {
  id: string
  collection_id: string
  question_type: "multiple_choice" | "true_false" | "completion"
  prompt: string
  options: string[] | null
  answer: string
  explanation: string | null
  tags: string[]
  order_index: number
  metadata: Record<string, any>
  created_at: string
}

export interface StudyCollectionDetail {
  id: string
  user_id: string
  title: string
  tags: string[]
  status: "processing" | "ready" | "failed"
  total_sources: number
  total_flashcards: number
  total_quiz: number
  prompt_tokens: number | null
  completion_tokens: number | null
  metadata: Record<string, any>
  created_at: string
  updated_at: string
  flashcards: StudyCollectionFlashcard[]
  quiz: StudyCollectionQuizQuestion[]
}

// Hook pour supprimer une study_collection
export function useDeleteStudyCollection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (collectionId: string) => {
      console.log("[useDeleteStudyCollection] Tentative de suppression de la study_collection:", collectionId)
      
      // Récupérer le cache actuel pour la mise à jour optimiste
      const currentCache = queryClient.getQueryData<any[]>(["study-collections"]) || []
      const collectionExists = currentCache.some(c => c.id === collectionId)
      
      // Mettre à jour le cache optimistiquement seulement si la collection existe dans le cache
      if (collectionExists) {
        queryClient.setQueryData<any[]>(["study-collections"], (old = []) => {
          const filtered = old.filter(c => c.id !== collectionId)
          console.log("[useDeleteStudyCollection] Mise à jour optimiste du cache:", old.length, "->", filtered.length)
          return filtered
        })
      } else {
        console.log("[useDeleteStudyCollection] Study collection non trouvée dans le cache, pas de mise à jour optimiste")
      }
      
      const response = await fetch(`/api/study-collections/${collectionId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Erreur inconnue" }))
        
        // Si la collection n'existe pas (404), c'est OK - elle est déjà supprimée
        if (response.status === 404) {
          console.log("[useDeleteStudyCollection] Study collection non trouvée (404) - probablement déjà supprimée")
          // Si on avait fait une mise à jour optimiste, on la garde, sinon on invalide pour rafraîchir
          if (!collectionExists) {
            queryClient.invalidateQueries({ queryKey: ["study-collections"] })
          }
          return { success: true, alreadyDeleted: true }
        }
        
        // Pour les autres erreurs, restaurer le cache et lancer l'erreur
        console.error("[useDeleteStudyCollection] Erreur lors de la suppression:", errorData)
        queryClient.invalidateQueries({ queryKey: ["study-collections"] }) // Restaurer depuis le serveur
        throw new Error(errorData.error || "Erreur lors de la suppression")
      }

      const result = await response.json()
      console.log("[useDeleteStudyCollection] Study collection supprimée avec succès")
      return result
    },
    onSuccess: () => {
      // Invalider pour s'assurer que tout est synchronisé
      queryClient.invalidateQueries({ queryKey: ["study-collections"] })
    },
    onError: (error) => {
      console.error("[useDeleteStudyCollection] Erreur dans la mutation:", error)
      // Restaurer le cache en cas d'erreur
      queryClient.invalidateQueries({ queryKey: ["study-collections"] })
    },
  })
}

// Hook pour récupérer les détails d'une study_collection (avec flashcards et quiz)
export function useCollectionDetail(collectionId: string) {
  return useQuery<StudyCollectionDetail>({
    queryKey: ["study-collection", collectionId],
    queryFn: async () => {
      console.log("[useCollectionDetail] Chargement de la study_collection:", collectionId)
      
      const response = await fetch(`/api/study-collections/${collectionId}`)
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        console.error("[useCollectionDetail] Erreur lors du chargement:", error)
        
        // Si 404, la collection n'existe pas
        if (response.status === 404) {
          throw new Error(error.error || "Cette collection d'étude n'existe pas ou a été supprimée.")
        }
        
        throw new Error(error.error || "Erreur lors du chargement de la collection")
      }
      
      const data = await response.json()
      console.log("[useCollectionDetail] Study collection chargée:", data.title)
      return data
    },
    enabled: !!collectionId,
    retry: false, // Ne pas réessayer si la collection n'existe pas
  })
}
