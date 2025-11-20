"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

export type StudyCollectionStatus = "processing" | "ready" | "failed"

export interface StudyCollection {
  id: string
  title: string
  tags: string[]
  status: StudyCollectionStatus
  total_sources: number
  total_flashcards: number
  total_quiz: number
  prompt_tokens: number | null
  completion_tokens: number | null
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface StudyCollectionSource {
  id: string
  document_id: string
  document_version_id: string
  title: string
  tags: string[]
  text_length: number
  created_at: string
}

export interface StudyCollectionFlashcard {
  id: string
  question: string
  answer: string
  tags: string[]
  order_index: number
}

export interface StudyCollectionQuizQuestion {
  id: string
  question_type: "multiple_choice" | "true_false" | "completion"
  prompt: string
  options: string[] | null
  answer: string
  explanation: string | null
  tags: string[]
  order_index: number
}

export interface StudyCollectionDetail extends StudyCollection {
  sources: StudyCollectionSource[]
  flashcards: StudyCollectionFlashcard[]
  quiz: StudyCollectionQuizQuestion[]
}

export function useCollections() {
  const query = useQuery({
    queryKey: ["collections"],
    queryFn: async (): Promise<StudyCollection[]> => {
      if (process.env.NODE_ENV !== "production") {
        console.log("🔁 fetch /api/collections")
      }
      const res = await fetch("/api/collections", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        throw new Error(payload.error || "Erreur lors du chargement des collections")
      }

      return res.json()
    },
    staleTime: 1000 * 60, // 60 secondes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: true,
    retry: 1,
    // Polling conditionnel : seulement si des collections sont en traitement
    refetchInterval: (query) => {
      // Ne pas poller si la query est en erreur ou en chargement
      if (query.state.status !== "success") return false
      
      const data = query.state.data
      if (!data || !Array.isArray(data)) return false
      
      // Vérifier s'il y a des collections en traitement
      const hasProcessing = data.some((c: StudyCollection) => c.status === "processing")
      
      // Polling toutes les 5 secondes seulement si des collections sont en traitement
      return hasProcessing ? 5000 : false
    },
  })

  return query
}

export function useCollectionDetail(collectionId: string | null | undefined) {
  const query = useQuery({
    queryKey: ["collection", collectionId],
    enabled: Boolean(collectionId),
    queryFn: async (): Promise<StudyCollectionDetail> => {
      if (!collectionId) {
        throw new Error("Identifiant de collection manquant")
      }
      const res = await fetch(`/api/collections/${collectionId}`, {
        cache: "no-store",
      })
      if (res.status === 404) {
        throw new Error("Collection introuvable")
      }
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        throw new Error(payload.error || "Erreur lors du chargement de la collection")
      }
      return res.json()
    },
    staleTime: 1000 * 30, // 30 secondes - réduit pour éviter trop de requêtes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false, // Ne pas refetch à chaque mount si les données sont fraîches
    retry: 1,
    // Polling conditionnel : seulement si la collection est en traitement
    refetchInterval: (query) => {
      // Ne pas poller si la query est en erreur ou en chargement
      if (query.state.status !== "success") return false
      
      const data = query.state.data as StudyCollectionDetail | undefined
      // Polling toutes les 5 secondes seulement si la collection est en traitement
      // Arrêter immédiatement si la collection est prête
      return data?.status === "processing" ? 5000 : false
    },
  })

  return query
}

export function useDeleteCollection() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (collectionId: string) => {
      const res = await fetch(`/api/collections/${collectionId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        throw new Error(payload.error || "Erreur lors de la suppression de la collection")
      }

      return res.json()
    },
    onSuccess: () => {
      // Invalider les queries pour rafraîchir la liste
      queryClient.invalidateQueries({ queryKey: ["collections"] })
    },
  })
}
