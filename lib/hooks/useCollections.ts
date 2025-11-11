import { useQuery } from "@tanstack/react-query"

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
  return useQuery({
    queryKey: ["collections"],
    queryFn: async (): Promise<StudyCollection[]> => {
      const res = await fetch("/api/collections")
      if (!res.ok) {
        throw new Error("Erreur lors du chargement des collections")
      }
      return res.json()
    },
    staleTime: 1000 * 30,
  })
}

export function useCollectionDetail(collectionId: string | null | undefined) {
  return useQuery({
    queryKey: ["collection", collectionId],
    enabled: Boolean(collectionId),
    queryFn: async (): Promise<StudyCollectionDetail> => {
      if (!collectionId) {
        throw new Error("Identifiant de collection manquant")
      }
      const res = await fetch(`/api/collections/${collectionId}`)
      if (res.status === 404) {
        throw new Error("Collection introuvable")
      }
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        throw new Error(payload.error || "Erreur lors du chargement de la collection")
      }
      return res.json()
    },
  })
}

