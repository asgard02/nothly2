"use client"

import { useState, useTransition, useMemo } from "react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { ArrowLeft, ArrowRight, FileText, Plus, Search, Sparkles, BookOpen, MessageSquare, Send, Loader2, X, Brain, ListChecks, ChevronDown, ChevronUp, Calendar, Trash2, Pencil, Check } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
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
import DeleteConfirmationDialog from "@/components/DeleteConfirmationDialog"

import remarkGfm from "remark-gfm"
import { useTranslations } from "next-intl"

interface CollectionViewProps {
  collection: Collection
  onBack: () => void
  onSelectDocument?: (doc: any) => void
  onUpdate?: (collection: Collection) => void
}

export function CollectionView({ collection, onBack, onSelectDocument, onUpdate }: CollectionViewProps) {
  // Refresh translations
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

  // États pour l'édition de la collection
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editTitle, setEditTitle] = useState(collection.title)
  const [editColor, setEditColor] = useState(collection.color || "from-blue-500/20 via-blue-400/10 to-purple-500/20")
  const [isUpdating, setIsUpdating] = useState(false)

  // État pour la boîte de dialogue de suppression
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean
    type: "document" | "flashcards" | "quiz" | "summary"
    id: string
    title: string
  }>({
    isOpen: false,
    type: "document",
    id: "",
    title: "",
  })
  const [isDeletingItem, setIsDeletingItem] = useState(false)

  const gradients = [
    { label: "Blue", value: "from-blue-500/20 via-blue-400/10 to-purple-500/20" },
    { label: "Emerald", value: "from-emerald-500/20 via-teal-400/10 to-cyan-500/20" },
    { label: "Amber", value: "from-amber-500/20 via-orange-400/10 to-red-500/20" },
    { label: "Pink", value: "from-pink-500/20 via-rose-400/10 to-fuchsia-500/20" },
    { label: "Indigo", value: "from-indigo-500/20 via-purple-400/10 to-pink-500/20" },
    { label: "Green", value: "from-green-500/20 via-emerald-400/10 to-teal-500/20" },
  ]

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

  const handleDeleteDocument = async (docId: string, e: React.MouseEvent, docTitle: string) => {
    e.stopPropagation()
    setDeleteConfirmation({
      isOpen: true,
      type: "document",
      id: docId,
      title: docTitle,
    })
  }

  const confirmDeleteDocument = async () => {
    if (!deleteConfirmation.id) return

    setIsDeletingItem(true)
    try {
      const response = await fetch(`/api/documents/${deleteConfirmation.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error(t("errorDeletingDocument"))
      }

      // Rafraîchir la liste des documents
      queryClient.invalidateQueries({ queryKey: ["collection-documents", collection.id] })
      setDeleteConfirmation(prev => ({ ...prev, isOpen: false }))
      toast.success(t("documentDeleted"))
    } catch (error) {
      console.error("Erreur suppression document:", error)
      toast.error(t("unableToDeleteDocument"))
    } finally {
      setIsDeletingItem(false)
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

  const handleDeleteStudyCollection = async (id: string, e: React.MouseEvent, title: string, type: "flashcards" | "quiz" | "summary") => {
    e.stopPropagation()
    setDeleteConfirmation({
      isOpen: true,
      type,
      id,
      title,
    })
  }

  const confirmDeleteStudyCollection = async () => {
    if (!deleteConfirmation.id) return

    setIsDeletingItem(true)
    try {
      const response = await fetch(`/api/study-collections/${deleteConfirmation.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error(t("errorDeleting"))
      }

      // Rafraîchir les données
      queryClient.invalidateQueries({ queryKey: ["collection-study", collection.id] })
      setDeleteConfirmation(prev => ({ ...prev, isOpen: false }))
      toast.success(t("itemDeleted"))
    } catch (error) {
      console.error("Erreur suppression:", error)
      toast.error(t("unableToDeleteItem"))
    } finally {
      setIsDeletingItem(false)
    }
  }

  const handleConfirmDelete = () => {
    if (deleteConfirmation.type === "document") {
      confirmDeleteDocument()
    } else {
      confirmDeleteStudyCollection()
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

  const handleUpdateCollection = async () => {
    if (!editTitle.trim()) return

    setIsUpdating(true)
    try {
      const response = await fetch(`/api/collections/${collection.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle,
          color: editColor
        })
      })

      if (!response.ok) {
        throw new Error("Erreur lors de la mise à jour")
      }

      const updatedCollection = await response.json()

      toast.success("Collection mise à jour")
      setIsEditDialogOpen(false)

      // Mettre à jour la collection dans le parent
      if (onUpdate) {
        onUpdate({
          ...collection,
          title: editTitle,
          color: editColor
        })
      }

      // Invalider le cache des collections pour que la vue bibliothèque se mette à jour
      await queryClient.invalidateQueries({ queryKey: ["collections"] })

      router.refresh()
    } catch (error) {
      console.error("Erreur update:", error)
      toast.error("Impossible de mettre à jour la collection")
    } finally {
      setIsUpdating(false)
    }
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

      <DeleteConfirmationDialog
        isOpen={deleteConfirmation.isOpen}
        onClose={() => setDeleteConfirmation(prev => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirmDelete}
        title={
          deleteConfirmation.type === "document" ? t("deleteDocumentTitle") :
            deleteConfirmation.type === "flashcards" ? t("deleteFlashcardsTitle") :
              deleteConfirmation.type === "quiz" ? t("deleteQuizTitle") :
                t("deleteSummaryTitle")
        }
        description={
          deleteConfirmation.type === "document" ? t("deleteDocumentDesc") :
            deleteConfirmation.type === "flashcards" ? t("deleteFlashcardsDesc") :
              deleteConfirmation.type === "quiz" ? t("deleteQuizDesc") :
                t("deleteSummaryDesc")
        }
        itemTitle={deleteConfirmation.title}
        isDeleting={isDeletingItem}
      />

      {/* Header avec design premium - Caché quand on affiche flashcards/quiz */}
      {!isViewingStudy && (
        <div className="flex-shrink-0 bg-background/80 backdrop-blur-xl border-b border-border/40 z-10 sticky top-0">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  onClick={onBack}
                  size="icon"
                  className="rounded-full hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
                    {collection.title}
                    <button
                      onClick={() => {
                        setEditTitle(collection.title)
                        setEditColor(collection.color || "from-blue-500/20 via-blue-400/10 to-purple-500/20")
                        setIsEditDialogOpen(true)
                      }}
                      className="p-1.5 rounded-full hover:bg-muted text-muted-foreground/50 hover:text-foreground transition-colors"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <span className="text-sm font-normal text-muted-foreground bg-muted/50 px-2.5 py-0.5 rounded-full border border-border/50">
                      {collection.doc_count} doc{collection.doc_count > 1 ? "s" : ""}
                    </span>
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <input
                    type="text"
                    placeholder={t("searchPlaceholder")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-64 pl-10 pr-4 py-2 text-sm rounded-full border border-border/60 bg-muted/30 focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all placeholder:text-muted-foreground/60"
                  />
                </div>
                <Button
                  onClick={() => setIsUploadOpen(true)}
                  className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 px-6"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t("addDocument")}
                </Button>
              </div>
            </div>

            {/* Onglets Premium */}
            <div className="flex items-center gap-8 border-b border-border/40">
              {[
                { id: "pdf", label: t("tabPdf"), icon: FileText, count: filteredDocs.length, color: "blue" },
                { id: "flashcards", label: t("tabFlashcards"), icon: Brain, count: flashcardsCollections.length, color: "purple" },
                { id: "quiz", label: t("tabQuiz"), icon: ListChecks, count: quizCollections.length, color: "green" },
                { id: "resume", label: t("tabSummaries"), icon: BookOpen, count: totalSummaries, color: "amber" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "relative pb-4 px-2 flex items-center gap-2 text-sm font-medium transition-colors",
                    activeTab === tab.id ? "text-foreground" : "text-muted-foreground hover:text-foreground/80"
                  )}
                >
                  <tab.icon className={cn("h-4 w-4", activeTab === tab.id && `text-${tab.color}-500`)} />
                  <span>{tab.label}</span>
                  {tab.count > 0 && (
                    <span className={cn(
                      "px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                      activeTab === tab.id
                        ? `bg-${tab.color}-500/10 text-${tab.color}-600 dark:text-${tab.color}-400`
                        : "bg-muted text-muted-foreground"
                    )}>
                      {tab.count}
                    </span>
                  )}
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="activeTab"
                      className={cn("absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full", `bg-${tab.color}-500`)}
                    />
                  )}
                </button>
              ))}
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
              <div className="space-y-6">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="flex flex-col items-center gap-4">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground font-medium">{t("loadingDocuments")}</p>
                    </div>
                  </div>
                ) : filteredDocs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-20 h-20 rounded-3xl bg-blue-500/10 flex items-center justify-center mb-6">
                      <FileText className="h-10 w-10 text-blue-500" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-2">{t("noDocuments")}</h3>
                    <p className="text-muted-foreground max-w-md mb-8 leading-relaxed">
                      {t("noDocumentsDesc")}
                    </p>
                    <Button
                      onClick={() => setIsUploadOpen(true)}
                      size="lg"
                      className="rounded-full px-8 shadow-lg shadow-primary/20"
                    >
                      <Plus className="h-5 w-5 mr-2" />
                      {t("addDocument")}
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {filteredDocs.map((doc: any) => (
                      <div
                        key={doc.id}
                        onClick={() => handleViewPdf(doc.id)}
                        className="group relative bg-card hover:bg-muted/30 border border-border/40 rounded-2xl p-4 transition-all hover:shadow-md cursor-pointer"
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
                            <FileText className="h-6 w-6" />
                          </div>

                          <div className="flex-1 min-w-0 pt-1">
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <h3 className="font-semibold text-foreground text-base mb-1 group-hover:text-primary transition-colors">
                                  {doc.title}
                                </h3>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1.5">
                                    <Calendar className="h-3.5 w-3.5" />
                                    {new Date(doc.created_at).toLocaleDateString()}
                                  </span>
                                  <span className="w-1 h-1 rounded-full bg-border" />
                                  <span className="flex items-center gap-1.5">
                                    <BookOpen className="h-3.5 w-3.5" />
                                    {doc.note_count} {doc.note_count > 1 ? t("notes") : t("note")}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  "px-2.5 py-1 rounded-full text-xs font-medium border",
                                  doc.status === "ready"
                                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                    : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                )}>
                                  {doc.status === "ready" ? tStatus("ready") : tStatus("analyzing")}
                                </span>
                                <button
                                  onClick={(e) => handleDeleteDocument(doc.id, e, doc.title)}
                                  className="p-2 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Résumés rapides */}
                        {doc.summaries && doc.summaries.length > 0 && (
                          <div className="mt-4 pl-16">
                            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                              {doc.summaries.slice(0, 3).map((summary: any, idx: number) => (
                                <div
                                  key={summary.sectionId || idx}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (summary.sectionId) {
                                      router.push(`/documents/${doc.id}/sections/${summary.sectionId}`)
                                    }
                                  }}
                                  className="flex-shrink-0 w-64 p-3 rounded-xl bg-muted/50 hover:bg-muted border border-border/50 transition-colors text-xs cursor-pointer"
                                >
                                  <h4 className="font-semibold mb-1 line-clamp-1">{summary.heading}</h4>
                                  <p className="text-muted-foreground line-clamp-2">
                                    {summary.summary.replace(/#{1,6}\s?/g, '').replace(/\*\*/g, '').replace(/\*/g, '').replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1').replace(/`{3}[\s\S]*?`{3}/g, '').replace(/`([^`]+)`/g, '$1')}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Section Flashcards */}
            {activeTab === "flashcards" && (
              <div className="space-y-6">
                {isLoadingStudy ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="flex flex-col items-center gap-4">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground font-medium">{tCommon("loading")}</p>
                    </div>
                  </div>
                ) : flashcardsCollections.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-20 h-20 rounded-3xl bg-purple-500/10 flex items-center justify-center mb-6">
                      <Brain className="h-10 w-10 text-purple-600 dark:text-purple-400" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-2">{t("noFlashcards")}</h3>
                    <p className="text-muted-foreground max-w-md mb-8 leading-relaxed">
                      {t("noFlashcardsDesc")}
                    </p>
                    <Button
                      onClick={() => {
                        setActiveTab("pdf")
                        handleOpenGenerationDialog("flashcards")
                      }}
                      size="lg"
                      className="rounded-full px-8 bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/20"
                    >
                      <Brain className="h-5 w-5 mr-2" />
                      {t("createFlashcardsNow")}
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {flashcardsCollections.map((studyCollection: any) => (
                      <div
                        key={studyCollection.id}
                        className="group relative flex flex-col bg-card hover:bg-muted/30 border border-border/40 rounded-2xl p-5 transition-all hover:shadow-lg hover:border-purple-500/30 overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-purple-500/10 transition-colors" />

                        <div className="relative z-10 flex flex-col h-full">
                          <div className="flex items-start justify-between mb-4">
                            <div className="p-3 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                              <Brain className="h-6 w-6" />
                            </div>
                            <button
                              onClick={(e) => handleDeleteStudyCollection(studyCollection.id, e, studyCollection.title, "flashcards")}
                              className="p-2 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>

                          <h3 className="text-lg font-bold text-foreground mb-2 line-clamp-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                            {studyCollection.title}
                          </h3>

                          <div className="flex items-center gap-2 mb-6">
                            <span className="px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-bold">
                              {studyCollection.flashcards.length} {studyCollection.flashcards.length > 1 ? t("cards") : t("card")}
                            </span>
                            {(() => {
                              const totalCards = studyCollection.flashcards.length
                              const stats = studyCollection.flashcardStats || []
                              const masteredCount = stats.filter((s: any) => s.box >= 4).length
                              const progress = totalCards > 0 ? Math.round((masteredCount / totalCards) * 100) : 0

                              if (progress > 0) {
                                return (
                                  <div className="flex items-center gap-2 ml-auto">
                                    <span className="text-xs font-medium text-purple-600 dark:text-purple-400">{progress}%</span>
                                    <Progress value={progress} className="w-16 h-1.5 bg-purple-100 dark:bg-purple-950/30" />
                                  </div>
                                )
                              }
                              return null
                            })()}
                          </div>

                          {/* Aperçu des cartes */}
                          <div className="flex-1 space-y-2 mb-6">
                            {studyCollection.flashcards.slice(0, 2).map((fc: any, idx: number) => (
                              <div key={fc.id} className="p-3 rounded-lg bg-muted/50 border border-border/50 text-xs">
                                <p className="font-medium mb-1 line-clamp-1">{fc.question}</p>
                                <p className="text-muted-foreground line-clamp-1">{fc.answer}</p>
                              </div>
                            ))}
                          </div>

                          <Button
                            onClick={() => setSelectedFlashcardCollectionId(studyCollection.id)}
                            className="w-full rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-500/20"
                          >
                            {t("studyNow")}
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Section Quiz */}
            {activeTab === "quiz" && (
              <div className="space-y-6">
                {isLoadingStudy ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="flex flex-col items-center gap-4">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground font-medium">{tCommon("loading")}</p>
                    </div>
                  </div>
                ) : quizCollections.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-20 h-20 rounded-3xl bg-green-500/10 flex items-center justify-center mb-6">
                      <ListChecks className="h-10 w-10 text-green-600 dark:text-green-400" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-2">{t("noQuiz")}</h3>
                    <p className="text-muted-foreground max-w-md mb-8 leading-relaxed">
                      {t("noQuizDesc")}
                    </p>
                    <Button
                      onClick={() => {
                        setActiveTab("pdf")
                        handleOpenGenerationDialog("quiz")
                      }}
                      size="lg"
                      className="rounded-full px-8 bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-500/20"
                    >
                      <ListChecks className="h-5 w-5 mr-2" />
                      {t("createQuizNow")}
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                          className="group relative flex flex-col bg-card hover:bg-muted/30 border border-border/40 rounded-2xl p-5 transition-all hover:shadow-lg hover:border-green-500/30 overflow-hidden"
                        >
                          <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-green-500/10 transition-colors" />

                          <div className="relative z-10 flex flex-col h-full">
                            <div className="flex items-start justify-between mb-4">
                              <div className="p-3 rounded-xl bg-green-500/10 text-green-600 dark:text-green-400">
                                <ListChecks className="h-6 w-6" />
                              </div>
                              <button
                                onClick={(e) => handleDeleteStudyCollection(studyCollection.id, e, studyCollection.title, "quiz")}
                                className="p-2 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>

                            <h3 className="text-lg font-bold text-foreground mb-2 line-clamp-2 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                              {studyCollection.title}
                            </h3>

                            <div className="flex items-center gap-2 mb-6 flex-wrap">
                              <span className="px-2.5 py-1 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-bold">
                                {studyCollection.quizQuestions.length} {studyCollection.quizQuestions.length > 1 ? t("questions") : t("question")}
                              </span>
                              {Object.entries(questionTypes).map(([type, count]: [string, any]) => (
                                <span key={type} className="px-2 py-1 rounded-full bg-muted text-muted-foreground text-[10px] font-medium border border-border/50">
                                  {count} {type}
                                </span>
                              ))}
                              {(() => {
                                const totalQuestions = studyCollection.quizQuestions.length
                                const stats = studyCollection.quizStats || []
                                const masteredCount = stats.filter((s: any) => s.mastery_level === 'mastered').length
                                const progress = totalQuestions > 0 ? Math.round((masteredCount / totalQuestions) * 100) : 0

                                if (progress > 0) {
                                  return (
                                    <div className="flex items-center gap-2 ml-auto w-full mt-2">
                                      <span className="text-xs font-medium text-green-600 dark:text-green-400 min-w-[30px]">{progress}%</span>
                                      <Progress value={progress} className="flex-1 h-1.5 bg-green-100 dark:bg-green-950/30" />
                                    </div>
                                  )
                                }
                                return null
                              })()}
                            </div>

                            {/* Aperçu des questions */}
                            <div className="flex-1 space-y-2 mb-6">
                              {studyCollection.quizQuestions.slice(0, 2).map((q: any, idx: number) => (
                                <div key={q.id} className="p-3 rounded-lg bg-muted/50 border border-border/50 text-xs">
                                  <p className="font-medium mb-1 line-clamp-1">{q.prompt}</p>
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500/50" />
                                    <span>{q.options?.length || 2} options</span>
                                  </div>
                                </div>
                              ))}
                            </div>

                            <Button
                              onClick={() => setSelectedQuizCollection(studyCollection)}
                              className="w-full rounded-xl bg-green-600 hover:bg-green-700 text-white shadow-md shadow-green-500/20"
                            >
                              {t("startQuiz")}
                              <ArrowRight className="h-4 w-4 ml-2" />
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Section Résumés */}
            {activeTab === "resume" && (
              <div className="space-y-6">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="flex flex-col items-center gap-4">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="text-sm text-muted-foreground font-medium">{t("loadingSummaries")}</p>
                    </div>
                  </div>
                ) : totalSummaries === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-20 h-20 rounded-3xl bg-amber-500/10 flex items-center justify-center mb-6">
                      <BookOpen className="h-10 w-10 text-amber-600 dark:text-amber-400" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-2">{t("noSummaries")}</h3>
                    <p className="text-muted-foreground max-w-md mb-8 leading-relaxed">
                      {t("noSummariesDesc")}
                    </p>
                    <Button
                      onClick={() => {
                        handleOpenGenerationDialog("summary")
                      }}
                      size="lg"
                      className="rounded-full px-8 bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-500/20"
                    >
                      <BookOpen className="h-5 w-5 mr-2" />
                      {t("generateSummaryNow")}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {/* Résumés de collection */}
                    {collectionSummaries.length > 0 && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-border/40">
                          <Sparkles className="h-4 w-4 text-amber-500" />
                          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{t("collectionSummaries")}</h3>
                        </div>

                        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                          {collectionSummaries.map((summary: any) => (
                            <div
                              key={summary.id}
                              className="group relative flex flex-col bg-card hover:bg-muted/30 border border-border/40 rounded-2xl p-5 transition-all hover:shadow-lg hover:border-amber-500/30 overflow-hidden"
                            >
                              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-amber-500/10 transition-colors" />

                              <div className="relative z-10 flex flex-col h-full">
                                <div className="flex items-start justify-between mb-4">
                                  <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                    <BookOpen className="h-6 w-6" />
                                  </div>
                                  <button
                                    onClick={(e) => handleDeleteStudyCollection(summary.id, e, summary.title, "summary")}
                                    className="p-2 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>

                                <h3 className="text-lg font-bold text-foreground mb-3 line-clamp-2 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                                  {summary.title}
                                </h3>

                                <div className="flex-1 mb-6">
                                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4">
                                    {summary.summary.replace(/#{1,6}\s?/g, '').replace(/\*\*/g, '').replace(/\*/g, '').replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1').replace(/`{3}[\s\S]*?`{3}/g, '').replace(/`([^`]+)`/g, '$1')}
                                  </p>
                                </div>

                                <Button
                                  onClick={() => setSelectedSummary({
                                    ...summary,
                                    isDocumentSummary: false
                                  })}
                                  variant="outline"
                                  className="w-full rounded-xl border-amber-200 hover:bg-amber-50 hover:text-amber-700 dark:border-amber-800 dark:hover:bg-amber-950/50 dark:hover:text-amber-400 transition-colors"
                                >
                                  {t("readSummary")}
                                  <ArrowRight className="h-4 w-4 ml-2" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Résumés de documents */}
                    {documents.filter((doc: any) => doc.summaries && doc.summaries.length > 0).map((doc: any) => (
                      <div key={doc.id} className="space-y-4">
                        {/* Document Header */}
                        <div className="flex items-center gap-2 pb-2 border-b border-border/40">
                          <FileText className="h-4 w-4 text-blue-500" />
                          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">{doc.title}</h3>
                        </div>

                        {/* Summaries Grid */}
                        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                          {doc.summaries.map((summary: any, idx: number) => (
                            <div
                              key={summary.sectionId || idx}
                              className="group relative flex flex-col bg-card hover:bg-muted/30 border border-border/40 rounded-2xl p-5 transition-all hover:shadow-lg hover:border-amber-500/30 overflow-hidden"
                            >
                              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-amber-500/10 transition-colors" />

                              <div className="relative z-10 flex flex-col h-full">
                                <div className="flex items-start justify-between mb-4">
                                  <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                    <BookOpen className="h-6 w-6" />
                                  </div>
                                </div>

                                <h3 className="text-lg font-bold text-foreground mb-3 line-clamp-2 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                                  {summary.heading}
                                </h3>

                                <div className="flex-1 mb-6">
                                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4">
                                    {summary.summary.replace(/#{1,6}\s?/g, '').replace(/\*\*/g, '').replace(/\*/g, '').replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1').replace(/`{3}[\s\S]*?`{3}/g, '').replace(/`([^`]+)`/g, '$1')}
                                  </p>
                                </div>

                                <Button
                                  onClick={() => setSelectedSummary({
                                    ...summary,
                                    title: summary.heading,
                                    isDocumentSummary: true,
                                    documentTitle: doc.title
                                  })}
                                  variant="outline"
                                  className="w-full rounded-xl border-amber-200 hover:bg-amber-50 hover:text-amber-700 dark:border-amber-800 dark:hover:bg-amber-950/50 dark:hover:text-amber-400 transition-colors"
                                >
                                  {t("readSummary")}
                                  <ArrowRight className="h-4 w-4 ml-2" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
          // Afficher directement le quiz dans le contenu
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
            title={selectedQuizCollection.title}
            onClose={() => setSelectedQuizCollection(null)}
          />
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

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{t("editCollection")}</DialogTitle>
            <DialogDescription>
              {t("editCollectionDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">{t("title")}</Label>
              <Input
                id="title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder={t("collectionTitlePlaceholder")}
              />
            </div>
            <div className="grid gap-2">
              <Label>{t("color")}</Label>
              <div className="grid grid-cols-6 gap-2">
                {gradients.map((gradient) => (
                  <button
                    key={gradient.value}
                    onClick={() => setEditColor(gradient.value)}
                    className={cn(
                      "w-8 h-8 rounded-full transition-all ring-offset-background flex items-center justify-center",
                      editColor === gradient.value
                        ? "ring-2 ring-offset-2 ring-foreground scale-110"
                        : "border border-border/50 hover:scale-110 opacity-70 hover:opacity-100"
                    )}
                    title={gradient.label}
                  >
                    <div className={cn("w-full h-full rounded-full bg-gradient-to-br flex items-center justify-center", gradient.value)}>
                      {editColor === gradient.value && (
                        <Check className="h-4 w-4 text-white shadow-sm" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              {tCommon("cancel")}
            </Button>
            <Button onClick={handleUpdateCollection} disabled={isUpdating}>
              {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {tCommon("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

