"use client"

import { useState, useTransition, useMemo } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, ArrowRight, FileText, Plus, Search, Sparkles, BookOpen, MessageSquare, Send, Loader2, X, Brain, ListChecks, ChevronDown, ChevronUp, Calendar, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Collection } from "@/lib/hooks/useCollections"
import { UploadDialog } from "./UploadDialog"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { MentionInput, extractMentionedDocumentIds } from "./MentionInput"
import QuizViewer, { type QuizQuestionItem } from "@/components/collections/QuizViewer"
import FlashcardViewer from "@/components/collections/FlashcardViewer"
import type { FlashcardItem } from "@/components/collections/FlashcardViewer"
import ReactMarkdown from "react-markdown"
import { GenerationOverlay, type GenerationStep } from "@/components/GenerationOverlay"
import { GenerationDialog, type GenerationIntent } from "./GenerationDialog"

import remarkGfm from "remark-gfm"
import { useTranslations } from "next-intl"

interface CollectionViewProps {
  collection: Collection
  onBack: () => void
  onSelectDocument?: (doc: any) => void
}

export function CollectionView({ collection, onBack, onSelectDocument }: CollectionViewProps) {
  const t = useTranslations("CollectionView")
  const tCommon = useTranslations("Common")
  const tStatus = useTranslations("Status")
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isPending, startTransition] = useTransition()
  const [searchQuery, setSearchQuery] = useState("")
  const [isUploadOpen, setIsUploadOpen] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [isLoadingPdf, setIsLoadingPdf] = useState<string | null>(null)
  const [showPdfViewer, setShowPdfViewer] = useState(false)
  const [currentPdfDocId, setCurrentPdfDocId] = useState<string | null>(null)
  const [selectedQuizCollection, setSelectedQuizCollection] = useState<any | null>(null)
  const [selectedFlashcardCollectionId, setSelectedFlashcardCollectionId] = useState<string | null>(null)
  const [selectedSummary, setSelectedSummary] = useState<any | null>(null)
  const [expandedSections, setExpandedSections] = useState({
    pdf: true,
    flashcards: true,
    quiz: true,
    resume: true,
  })
  const [activeTab, setActiveTab] = useState<"pdf" | "flashcards" | "quiz" | "resume">("pdf")
  const [showNoDocsWarning, setShowNoDocsWarning] = useState(true)

  // États pour l'overlay de génération
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationStep, setGenerationStep] = useState<GenerationStep>("intent")
  const [pendingGenerationResult, setPendingGenerationResult] = useState<{
    type: 'flashcards' | 'quiz' | 'summary',
    data: any
  } | null>(null)

  // États pour le dialogue de génération
  const [isGenerationDialogOpen, setIsGenerationDialogOpen] = useState(false)
  const [generationIntent, setGenerationIntent] = useState<GenerationIntent | null>(null)

  // Charger les détails complets de la study_collection sélectionnée
  const { data: selectedFlashcardCollection, isLoading: isLoadingFlashcards } = useQuery({
    queryKey: ["study-collection", selectedFlashcardCollectionId],
    queryFn: async () => {
      if (!selectedFlashcardCollectionId) return null
      const response = await fetch(`/api/study-collections/${selectedFlashcardCollectionId}`)
      if (!response.ok) {
        throw new Error(t("errorLoadingFlashcards"))
      }
      return response.json()
    },
    enabled: !!selectedFlashcardCollectionId,
    staleTime: 30_000,
  })

  // Récupérer les documents de la collection
  const { data: documents = [], isLoading, refetch } = useQuery({
    queryKey: ["collection-documents", collection.id],
    queryFn: async () => {
      const response = await fetch(`/api/collections/${collection.id}/documents`)
      if (!response.ok) {
        throw new Error(t("errorLoadingDocuments"))
      }
      const data = await response.json()
      // Log pour debug
      if (process.env.NODE_ENV === "development") {
        console.log("[CollectionView] Documents chargés:", data)
        data.forEach((doc: any) => {
          if (doc.summaries && doc.summaries.length > 0) {
            console.log(`[CollectionView] Document ${doc.title} a ${doc.summaries.length} résumé(s)`)
          }
        })
      }
      return data
    },
    staleTime: 30_000, // 30 secondes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: (query) => {
      const data = query.state.data as any[]
      const hasProcessingDocs = data?.some((doc: any) => doc.status === "processing")
      return hasProcessingDocs ? 1000 : false
    },
  })

  // Précharger les flashcards/quiz en arrière-plan pour éviter les lags au switch
  const { data: studyData, isLoading: isLoadingStudy, error: studyError } = useQuery({
    queryKey: ["collection-study", collection.id],
    queryFn: async () => {
      const response = await fetch(`/api/collections/${collection.id}/study`)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        // Si c'est une erreur de colonne manquante, on retourne un tableau vide
        if (errorData.hint?.includes("collection_id")) {
          return { studyCollections: [] }
        }
        throw new Error(errorData.error || t("errorLoadingFlashcards"))
      }
      return response.json()
    },
    // Toujours charger en arrière-plan pour précharger les données
    staleTime: 60_000, // 60 secondes
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: false, // Ne pas réessayer automatiquement en cas d'erreur
    // Charger en arrière-plan avec une priorité plus basse
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  })

  const [chatInput, setChatInput] = useState("")
  const [isSending, setIsSending] = useState(false)

  const filteredDocs = documents.filter((doc: any) =>
    doc.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.filename?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Extraire les résumés de collection
  const collectionSummaries = useMemo(() => {
    if (!studyData?.studyCollections) return []
    return studyData.studyCollections
      .filter((sc: any) => sc.metadata?.summary)
      .map((sc: any) => ({
        id: sc.id,
        title: sc.title,
        summary: sc.metadata.summary,
        createdAt: sc.created_at
      }))
  }, [studyData])

  const totalSummaries = documents.reduce((acc: number, doc: any) => acc + (doc.summaries?.length || 0), 0) + collectionSummaries.length

  const handleViewPdf = async (docId: string, e?: React.MouseEvent) => {
    e?.stopPropagation() // Empêcher l'ouverture du document si l'événement existe

    // Si le PDF est déjà chargé et affiché pour ce document, ne rien faire
    if (pdfUrl && showPdfViewer && currentPdfDocId === docId) {
      return
    }

    setIsLoadingPdf(docId)
    setCurrentPdfDocId(docId)
    try {
      const response = await fetch(`/api/documents/${docId}/pdf`)
      if (!response.ok) {
        throw new Error(t("errorLoadingPdf"))
      }
      const data = await response.json()
      setPdfUrl(data.url)
      setShowPdfViewer(true)
    } catch (error) {
      console.error("Erreur lors du chargement du PDF:", error)
      alert(t("errorLoadingPdf"))
      setCurrentPdfDocId(null)
    } finally {
      setIsLoadingPdf(null)
    }
  }

  const handleDeleteDocument = async (docId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm(t("confirmDeleteDocument"))) return

    try {
      const response = await fetch(`/api/documents/${docId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error(t("errorDeletingDocument"))
      }

      // Rafraîchir la liste des documents
      queryClient.invalidateQueries({ queryKey: ["collection-documents", collection.id] })
    } catch (error) {
      console.error("Erreur suppression document:", error)
      alert(t("unableToDeleteDocument"))
    }
  }

  const handleSendMessage = async (messageOverride?: string, explicitDocIds?: string[]) => {
    const messageToSend = typeof messageOverride === 'string' ? messageOverride : chatInput
    if (!messageToSend.trim() || isSending) return

    setIsSending(true)
    setIsGenerating(true)
    setGenerationStep("intent")

    // Simulation des étapes pendant que l'IA travaille
    const stepTimers: NodeJS.Timeout[] = []

    stepTimers.push(setTimeout(() => setGenerationStep("documents"), 1500))
    stepTimers.push(setTimeout(() => setGenerationStep("context"), 3000))
    stepTimers.push(setTimeout(() => setGenerationStep("generation"), 4500))

    try {
      // Extraire les IDs des documents mentionnés
      let mentionedDocumentIds = extractMentionedDocumentIds(
        messageToSend,
        documents.map((doc: any) => ({
          id: doc.id,
          title: doc.title,
          filename: doc.filename,
        }))
      )

      // Si des IDs explicites sont fournis (via le dialogue), on les utilise
      if (explicitDocIds && explicitDocIds.length > 0) {
        mentionedDocumentIds = explicitDocIds
      }

      // Appel API pour envoyer le message avec contexte de la collection et documents mentionnés
      const response = await fetch("/api/chat/collection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collectionId: collection.id,
          message: messageToSend.trim(),
          mentionedDocumentIds: mentionedDocumentIds.length > 0 ? mentionedDocumentIds : undefined
        })
      })

      // Nettoyer les timers si la réponse arrive avant la fin de la simulation
      stepTimers.forEach(clearTimeout)

      // Passer à l'étape de sauvegarde/finalisation
      setGenerationStep("saving")

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.error || errorData.response || t("errorSendingMessage")
        throw new Error(errorMessage)
      }

      const data = await response.json()
      console.log("Réponse IA:", data)

      // Invalider les queries pour rafraîchir les données
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["collection-study", collection.id] }),
        queryClient.invalidateQueries({ queryKey: ["collection-documents", collection.id] })
      ])

      // Marquer comme terminé
      setGenerationStep("complete")

      // Attendre un peu pour que l'utilisateur voie le succès
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Si des flashcards ou quiz ont été créés, on prépare la sélection mais on ne change pas d'onglet
      if (data.studyCollectionId && (data.flashcards || data.quizQuestions)) {
        const flashcardCount = data.flashcards?.length || 0
        const quizCount = data.quizQuestions?.length || 0

        if (flashcardCount > 0) {
          setPendingGenerationResult({ type: 'flashcards', data: data.studyCollectionId })
        } else if (quizCount > 0) {
          setPendingGenerationResult({
            type: 'quiz',
            data: {
              id: data.studyCollectionId,
              title: data.searchTopic || "Quiz",
              quizQuestions: data.quizQuestions
            }
          })
        }
      } else if (data.summary) {
        setPendingGenerationResult({
          type: 'summary',
          data: {
            title: t("summaryPrefix"),
            summary: data.summary,
            createdAt: new Date().toISOString()
          }
        })
      }

      setChatInput("")

      // L'overlay reste ouvert jusqu'à ce que l'utilisateur clique sur "Ouvrir l'onglet"
      // setIsGenerating(false) est géré par le bouton de l'overlay

    } catch (error) {
      console.error("Erreur lors de l'envoi:", error)
      const errorMessage = error instanceof Error ? error.message : t("errorSendingMessage")
      toast.error(errorMessage)
      setIsGenerating(false)
    } finally {
      setIsSending(false)
    }
  }

  const handleDeleteStudyCollection = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm(t("confirmDeleteDocument"))) return // Reusing confirm message or add generic confirm

    try {
      const response = await fetch(`/api/study-collections/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error(t("errorDeleting"))
      }

      // Rafraîchir les données
      queryClient.invalidateQueries({ queryKey: ["collection-study", collection.id] })
    } catch (error) {
      console.error("Erreur suppression:", error)
      alert(t("unableToDeleteItem"))
    }
  }

  const handleOpenGenerationDialog = (intent: GenerationIntent) => {
    setGenerationIntent(intent)
    setIsGenerationDialogOpen(true)
  }

  const handleConfirmGeneration = (selectedDocIds: string[], topic: string) => {
    // Construire le message pour l'IA
    let prompt = ""
    switch (generationIntent) {
      case "flashcards":
        prompt = t("promptFlashcardsAction")
        break
      case "quiz":
        prompt = t("promptQuizAction")
        break
      case "summary":
        prompt = t("promptSummaryAction")
        break
      default:
        prompt = "Génère du contenu"
    }

    if (topic.trim()) {
      prompt += ` sur le sujet : "${topic}"`
    }

    // Ajouter les mentions des documents sélectionnés
    // On utilise le format @[Titre](id) que MentionInput utilise ou juste les IDs
    // Mais handleSendMessage utilise extractMentionedDocumentIds qui parse le texte
    // OU on peut passer directement les IDs à l'API si on modifie handleSendMessage
    // Pour l'instant, on va modifier handleSendMessage pour accepter une liste d'IDs explicite

    handleSendMessage(prompt, selectedDocIds)
  }

  // Séparer les flashcards et quiz des study collections
  const { flashcardsCollections, quizCollections } = useMemo(() => {
    if (!studyData?.studyCollections) {
      return { flashcardsCollections: [], quizCollections: [] }
    }

    const flashcards: any[] = []
    const quiz: any[] = []

    studyData.studyCollections.forEach((sc: any) => {
      if (sc.flashcards && sc.flashcards.length > 0) {
        flashcards.push(sc)
      }
      if (sc.quizQuestions && sc.quizQuestions.length > 0) {
        quiz.push(sc)
      }
    })

    return { flashcardsCollections: flashcards, quizCollections: quiz }
  }, [studyData])

  const isViewingStudy = selectedFlashcardCollectionId || selectedQuizCollection || selectedSummary

  const toggleSection = (section: "pdf" | "flashcards" | "quiz" | "resume") => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-background via-background to-muted/10 overflow-hidden relative">
      <GenerationOverlay
        isVisible={isGenerating}
        currentStep={generationStep}
        onClose={() => {
          setIsGenerating(false)
          // Changer d'onglet seulement quand l'utilisateur clique sur le bouton "Ouvrir l'onglet"
          if (pendingGenerationResult) {
            if (pendingGenerationResult.type === 'flashcards') {
              setSelectedFlashcardCollectionId(pendingGenerationResult.data)
              setActiveTab("flashcards")
            } else if (pendingGenerationResult.type === 'quiz') {
              setSelectedQuizCollection(pendingGenerationResult.data)
              setActiveTab("quiz")
            } else if (pendingGenerationResult.type === 'summary') {
              setSelectedSummary(pendingGenerationResult.data)
              setActiveTab("resume")
            }
            setPendingGenerationResult(null)
          }
        }}
      />
      {/* Header avec gradient de la collection amélioré - Caché quand on affiche flashcards/quiz */}
      {!isViewingStudy && (
        <div className={cn(
          "relative flex-shrink-0 px-6 pt-4 pb-4 border-b border-border/40",
          "bg-gradient-to-br",
          collection.color,
          "bg-background/95"
        )}>
          {/* Overlay pour améliorer le contraste */}
          <div className="absolute inset-0 bg-background/60 dark:bg-background/80" />
          {/* Overlays décoratifs */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.2)_0%,transparent_60%)]" />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  onClick={onBack}
                  size="sm"
                  className="hover:bg-background/80 rounded-lg px-3 py-1.5 backdrop-blur-sm border border-border/60 bg-background/70 shadow-sm text-foreground"
                >
                  <ArrowLeft className="h-4 w-4 mr-1.5" />
                  {tCommon("back")}
                </Button>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">{collection.title}</h1>
              </div>

              <Button
                onClick={() => setIsUploadOpen(true)}
                size="sm"
                className="rounded-lg bg-background/95 backdrop-blur-md hover:bg-background shadow-md hover:shadow-lg transition-all px-4 py-2 border border-border/60 text-foreground"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t("addDocument")}
              </Button>
            </div>

            <div className="flex items-center gap-4 mb-3">
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-background/95 backdrop-blur-md border border-border/60 shadow-sm">
                <FileText className="h-3.5 w-3.5 text-foreground" />
                <span className="text-xs font-medium text-foreground">{collection.doc_count} document{collection.doc_count > 1 ? "s" : ""}</span>
              </div>
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-background/95 backdrop-blur-md border border-border/60 shadow-sm">
                <Sparkles className="h-3.5 w-3.5 text-foreground" />
                <span className="text-xs font-medium text-foreground">{collection.artifact_count} {collection.artifact_count > 1 ? t("artifacts") : t("artifact")}</span>
              </div>
            </div>

            {/* Onglets PDF | FC | Quiz */}
            <div className="flex items-center gap-2 mb-3 p-1 rounded-xl bg-background/60 backdrop-blur-md border border-border/40">
              <button
                onClick={() => setActiveTab("pdf")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  activeTab === "pdf"
                    ? "bg-background shadow-md text-foreground border border-border/60"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                )}
              >
                <FileText className="h-4 w-4" />
                <span>{t("tabPdf")}</span>
                {filteredDocs.length > 0 && (
                  <span className={cn(
                    "px-1.5 py-0.5 rounded-full text-xs font-semibold",
                    activeTab === "pdf"
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  )}>
                    {filteredDocs.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab("flashcards")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  activeTab === "flashcards"
                    ? "bg-background shadow-md text-foreground border border-border/60"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                )}
              >
                <Brain className="h-4 w-4" />
                <span>{t("tabFlashcards")}</span>
                {flashcardsCollections.length > 0 && (
                  <span className={cn(
                    "px-1.5 py-0.5 rounded-full text-xs font-semibold",
                    activeTab === "flashcards"
                      ? "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                      : "bg-muted text-muted-foreground"
                  )}>
                    {flashcardsCollections.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab("quiz")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  activeTab === "quiz"
                    ? "bg-background shadow-md text-foreground border border-border/60"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                )}
              >
                <ListChecks className="h-4 w-4" />
                <span>{t("tabQuiz")}</span>
                {quizCollections.length > 0 && (
                  <span className={cn(
                    "px-1.5 py-0.5 rounded-full text-xs font-semibold",
                    activeTab === "quiz"
                      ? "bg-green-500/10 text-green-600 dark:text-green-400"
                      : "bg-muted text-muted-foreground"
                  )}>
                    {quizCollections.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab("resume")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  activeTab === "resume"
                    ? "bg-background shadow-md text-foreground border border-border/60"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                )}
              >
                <BookOpen className="h-4 w-4" />
                <span>{t("tabSummaries")}</span>
                {totalSummaries > 0 && (
                  <span className={cn(
                    "px-1.5 py-0.5 rounded-full text-xs font-semibold",
                    activeTab === "resume"
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      : "bg-muted text-muted-foreground"
                  )}>
                    {totalSummaries}
                  </span>
                )}
              </button>
            </div>

            {/* Barre de recherche améliorée */}
            <div className="relative max-w-lg">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder={t("searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-border/60 bg-background/95 backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/60 transition-all placeholder:text-muted-foreground/60 shadow-sm text-foreground"
              />
            </div>
          </div>
        </div>
      )}

      {/* Contenu - Sections PDF | FC | Quiz */}
      <div className={cn(
        "flex-1 overflow-y-auto min-h-0 relative",
        isViewingStudy ? "p-0" : "p-6"
      )}>
        {/* Indicateur de transition subtil */}
        {isPending && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-primary/20 animate-pulse z-10" />
        )}

        {!isViewingStudy ? (
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Section PDF */}
            {activeTab === "pdf" && (
              <div className="bg-card/80 backdrop-blur-xl shadow-sm rounded-2xl overflow-hidden border border-border/50">


                <div className="px-5 pb-5 space-y-3">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="flex flex-col items-center gap-4">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground font-medium">{t("loadingDocuments")}</p>
                      </div>
                    </div>
                  ) : filteredDocs.length === 0 ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="text-center max-w-md">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 mb-4 shadow-lg">
                          <FileText className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h3 className="text-xl font-bold mb-2 text-foreground">{t("noDocuments")}</h3>
                        <p className="text-muted-foreground mb-4 text-sm">
                          {t("noDocumentsDesc")}
                        </p>
                        <div className="bg-muted/50 rounded-lg p-4 text-left text-sm space-y-2 mb-4">
                          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                            <li>{t("featurePdf")}</li>
                            <li>{t("featureFlashcards")}</li>
                            <li>{t("featureQuiz")}</li>
                            <li>{t("featureQuestions")}</li>
                          </ul>
                        </div>
                        <Button
                          onClick={() => setIsUploadOpen(true)}
                          size="sm"
                          className="rounded-lg"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          {t("addDocument")}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredDocs.map((doc: any) => (
                        <div
                          key={doc.id}
                          className="group"
                        >
                          <div
                            onClick={() => handleViewPdf(doc.id)}
                            className="cursor-pointer"
                          >
                            <div className="flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-background/50 hover:border-primary/50 hover:bg-background hover:shadow-md transition-all duration-200">
                              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-500/5 group-hover:from-blue-500/15 group-hover:to-blue-500/10 transition-all flex-shrink-0 border border-blue-500/10">
                                <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-1">
                                  <h3 className="font-semibold text-sm line-clamp-1 group-hover:text-primary transition-colors">
                                    {doc.title}
                                  </h3>
                                  <span className={cn(
                                    "text-xs px-2 py-0.5 rounded-md border font-medium flex-shrink-0",
                                    doc.status === "ready"
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800"
                                      : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800"
                                  )}>
                                    {doc.status === "ready" ? tStatus("ready") : tStatus("analyzing")}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span className="line-clamp-1">{doc.filename}</span>
                                  <span className="text-border">•</span>
                                  <span className="flex items-center gap-1">
                                    <BookOpen className="h-3 w-3" />
                                    {doc.note_count} {doc.note_count > 1 ? t("notes") : t("note")}
                                  </span>
                                </div>
                              </div>

                              <div className="flex-shrink-0 flex items-center gap-2">
                                <button
                                  onClick={(e) => handleDeleteDocument(doc.id, e)}
                                  className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                  title={t("deleteDocumentTooltip")}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                                {isLoadingPdf === doc.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                ) : (
                                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Afficher les résumés si disponibles */}
                          {doc.summaries && Array.isArray(doc.summaries) && doc.summaries.length > 0 ? (
                            <div className="mt-2 px-4 pb-4 space-y-2">
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                                <Sparkles className="h-3 w-3" />
                                <span className="font-medium">{t("summariesAvailable")}</span>
                              </div>
                              {doc.summaries.slice(0, 3).map((summary: any, idx: number) => (
                                <div
                                  key={summary.sectionId || idx}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (summary.sectionId) {
                                      router.push(`/ documents / ${doc.id} / sections / ${summary.sectionId}`)
                                    }
                                  }}
                                  className="p-3 rounded-lg border border-border/40 bg-muted/30 hover:border-primary/40 hover:bg-muted/50 transition-all cursor-pointer"
                                >
                                  <div className="flex items-start justify-between gap-2 mb-1">
                                    <h4 className="text-xs font-semibold text-foreground line-clamp-1">
                                      {summary.heading}
                                    </h4>
                                  </div>
                                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                    {summary.summary}
                                  </p>
                                </div>
                              ))}
                              {doc.summaries.length > 3 && (
                                <div className="text-center pt-1">
                                  <span className="text-xs text-muted-foreground">
                                    +{doc.summaries.length - 3} {t("otherSummaries")}
                                  </span>
                                </div>
                              )}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Section Flashcards */}
            {activeTab === "flashcards" && (
              <div className="bg-card/80 backdrop-blur-xl shadow-sm rounded-2xl overflow-hidden border border-border/50">


                <div className="px-5 pb-5 space-y-3">
                  {isLoadingStudy ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="flex flex-col items-center gap-4">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground font-medium">{tCommon("loading")}</p>
                      </div>
                    </div>
                  ) : flashcardsCollections.length === 0 ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="text-center max-w-md">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/10 to-purple-500/5 mb-4 shadow-lg">
                          <Brain className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                        </div>
                        <h3 className="text-xl font-bold mb-2 text-foreground">{t("noFlashcards")}</h3>
                        <p className="text-muted-foreground mb-4 text-sm">
                          {t("noFlashcardsDesc")}
                        </p>
                        <div className="bg-muted/50 rounded-lg p-4 text-left text-sm space-y-2 mb-4">
                          <p className="font-medium text-foreground">💬 {t("examples")}</p>
                          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                            <li>"{t("promptFlashcards1")}"</li>
                            <li>"{t("promptFlashcards2")}"</li>
                            <li>"{t("promptFlashcards3")}"</li>
                          </ul>
                        </div>
                        <Button
                          onClick={() => {
                            setActiveTab("pdf")
                            handleOpenGenerationDialog("flashcards")
                          }}
                          size="sm"
                          className="rounded-lg"
                        >
                          <Brain className="h-4 w-4 mr-2" />
                          {t("createFlashcardsNow")}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {flashcardsCollections.map((studyCollection: any) => (
                        <div
                          key={studyCollection.id}
                          className="group relative rounded-2xl border border-border/50 bg-gradient-to-br from-background to-muted/20 p-5 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-300 overflow-hidden"
                        >
                          {/* Gradient décoratif */}
                          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                          <div className="relative z-10">

                            {/* Header avec icône */}
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-500/10 border border-purple-500/20">
                                  <Brain className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="text-base font-bold text-foreground mb-1 line-clamp-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                                    {studyCollection.title}
                                  </h3>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 font-medium">
                                      <Brain className="h-3 w-3" />
                                      {studyCollection.flashcards.length} {studyCollection.flashcards.length > 1 ? t("cards") : t("card")}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={(e) => handleDeleteStudyCollection(studyCollection.id, e)}
                                className="p-2 rounded-lg text-muted-foreground hover:bg-red-500/10 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                                title="Supprimer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>



                            {/* Aperçu des flashcards en format carte */}
                            {studyCollection.flashcards && studyCollection.flashcards.length > 0 && (
                              <div className="mb-4 space-y-2">
                                {studyCollection.flashcards.slice(0, 3).map((fc: any, idx: number) => (
                                  <div
                                    key={fc.id}
                                    className="relative p-3 rounded-xl bg-gradient-to-br from-card/80 to-card/40 border border-border/40 hover:border-purple-500/30 transition-all group/card"
                                    style={{ transform: `translateY(${idx * 2}px)`, zIndex: 3 - idx }}
                                  >
                                    <div className="flex items-start gap-2">
                                      <div className="flex-shrink-0 w-6 h-6 rounded-md bg-purple-500/10 flex items-center justify-center text-xs font-bold text-purple-600 dark:text-purple-400">
                                        {idx + 1}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold text-foreground mb-1 line-clamp-1">{fc.question}</p>
                                        <p className="text-xs text-muted-foreground line-clamp-1 opacity-70">{fc.answer}</p>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                                {studyCollection.flashcards.length > 3 && (
                                  <div className="text-center pt-2">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/50 border border-border/40 text-xs font-medium text-muted-foreground">
                                      <Brain className="h-3 w-3" />
                                      +{studyCollection.flashcards.length - 3} {t("cards")}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Bouton d'action */}
                            <Button
                              onClick={() => setSelectedFlashcardCollectionId(studyCollection.id)}
                              className="w-full bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white border-0 shadow-md hover:shadow-lg transition-all"
                              size="sm"
                            >
                              <Brain className="h-4 w-4 mr-2" />
                              {t("studyNow")}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Section Quiz */}
            {activeTab === "quiz" && (
              <div className="bg-card/80 backdrop-blur-xl shadow-sm rounded-2xl overflow-hidden border border-border/50">


                <div className="px-5 pb-5 space-y-3">
                  {isLoadingStudy ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="flex flex-col items-center gap-4">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground font-medium">{tCommon("loading")}</p>
                      </div>
                    </div>
                  ) : quizCollections.length === 0 ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="text-center max-w-md">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500/10 to-green-500/5 mb-4 shadow-lg">
                          <ListChecks className="h-8 w-8 text-green-600 dark:text-green-400" />
                        </div>
                        <h3 className="text-xl font-bold mb-2 text-foreground">{t("noQuiz")}</h3>
                        <p className="text-muted-foreground mb-4 text-sm">
                          {t("noQuizDesc")}
                        </p>
                        <div className="bg-muted/50 rounded-lg p-4 text-left text-sm space-y-2 mb-4">
                          <p className="font-medium text-foreground">💬 {t("examples")}</p>
                          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                            <li>"{t("promptQuiz1")}"</li>
                            <li>"{t("promptQuiz2")}"</li>
                            <li>"{t("promptQuiz3")}"</li>
                          </ul>
                        </div>
                        <Button
                          onClick={() => {
                            setActiveTab("pdf")
                            handleOpenGenerationDialog("quiz")
                          }}
                          size="sm"
                          className="rounded-lg"
                        >
                          <ListChecks className="h-4 w-4 mr-2" />
                          {t("createQuizNow")}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {quizCollections.map((studyCollection: any) => {
                        // Compter les types de questions
                        const questionTypes = studyCollection.quizQuestions?.reduce((acc: any, q: any) => {
                          const type = q.question_type === "multiple_choice" ? t("typeQCM") : q.question_type === "true_false" ? t("typeTrueFalse") : t("typeCompletion")
                          acc[type] = (acc[type] || 0) + 1
                          return acc
                        }, {}) || {}

                        return (
                          <div
                            key={studyCollection.id}
                            className="group relative rounded-2xl border border-border/50 bg-gradient-to-br from-background to-muted/20 p-5 hover:border-green-500/50 hover:shadow-lg hover:shadow-green-500/10 transition-all duration-300 overflow-hidden"
                          >
                            {/* Gradient décoratif */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

                            <div className="relative z-10">
                              {/* Header avec icône */}
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-green-500/20 to-green-500/10 border border-green-500/20">
                                    <ListChecks className="h-5 w-5 text-green-600 dark:text-green-400" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h3 className="text-base font-bold text-foreground mb-1 line-clamp-2 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                                      {studyCollection.title}
                                    </h3>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-green-500/10 text-green-600 dark:text-green-400 font-medium text-xs">
                                        <ListChecks className="h-3 w-3" />
                                        {studyCollection.quizQuestions.length} {studyCollection.quizQuestions.length > 1 ? t("questions") : t("question")}
                                      </span>
                                      {Object.keys(questionTypes).length > 0 && (
                                        <span className="text-xs text-muted-foreground">
                                          {Object.entries(questionTypes).map(([type, count]: [string, any]) => `${count} ${type}`).join(" • ")}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <button
                                  onClick={(e) => handleDeleteStudyCollection(studyCollection.id, e)}
                                  className="p-2 rounded-lg text-muted-foreground hover:bg-red-500/10 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                                  title="Supprimer"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>

                              {/* Aperçu des questions en format carte */}
                              {studyCollection.quizQuestions && studyCollection.quizQuestions.length > 0 && (
                                <div className="mb-4 space-y-2">
                                  {studyCollection.quizQuestions.slice(0, 3).map((q: any, idx: number) => {
                                    const typeLabel = q.question_type === "multiple_choice" ? t("typeQCM") : q.question_type === "true_false" ? t("typeTrueFalse") : t("typeCompletion")
                                    const typeColor = q.question_type === "multiple_choice" ? "blue" : q.question_type === "true_false" ? "amber" : "indigo"
                                    return (
                                      <div
                                        key={q.id}
                                        className="relative p-3 rounded-xl bg-gradient-to-br from-card/80 to-card/40 border border-border/40 hover:border-green-500/30 transition-all group/card"
                                        style={{ transform: `translateY(${idx * 2}px)`, zIndex: 3 - idx }}
                                      >
                                        <div className="flex items-start gap-2">
                                          <div className={cn(
                                            "flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold",
                                            typeColor === "blue" && "bg-blue-500/10 text-blue-600 dark:text-blue-400",
                                            typeColor === "amber" && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                                            typeColor === "indigo" && "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                                          )}>
                                            {idx + 1}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold text-foreground mb-1 line-clamp-1">{q.prompt}</p>
                                            <div className="flex items-center gap-2">
                                              <span className={cn(
                                                "text-xs px-1.5 py-0.5 rounded font-medium",
                                                typeColor === "blue" && "bg-blue-500/10 text-blue-600 dark:text-blue-400",
                                                typeColor === "amber" && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                                                typeColor === "indigo" && "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                                              )}>
                                                {typeLabel}
                                              </span>
                                              {q.options && Array.isArray(q.options) && q.options.length > 0 && (
                                                <span className="text-xs text-muted-foreground">
                                                  {t("optionsCount", { count: q.options.length })}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    )
                                  })}
                                  {studyCollection.quizQuestions.length > 3 && (
                                    <div className="text-center pt-2">
                                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/50 border border-border/40 text-xs font-medium text-muted-foreground">
                                        <ListChecks className="h-3 w-3" />
                                        +{studyCollection.quizQuestions.length - 3} {t("questions")}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Bouton d'action */}
                              <Button
                                onClick={() => setSelectedQuizCollection(studyCollection)}
                                className="w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white border-0 shadow-md hover:shadow-lg transition-all"
                                size="sm"
                              >
                                <ListChecks className="h-4 w-4 mr-2" />
                                {t("startQuiz")}
                              </Button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Section Résumés */}
            {activeTab === "resume" && (
              <div className="bg-card/80 backdrop-blur-xl shadow-sm rounded-2xl overflow-hidden border border-border/50">


                <div className="px-5 pb-5 space-y-6">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="flex flex-col items-center gap-4">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground font-medium">{t("loadingSummaries")}</p>
                      </div>
                    </div>
                  ) : totalSummaries === 0 ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="text-center max-w-md">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/10 to-amber-500/5 mb-4 shadow-lg">
                          <BookOpen className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                        </div>
                        <h3 className="text-xl font-bold mb-2 text-foreground">{t("noSummaries")}</h3>
                        <p className="text-muted-foreground mb-4 text-sm">
                          {t("noSummariesDesc")}
                        </p>
                        <div className="bg-muted/50 rounded-lg p-4 text-left text-sm space-y-2 mb-4">
                          <p className="font-medium text-foreground">💬 {t("examples")}</p>
                          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                            <li>"{t("promptSummary1")}"</li>
                            <li>"{t("promptSummary2")}"</li>
                          </ul>
                        </div>
                        <Button
                          onClick={() => {
                            handleOpenGenerationDialog("summary")
                          }}
                          size="sm"
                          className="rounded-lg"
                        >
                          <BookOpen className="h-4 w-4 mr-2" />
                          {t("generateSummaryNow")}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {/* Résumés de collection */}
                      {collectionSummaries.length > 0 && (
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 pb-2">
                            <Sparkles className="h-4 w-4 text-amber-500" />
                            <h3 className="text-sm font-semibold text-foreground">{t("collectionSummaries")}</h3>
                          </div>

                          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                            {collectionSummaries.map((summary: any) => (
                              <div
                                key={summary.id}
                                className="group flex flex-col justify-between p-5 rounded-xl border border-border/40 bg-card hover:border-amber-500/30 hover:shadow-lg hover:shadow-amber-500/5 transition-all duration-300"
                              >
                                <div>
                                  <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                      <div className="p-2 rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                                        <BookOpen className="h-4 w-4" />
                                      </div>
                                      <h4 className="text-base font-bold text-foreground line-clamp-1">
                                        {t("summaryPrefix")} {summary.title}
                                      </h4>
                                    </div>
                                    <button
                                      onClick={(e) => handleDeleteStudyCollection(summary.id, e)}
                                      className="p-2 rounded-lg text-muted-foreground hover:bg-red-500/10 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                                      title="Supprimer"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>

                                  <div className="prose prose-sm dark:prose-invert max-w-none mb-4">
                                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4">
                                      {summary.summary}
                                    </p>
                                  </div>
                                </div>

                                <Button
                                  onClick={() => setSelectedSummary({
                                    ...summary,
                                    isDocumentSummary: false
                                  })}
                                  variant="outline"
                                  className="w-full mt-auto border-amber-200 hover:bg-amber-50 hover:text-amber-700 dark:border-amber-800 dark:hover:bg-amber-950/50 dark:hover:text-amber-400 transition-colors"
                                >
                                  {t("readSummary")}
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Résumés de documents */}
                      {documents.filter((doc: any) => doc.summaries && doc.summaries.length > 0).map((doc: any) => (
                        <div key={doc.id} className="space-y-4">
                          {/* Document Header */}
                          <div className="flex items-center gap-2 pb-2">
                            <FileText className="h-4 w-4 text-blue-500" />
                            <h3 className="text-sm font-semibold text-foreground">{doc.title}</h3>
                          </div>

                          {/* Summaries Grid */}
                          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                            {doc.summaries.map((summary: any, idx: number) => (
                              <div
                                key={summary.sectionId || idx}
                                className="group flex flex-col justify-between p-5 rounded-xl border border-border/40 bg-card hover:border-amber-500/30 hover:shadow-lg hover:shadow-amber-500/5 transition-all duration-300"
                              >
                                <div>
                                  <div className="flex items-center gap-3 mb-3">
                                    <div className="p-2 rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                                      <BookOpen className="h-4 w-4" />
                                    </div>
                                    <h4 className="text-base font-bold text-foreground line-clamp-1">
                                      {t("summaryPrefix")} {summary.heading}
                                    </h4>
                                  </div>

                                  <div className="prose prose-sm dark:prose-invert max-w-none mb-4">
                                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4">
                                      {summary.summary}
                                    </p>
                                  </div>
                                </div>

                                <Button
                                  onClick={() => setSelectedSummary({
                                    ...summary,
                                    title: summary.heading,
                                    isDocumentSummary: true,
                                    documentTitle: doc.title
                                  })}
                                  variant="outline"
                                  className="w-full mt-auto border-amber-200 hover:bg-amber-50 hover:text-amber-700 dark:border-amber-800 dark:hover:bg-amber-950/50 dark:hover:text-amber-400 transition-colors"
                                >
                                  {t("readSummary")}
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

        ) : selectedFlashcardCollectionId && selectedFlashcardCollection && selectedFlashcardCollection.flashcards && selectedFlashcardCollection.flashcards.length > 0 ? (
          // Afficher directement les flashcards dans le contenu
          isLoadingFlashcards ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground font-medium">{t("loadingFlashcards")}</p>
              </div>
            </div>
          ) : (
            <FlashcardViewer
              cards={selectedFlashcardCollection.flashcards.map((fc: any): FlashcardItem => ({
                id: fc.id,
                question: fc.question,
                answer: fc.answer,
                tags: fc.tags || [],
                order_index: fc.order_index || 0,
              }))}
              onClose={() => setSelectedFlashcardCollectionId(null)}
              studyCollectionId={selectedFlashcardCollectionId}
            />
          )
        ) : selectedQuizCollection && selectedQuizCollection.quizQuestions && selectedQuizCollection.quizQuestions.length > 0 ? (
          // Afficher directement le quiz dans le contenu
          <div className="h-full w-full flex flex-col p-6 md:p-8">
            <div className="w-full max-w-4xl mx-auto flex flex-col h-full">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-xl font-semibold">{selectedQuizCollection.title}</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedQuizCollection.quizQuestions.length} {selectedQuizCollection.quizQuestions.length > 1 ? t("questions") : t("question")} {t("ofQuiz")}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedQuizCollection(null)}
                  className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <QuizViewer
                  questions={selectedQuizCollection.quizQuestions.map((q: any): QuizQuestionItem => ({
                    id: q.id,
                    question_type: q.question_type as "multiple_choice" | "true_false" | "completion",
                    prompt: q.prompt,
                    options: Array.isArray(q.options) ? q.options : (typeof q.options === "string" ? JSON.parse(q.options || "[]") : null),
                    answer: q.answer,
                    explanation: q.explanation || null,
                    tags: q.tags || [],
                    order_index: q.order_index || 0,
                  }))}
                  studyCollectionId={selectedQuizCollection.id}
                  mode="adaptive"
                />
              </div>
            </div>
          </div>
        ) : selectedSummary ? (
          <div className="h-full flex flex-col bg-background animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Header du résumé */}
            <div className="flex-shrink-0 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
              <div className="flex items-center justify-between px-6 py-4 max-w-5xl mx-auto w-full">
                <div className="flex items-center gap-4">
                  <Button
                    variant="ghost"
                    onClick={() => setSelectedSummary(null)}
                    size="sm"
                    className="hover:bg-muted rounded-full w-8 h-8 p-0"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div>
                    <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                      {selectedSummary.title}
                      {selectedSummary.isDocumentSummary && (
                        <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                          {selectedSummary.documentTitle}
                        </span>
                      )}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {selectedSummary.createdAt ? new Date(selectedSummary.createdAt).toLocaleDateString() : t("aiGeneratedSummary")}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contenu du résumé */}
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-3xl mx-auto px-6 py-8">
                <div className="prose prose-slate dark:prose-invert max-w-none prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl prose-p:leading-relaxed prose-li:marker:text-primary">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {selectedSummary.summary}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          </div>
        ) : null
        }
      </div>

      {/* Chat intégré en bas - Style ChatGPT amélioré - Caché quand on affiche flashcards/quiz */}
      {/* Chat intégré en bas - Style ChatGPT amélioré - Caché quand on affiche flashcards/quiz */}
      {
        !selectedFlashcardCollectionId && !selectedQuizCollection && !selectedSummary && (
          <div className="sticky bottom-0 left-0 right-0 z-20 mt-auto pointer-events-none pb-6">
            <div className="max-w-3xl mx-auto px-4 pointer-events-auto">
              {/* Message si aucun document */}
              {documents.length === 0 && showNoDocsWarning && (
                <div className="mb-4 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 backdrop-blur-md shadow-lg relative">
                  <button
                    onClick={() => setShowNoDocsWarning(false)}
                    className="absolute top-2 right-2 p-1 rounded-md hover:bg-amber-500/20 text-amber-600/60 hover:text-amber-600 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded-lg bg-amber-500/20 border border-amber-500/30 flex-shrink-0">
                      <FileText className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="flex-1 pr-6">
                      <p className="text-sm font-medium text-foreground mb-1">
                        {t("noDocsInCollection")}
                      </p>
                      <p className="text-xs text-muted-foreground mb-3">
                        {t("noDocsInCollectionDesc")}
                      </p>
                      <Button
                        onClick={() => setIsUploadOpen(true)}
                        size="sm"
                        className="rounded-lg bg-amber-600 hover:bg-amber-700 text-white"
                      >
                        <Plus className="h-3.5 w-3.5 mr-2" />
                        {t("addDocument")}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Suggestions de prompts rapides */}
              {documents.length > 0 && chatInput.length === 0 && (
                <div className="mb-3 space-y-2 flex flex-col items-center animate-in slide-in-from-bottom-2 fade-in duration-300">
                  <div className="flex flex-wrap justify-center gap-2">
                    <button
                      onClick={() => {
                        handleOpenGenerationDialog("flashcards")
                      }}
                      className="px-3 py-1.5 text-xs rounded-full border border-border/60 bg-background/80 backdrop-blur-md hover:bg-muted hover:border-primary/50 transition-all flex items-center gap-2 text-foreground shadow-sm"
                    >
                      <Brain className="h-3.5 w-3.5 text-purple-500" />
                      {t("generateFlashcards")}
                    </button>
                    <button
                      onClick={() => {
                        handleOpenGenerationDialog("quiz")
                      }}
                      className="px-3 py-1.5 text-xs rounded-full border border-border/60 bg-background/80 backdrop-blur-md hover:bg-muted hover:border-primary/50 transition-all flex items-center gap-2 text-foreground shadow-sm"
                    >
                      <ListChecks className="h-3.5 w-3.5 text-green-500" />
                      {t("generateQuiz")}
                    </button>
                    <button
                      onClick={() => {
                        handleOpenGenerationDialog("summary")
                      }}
                      className="px-3 py-1.5 text-xs rounded-full border border-border/60 bg-background/80 backdrop-blur-md hover:bg-muted hover:border-primary/50 transition-all flex items-center gap-2 text-foreground shadow-sm"
                    >
                      <FileText className="h-3.5 w-3.5 text-blue-500" />
                      {t("summarize")}
                    </button>
                  </div>
                </div>
              )}

              <div className="relative">
                <MentionInput
                  value={chatInput}
                  onChange={setChatInput}
                  onSend={handleSendMessage}
                  onUpload={() => setIsUploadOpen(true)}

                  disabled={isSending}
                  isLoading={isSending}
                  documents={documents.map((doc: any) => ({
                    id: doc.id,
                    title: doc.title,
                    filename: doc.filename,
                  }))}
                />
              </div>
              {documents.length > 0 && (
                <p className="text-[10px] text-center text-muted-foreground/60 mt-2 font-medium">
                  {t("aiDisclaimer")}
                </p>
              )}
            </div>
          </div>
        )
      }

      {
        isUploadOpen && (
          <UploadDialog
            open={isUploadOpen}
            onOpenChange={setIsUploadOpen}
            collectionId={collection.id}
            collectionTitle={collection.title}
          />
        )
      }

      <GenerationDialog
        open={isGenerationDialogOpen}
        onOpenChange={setIsGenerationDialogOpen}
        documents={documents}
        intent={generationIntent}
        onConfirm={handleConfirmGeneration}
      />

      {/* Modal/Viewer pour le PDF */}
      {
        showPdfViewer && pdfUrl && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full h-full max-w-7xl max-h-[90vh] flex flex-col bg-background rounded-lg shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-border bg-muted/50">
                <h2 className="text-lg font-semibold text-foreground">
                  {currentPdfDocId ? documents.find((d: any) => d.id === currentPdfDocId)?.title || t("pdfViewerTitle") : t("pdfViewerTitle")}
                </h2>
                <button
                  onClick={() => {
                    setShowPdfViewer(false)
                    setPdfUrl(null)
                    setCurrentPdfDocId(null)
                  }}
                  className="p-2 rounded-lg hover:bg-muted transition-colors text-foreground"
                  aria-label={tCommon("close")}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <iframe
                  src={pdfUrl}
                  className="w-full h-full border-0"
                  title="PDF Viewer"
                />
              </div>
            </div>
          </div>
        )
      }




    </div>
  )
}

