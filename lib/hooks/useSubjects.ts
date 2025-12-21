import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

export interface Subject {
  id: string
  user_id: string
  title: string
  color: string
  created_at: string
  updated_at: string
  doc_count: number
  artifact_count: number
  last_active: string
  is_favorite: boolean
}

// Hook pour récupérer toutes les collections (sujets)
export function useSubjects() {
  return useQuery<Subject[]>({
    queryKey: ["subjects"],
    queryFn: async () => {
      const response = await fetch("/api/subjects")
      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        if (error.error?.includes("subjects") || error.error?.includes("does not exist")) {
          throw new Error("La table 'subjects' n'existe pas. Veuillez exécuter la migration SQL dans Supabase.")
        }
        throw new Error(error.error || "Erreur lors du chargement des sujets")
      }
      const data = await response.json()
      console.log("[useSubjects] Sujets chargés:", data.length)
      return data
    },
    staleTime: 30 * 1000, // 30 secondes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    retry: 1,
  })
}

// Hook pour créer un sujet
export function useCreateSubject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (newSubject: { title: string; color: string }) => {
      const response = await fetch("/api/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSubject),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        if (error.error?.includes("subjects") || error.error?.includes("does not exist")) {
          throw new Error("La table 'subjects' n'existe pas. Veuillez exécuter la migration SQL dans Supabase.")
        }
        throw new Error(error.error || "Erreur lors de la création")
      }

      const newSubjectData = await response.json()
      console.log("[useCreateSubject] Sujet créé:", newSubjectData)
      return newSubjectData
    },
    onSuccess: (newSubjectData) => {
      // Mettre à jour optimistiquement le cache
      queryClient.setQueryData<Subject[]>(["subjects"], (old = []) => {
        console.log("[useCreateSubject] Mise à jour du cache, anciens sujets:", old.length)
        const updated = [newSubjectData, ...old]
        console.log("[useCreateSubject] Nouveaux sujets:", updated.length)
        return updated
      })
      // Invalider en arrière-plan de manière différée
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["subjects"] })
      }, 100)
    },
    onError: (error) => {
      console.error("[useCreateSubject] Erreur:", error)
    },
  })
}

// Hook pour supprimer un sujet
export function useDeleteSubject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (subjectId: string) => {
      console.log("[useDeleteSubject] Tentative de suppression du sujet:", subjectId)
      
      // Récupérer le cache actuel pour la mise à jour optimiste
      const currentCache = queryClient.getQueryData<Subject[]>(["subjects"]) || []
      const subjectExists = currentCache.some(c => c.id === subjectId)
      
      // Mettre à jour le cache optimistiquement
      if (subjectExists) {
        queryClient.setQueryData<Subject[]>(["subjects"], (old = []) => {
          const filtered = old.filter(c => c.id !== subjectId)
          console.log("[useDeleteSubject] Mise à jour optimiste du cache:", old.length, "->", filtered.length)
          return filtered
        })
      } else {
        console.log("[useDeleteSubject] Sujet non trouvé dans le cache, pas de mise à jour optimiste")
      }
      
      const response = await fetch(`/api/subjects/${subjectId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Erreur inconnue" }))
        
        // Si le sujet n'existe pas (404), c'est OK
        if (response.status === 404) {
          console.log("[useDeleteSubject] Sujet non trouvé (404) - probablement déjà supprimé")
          if (!subjectExists) {
            queryClient.invalidateQueries({ queryKey: ["subjects"] })
          }
          return { success: true, alreadyDeleted: true }
        }
        
        // Pour les autres erreurs, restaurer le cache et lancer l'erreur
        console.error("[useDeleteSubject] Erreur lors de la suppression:", errorData)
        queryClient.invalidateQueries({ queryKey: ["subjects"] }) // Restaurer depuis le serveur
        throw new Error(errorData.error || "Erreur lors de la suppression")
      }

      const result = await response.json()
      console.log("[useDeleteSubject] Sujet supprimé avec succès")
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] })
    },
    onError: (error) => {
      console.error("[useDeleteSubject] Erreur dans la mutation:", error)
      queryClient.invalidateQueries({ queryKey: ["subjects"] })
    },
  })
}

// Hook pour mettre à jour un sujet
export function useUpdateSubject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Subject> & { id: string }) => {
      console.log("[useUpdateSubject] Mise à jour du sujet:", id, updates)
      
      const response = await fetch(`/api/subjects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error || "Erreur lors de la mise à jour")
      }

      const updatedSubject = await response.json()
      return updatedSubject
    },
    onMutate: async ({ id, ...updates }) => {
      // Annuler les requêtes en cours
      await queryClient.cancelQueries({ queryKey: ["subjects"] })

      // Snapshot du cache précédent
      const previousSubjects = queryClient.getQueryData<Subject[]>(["subjects"])

      // Mise à jour optimiste
      queryClient.setQueryData<Subject[]>(["subjects"], (old = []) => {
        return old.map((subject) =>
          subject.id === id ? { ...subject, ...updates } : subject
        )
      })

      return { previousSubjects }
    },
    onError: (err, newTodo, context) => {
      // En cas d'erreur, on remet le cache précédent
      if (context?.previousSubjects) {
        queryClient.setQueryData(["subjects"], context.previousSubjects)
      }
      console.error("[useUpdateSubject] Erreur:", err)
    },
    onSuccess: () => {
      // Invalider pour être sûr d'avoir les données fraîches
      queryClient.invalidateQueries({ queryKey: ["subjects"] })
    },
  })
}

// Interfaces pour les study_collections (flashcards et quiz)
// Note: On garde "StudyCollection" pour l'instant car cela correspond aux tables de DB pour les flashcards/quiz
// Mais on pourrait renommer en "StudySession" ou "StudyMaterial" à terme
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
      
      // Mettre à jour le cache optimistiquement
      if (collectionExists) {
        queryClient.setQueryData<any[]>(["study-collections"], (old = []) => {
          const filtered = old.filter(c => c.id !== collectionId)
          console.log("[useDeleteStudyCollection] Mise à jour optimiste du cache:", old.length, "->", filtered.length)
          return filtered
        })
      } else {
        console.log("[useDeleteStudyCollection] Study collection non trouvée dans le cache, pas de mise à jour optimiste")
      }
      
      const response = await fetch(`/api/study-subjects/${collectionId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Erreur inconnue" }))
        
        if (response.status === 404) {
          console.log("[useDeleteStudyCollection] Study collection non trouvée (404) - probablement déjà supprimée")
          if (!collectionExists) {
            queryClient.invalidateQueries({ queryKey: ["study-collections"] })
          }
          return { success: true, alreadyDeleted: true }
        }
        
        console.error("[useDeleteStudyCollection] Erreur lors de la suppression:", errorData)
        queryClient.invalidateQueries({ queryKey: ["study-collections"] })
        throw new Error(errorData.error || "Erreur lors de la suppression")
      }

      const result = await response.json()
      console.log("[useDeleteStudyCollection] Study collection supprimée avec succès")
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["study-collections"] })
    },
    onError: (error) => {
      console.error("[useDeleteStudyCollection] Erreur dans la mutation:", error)
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
      
      const response = await fetch(`/api/study-subjects/${collectionId}`)
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        console.error("[useCollectionDetail] Erreur lors du chargement:", error)
        
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
    retry: false,
  })
}
