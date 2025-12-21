import { useQuery } from "@tanstack/react-query"

export type DocumentStatus = "processing" | "ready" | "failed"

export interface DocumentVersionSummary {
  id: string
  created_at: string
  processed_at: string | null
  page_count: number
  storage_path: string
  document_sections?: Array<{
    id: string
    heading: string
    order_index: number
  }>
}

export interface DocumentSummary {
  id: string
  subject_id?: string
  title: string
  original_filename: string
  status: DocumentStatus
  tags: string[]
  created_at: string
  updated_at: string
  current_version_id: string | null
  document_versions: DocumentVersionSummary[]
  current_version?: DocumentVersionSummary | null
}

export function useDocuments() {
  return useQuery({
    queryKey: ["documents"],
    queryFn: async (): Promise<DocumentSummary[]> => {
      const res = await fetch("/api/documents")
      if (!res.ok) {
        throw new Error("Erreur lors du chargement des documents")
      }
      return res.json()
    },
    staleTime: 1000 * 30,
  })
}

export interface DocumentSectionDetail {
  id: string
  order_index: number
  heading: string
  content: string
  revision_notes?: Array<{
    payload: any
    tokens_used: number
    generated_at: string
  }>
  quiz_sets?: Array<{
    id: string
    recommended_duration_minutes: number
    tokens_used: number
    quiz_questions: Array<{
      id: string
      question_type: string
      prompt: string
      options: string[] | null
      answer: string
      explanation: string
      tags: string[]
      order_index: number
    }>
  }>
}

export interface DocumentVersionDetail {
  id: string
  created_at: string
  processed_at: string | null
  page_count: number
  storage_path: string
  document_sections: DocumentSectionDetail[]
  revision_notes?: Array<{
    document_section_id: string
    payload: any
    tokens_used: number
    generated_at: string
  }>
  quiz_sets?: Array<{
    document_section_id: string
    recommended_duration_minutes: number
    tokens_used: number
  }>
}

export interface DocumentDetail extends DocumentSummary {
  document_versions: DocumentVersionDetail[]
  current_version?: DocumentVersionDetail | null
}

export function useDocumentDetail(documentId: string | undefined) {
  return useQuery({
    queryKey: ["document", documentId],
    queryFn: async (): Promise<DocumentDetail> => {
      if (!documentId) throw new Error("Identifiant document manquant")
      const res = await fetch(`/api/documents/${documentId}`)
      if (res.status === 404) {
        throw new Error("Document introuvable")
      }
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        throw new Error(payload.error || "Erreur lors du chargement du document")
      }
      return res.json()
    },
    enabled: Boolean(documentId),
    staleTime: 1000 * 30,
  })
}
