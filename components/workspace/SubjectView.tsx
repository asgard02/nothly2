"use client"

import { useState, useTransition, useMemo, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import { ArrowLeft, ArrowRight, FileText, Plus, Search, Sparkles, BookOpen, MessageSquare, Send, Loader2, X, Brain, ListChecks, ChevronDown, ChevronUp, Calendar, Trash2, Pencil, Check, Zap, Star } from "lucide-react"
import { toast } from "@/components/CustomToast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import type { Subject } from "@/lib/hooks/useSubjects"
import { useUpdateSubject } from "@/lib/hooks/useSubjects"
import { UploadDialog } from "./UploadDialog"

import { useQuery, useQueryClient } from "@tanstack/react-query"
import { MentionInput, extractMentionedDocumentIds } from "./MentionInput"
import QuizViewer, { type QuizQuestionItem } from "@/components/subjects/QuizViewer"
import FlashcardViewer from "@/components/subjects/FlashcardViewer"
import type { FlashcardItem } from "@/components/subjects/FlashcardViewer"
import { GenerationOverlay, type GenerationStep } from "@/components/GenerationOverlay"
import { GenerationDialog, type GenerationIntent } from "./GenerationDialog"
import DeleteConfirmationDialog from "@/components/DeleteConfirmationDialog"
import MarkdownRenderer from "@/components/MarkdownRenderer"
import { useTranslations } from "next-intl"

interface SubjectViewProps {
  subject: Subject
  onBack: () => void
  onSelectDocument?: (doc: any) => void
  onUpdate?: (subject: Subject) => void
}

export default function SubjectView({ subject, onBack, onSelectDocument, onUpdate }: SubjectViewProps) {
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
  const [editTitle, setEditTitle] = useState(subject.title)
  const [editColor, setEditColor] = useState(subject.color || "from-blue-500/20 via-blue-400/10 to-purple-500/20")
  const [isUpdating, setIsUpdating] = useState(false)

  const updateSubjectMutation = useUpdateSubject()
  const handleToggleFavorite = () => {
    updateSubjectMutation.mutate({
      id: subject.id,
      is_favorite: !subject.is_favorite
    })
  }

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

  // Update recently visited status
  useEffect(() => {
    const updateLastActive = async () => {
      try {
        await fetch(`/api/subjects/${subject.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ touch: true }),
        })
      } catch (error) {
        console.error("Failed to update last active status", error)
      }
    }
    updateLastActive()
  }, [subject.id])

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
      const response = await fetch(`/api/study-subjects/${selectedFlashcardCollectionId}`)
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
    queryKey: ["subject-documents", subject.id],
    queryFn: async () => {
      const response = await fetch(`/api/subjects/${subject.id}/documents`)
      if (!response.ok) {
        throw new Error(t("errorLoadingDocuments"))
      }
      const data = await response.json()
      // Log pour debug
      if (process.env.NODE_ENV === "development") {
        console.log("[SubjectView] Documents chargés:", data)
        data.forEach((doc: any) => {
          if (doc.summaries && doc.summaries.length > 0) {
            console.log(`[SubjectView] Document ${doc.title} a ${doc.summaries.length} résumé(s)`)
          }
        })
      }
      return data
    },
    staleTime: 30_000, // 30 secondes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: false, // Éviter les refetches inutiles
  })

  // Polling manuel optimisé pour éviter les réexécutions excessives
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastProcessingIdsRef = useRef<string>("")

  useEffect(() => {
    // Nettoyer l'intervalle existant
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }

    // Créer une clé stable basée uniquement sur les IDs et statuts des documents en traitement
    const processingIdsKey = documents
      .filter((doc: any) => doc.status === "processing")
      .map((doc: any) => `${doc.id}:${doc.status}`)
      .sort()
      .join(",")

    // Ne créer un nouvel intervalle que si :
    // 1. Il y a des documents en traitement
    // 2. La clé a changé (nouveaux documents ou changement de statut)
    if (processingIdsKey && processingIdsKey !== lastProcessingIdsRef.current) {
      lastProcessingIdsRef.current = processingIdsKey
      pollingIntervalRef.current = setInterval(() => {
        queryClient.refetchQueries({ queryKey: ["subject-documents", subject.id] })
      }, 5000) // Poll toutes les 5 secondes
    } else if (!processingIdsKey) {
      // Plus de documents en traitement, arrêter le polling
      lastProcessingIdsRef.current = ""
    }

    // Cleanup
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
    }
  }, [documents, queryClient, subject.id])

  // Précharger les flashcards/quiz en arrière-plan pour éviter les lags au switch
  const { data: studyData, isLoading: isLoadingStudy, error: studyError } = useQuery({
    queryKey: ["subject-study", subject.id],
    queryFn: async () => {
      const response = await fetch(`/api/subjects/${subject.id}/study`)
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
  const [showChatInput, setShowChatInput] = useState(false)
  const [isSending, setIsSending] = useState(false)

  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant', content: string }>>([])

  // Scroller automatiquement vers le bas du chat
  const scrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, showChatInput])

  const sortedDocs = documents.sort((a: any, b: any) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  const filteredDocs = sortedDocs.filter((doc: any) =>
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
      queryClient.invalidateQueries({ queryKey: ["subject-documents", subject.id] })
      setDeleteConfirmation(prev => ({ ...prev, isOpen: false }))
      toast.success(t("documentDeleted"))
    } catch (error) {
      console.error("Erreur suppression document:", error)
      toast.error(t("unableToDeleteDocument"))
    } finally {
      setIsDeletingItem(false)
    }
  }

  const handleSendMessage = async (messageOverride?: string, explicitDocIds?: string[], sectionIds?: string[], mode: 'auto' | 'conversation' = 'conversation') => {
    const messageToSend = typeof messageOverride === 'string' ? messageOverride : chatInput
    if (!messageToSend.trim() || isSending) return

    setIsSending(true)

    // MODE CONVERSATION : Chat classique sans overlay
    if (mode === 'conversation') {
      // Ajouter le message de l'utilisateur
      const userMsg = { role: 'user' as const, content: messageToSend.trim() }
      setMessages(prev => [...prev, userMsg])
      setChatInput("")

      try {
        const response = await fetch("/api/chat/subject", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subjectId: subject.id,
            message: messageToSend.trim(),
            // Pour le chat, si pas de docs explicites, on ne force pas tout le contexte pour aller plus vite, 
            // ou on laisse l'API gérer. Ici on passe tout pour avoir le contexte.
            mentionedDocumentIds: documents.map((d: any) => d.id),
            mode: 'conversation'
          })
        })

        if (!response.ok) throw new Error("Erreur réponse IA")

        const data = await response.json()
        const aiMsg = { role: 'assistant' as const, content: data.response || "Désolé, je n'ai pas compris." }

        setMessages(prev => [...prev, aiMsg])

      } catch (error) {
        toast.error("Erreur lors de l'envoi du message")
      } finally {
        setIsSending(false)
      }
      return
    }

    // MODE GENERATION : Overlay et processus complexe
    setIsGenerating(true)
    setGenerationStep("intent")

    // Simulation des étapes pendant que l'IA travaille
    const stepTimers: NodeJS.Timeout[] = []

    stepTimers.push(setTimeout(() => setGenerationStep("documents"), 1500))
    stepTimers.push(setTimeout(() => setGenerationStep("context"), 3000))
    stepTimers.push(setTimeout(() => setGenerationStep("generation"), 4500))

    try {
      // Pour la génération "auto", on passe les documents
      const targetDocIds = explicitDocIds && explicitDocIds.length > 0
        ? explicitDocIds
        : documents.map((d: any) => d.id)

      // Appel API
      const response = await fetch("/api/chat/subject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId: subject.id,
          message: messageToSend.trim(),
          mentionedDocumentIds: targetDocIds,
          sectionIds: sectionIds && sectionIds.length > 0 ? sectionIds : undefined,
          mode: 'auto'
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

      // Invalider les queries pour rafraîchir les données
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["subject-study", subject.id] }),
        queryClient.invalidateQueries({ queryKey: ["subject-documents", subject.id] })
      ])

      // Marquer comme terminé
      setGenerationStep("complete")

      // Attendre un peu pour que l'utilisateur voie le succès
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Traitement du résultat (Flashcards/Quiz/Résumé)
      // Si du contenu a été créé, on le charge
      if (data.studyCollectionId) {
        try {
          await new Promise(resolve => setTimeout(resolve, 500))
          const studyRes = await fetch(`/api/study-subjects/${data.studyCollectionId}`)
          if (studyRes.ok) {
            const studyData = await studyRes.json()
            const hasQuizQuestions = (studyData.quiz && studyData.quiz.length > 0) || (studyData.quizQuestions && studyData.quizQuestions.length > 0)
            const hasFlashcards = studyData.flashcards && studyData.flashcards.length > 0

            if (studyData.type === 'flashcard' || hasFlashcards) {
              setPendingGenerationResult({ type: 'flashcards', data: data.studyCollectionId })
            } else if (studyData.type === 'quiz' || hasQuizQuestions) {
              setPendingGenerationResult({
                type: 'quiz',
                data: { ...studyData, quizQuestions: studyData.quiz || studyData.quizQuestions }
              })
            } else if (studyData.type === 'summary') {
              setPendingGenerationResult({
                type: 'summary',
                data: {
                  id: studyData.id,
                  title: studyData.title,
                  summary: studyData.metadata?.summary || data.response,
                  createdAt: studyData.created_at,
                  isDocumentSummary: false
                }
              })
            }
          }
        } catch (err) {
          console.error("Error fetching generated study content:", err)
        }
      } else if (data.isSummaryRequest && !data.isQuizRequest && !data.isFlashcardRequest && data.response) {
        setPendingGenerationResult({
          type: 'summary',
          data: {
            title: t("summaryPrefix"),
            summary: data.response,
            createdAt: new Date().toISOString()
          }
        })
      }

      setChatInput("")

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
      const response = await fetch(`/api/study-subjects/${deleteConfirmation.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error(t("errorDeleting"))
      }

      // Rafraîchir les données
      queryClient.invalidateQueries({ queryKey: ["subject-study", subject.id] })
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

  const handleConfirmGeneration = (selectedDocIds: string[], topic: string, sectionIds?: string[]) => {
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

    if (topic.trim()) {
      prompt += ` sur le sujet : "${topic}"`
    }

    handleSendMessage(prompt, selectedDocIds, sectionIds, 'auto')
    setIsGenerationDialogOpen(false)
  }

  const handleUpdateCollection = async () => {
    if (!editTitle.trim()) return

    setIsUpdating(true)
    try {
      const response = await fetch(`/api/subjects/${subject.id}`, {
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

      const updatedSubject = await response.json()

      toast.success("Matière mise à jour")
      setIsEditDialogOpen(false)

      // Mettre à jour le sujet dans le parent
      if (onUpdate) {
        onUpdate({
          ...subject,
          title: editTitle,
          color: editColor
        })
      }

      // Invalider le cache des sujets pour que la vue bibliothèque se mette à jour
      await queryClient.invalidateQueries({ queryKey: ["subjects"] })

      router.refresh()
    } catch (error) {
      console.error("Erreur update:", error)
      toast.error("Impossible de mettre à jour la matière")
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
    <div className="h-full flex flex-col bg-transparent overflow-hidden relative">
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
        <div className="flex-shrink-0 z-20 px-6 pt-6 mb-4">
          <div className="bg-card border-2 border-border rounded-3xl p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] relative overflow-hidden">
            {/* Ambient background glow inside header */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#DDD6FE] rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 opacity-50 pointer-events-none" />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <Button
                    variant="ghost"
                    onClick={onBack}
                    size="icon"
                    className="h-12 w-12 rounded-xl border-2 border-border hover:bg-foreground hover:text-background transition-colors text-foreground"
                  >
                    <ArrowLeft className="h-6 w-6" strokeWidth={3} />
                  </Button>
                  <div>
                    <h1 className="text-4xl font-black tracking-tight text-foreground flex items-center gap-3 uppercase">
                      {subject.title}
                      <button
                        onClick={() => {
                          setEditTitle(subject.title)
                          setEditColor(subject.color || "from-blue-500/20 via-blue-400/10 to-purple-500/20")
                          setIsEditDialogOpen(true)
                        }}
                        className="p-2 rounded-lg hover:bg-muted hover:text-foreground transition-colors text-foreground"
                      >
                        <Pencil className="h-5 w-5" />
                      </button>
                      <button
                        onClick={handleToggleFavorite}
                        className={cn(
                          "p-2 rounded-lg hover:bg-muted transition-colors",
                          subject.is_favorite ? "text-accent hover:text-accent/80" : "text-muted-foreground hover:text-accent"
                        )}
                      >
                        <Star className={cn("h-6 w-6", subject.is_favorite && "fill-yellow-500 text-yellow-500")} strokeWidth={2.5} />
                      </button>
                      <span className="text-sm font-bold text-foreground bg-secondary px-3 py-1 rounded-full border-2 border-border shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
                        {(subject.doc_count || 0)} DOC{(subject.doc_count || 0) > 1 ? "S" : ""}
                      </span>
                    </h1>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-foreground pointer-events-none z-10" strokeWidth={2.5} />
                    <input
                      type="text"
                      placeholder={t("searchPlaceholder")}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-64 pl-10 pr-4 py-3 text-sm font-bold rounded-xl border-2 border-border bg-card focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:focus:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] focus:outline-none transition-all placeholder:text-muted-foreground text-foreground uppercase"
                    />
                  </div>
                  <Button
                    onClick={() => setIsUploadOpen(true)}
                    className="h-12 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] active:translate-y-[4px] active:shadow-none transition-all px-6 border-2 border-black font-bold uppercase"
                  >
                    <Plus className="h-5 w-5 mr-2" strokeWidth={3} />
                    {t("addDocument")}
                  </Button>
                </div>
              </div>

              {/* Onglets Premium */}
              <div className="flex items-center gap-3">
                {[
                  { id: "pdf", label: t("tabPdf"), icon: FileText, count: filteredDocs.length, color: "bg-[#BAE6FD]" },
                  { id: "flashcards", label: t("tabFlashcards"), icon: Brain, count: flashcardsCollections.length, color: "bg-[#FBCFE8]" },
                  { id: "quiz", label: t("tabQuiz"), icon: ListChecks, count: quizCollections.length, color: "bg-[#BBF7D0]" },
                  { id: "resume", label: t("tabSummaries"), icon: BookOpen, count: totalSummaries, color: "bg-[#FDE68A]" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={cn(
                      "relative py-3 px-5 rounded-xl flex items-center gap-2 text-sm font-black uppercase transition-all duration-200 border-2 border-transparent",
                      activeTab === tab.id
                        ? cn("border-border shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] -translate-y-1", tab.color, "text-foreground")
                        : "text-muted-foreground hover:text-foreground hover:bg-muted hover:border-border"
                    )}
                  >
                    <tab.icon className={cn("h-5 w-5", activeTab === tab.id ? "text-foreground" : "text-muted-foreground group-hover:text-foreground")} strokeWidth={2.5} />
                    <span>{tab.label}</span>
                    {tab.count > 0 && (
                      <span className={cn(
                        "px-2 py-0.5 rounded-lg text-[10px] font-black ml-1 border-2 border-border",
                        activeTab === tab.id
                          ? "bg-card text-foreground"
                          : "bg-muted text-muted-foreground border-transparent"
                      )}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
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
                      <Loader2 className="h-8 w-8 animate-spin text-foreground" />
                      <p className="text-sm text-muted-foreground font-bold uppercase">{t("loadingDocuments")}</p>
                    </div>
                  </div>
                ) : filteredDocs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="rounded-3xl bg-card border-2 border-border p-16 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] max-w-lg w-full relative overflow-hidden group">
                      <div className="absolute top-0 left-0 w-full h-2 bg-accent border-b-2 border-border"></div>

                      <div className="w-24 h-24 rounded-full bg-[#BAE6FD] border-2 border-border flex items-center justify-center mb-6 mx-auto shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] group-hover:scale-110 transition-transform">
                        <FileText className="h-10 w-10 text-foreground" strokeWidth={2.5} />
                      </div>
                      <h3 className="text-2xl font-black uppercase mb-2 text-foreground">{t("noDocuments")}</h3>
                      <p className="text-muted-foreground font-medium max-w-md mb-8 leading-relaxed mx-auto">
                        {t("noDocumentsDesc")}
                      </p>
                      <Button
                        onClick={() => setIsUploadOpen(true)}
                        size="lg"
                        className="h-14 rounded-xl px-8 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] active:translate-y-[4px] active:shadow-none transition-all border-2 border-black font-black uppercase"
                      >
                        <Plus className="h-5 w-5 mr-2" strokeWidth={3} />
                        {t("addDocument")}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {filteredDocs.map((doc: any) => (
                      <div
                        key={doc.id}
                        onClick={() => handleViewPdf(doc.id)}
                        className="group relative bg-card border-2 border-border rounded-2xl p-5 transition-all duration-200 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] hover:-translate-y-1 cursor-pointer flex items-center gap-5"
                      >
                        <div className="flex-shrink-0 w-16 h-16 rounded-xl bg-muted border-2 border-border flex items-center justify-center text-foreground shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] group-hover:bg-[#BAE6FD] transition-colors">
                          <FileText className="h-8 w-8" strokeWidth={2} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <h3 className="font-black text-lg text-foreground mb-1 group-hover:underline decoration-2 underline-offset-2">
                                {doc.title}
                              </h3>
                              <div className="flex items-center gap-3 text-xs font-bold text-muted-foreground uppercase">
                                <span className="flex items-center gap-1.5">
                                  <Calendar className="h-4 w-4" />
                                  {new Date(doc.created_at).toLocaleDateString()}
                                </span>
                                <span className="w-1.5 h-1.5 rounded-full bg-foreground" />
                                <span className="flex items-center gap-1.5">
                                  <BookOpen className="h-4 w-4" />
                                  {doc.note_count || 0} {t("notes")}
                                </span>
                              </div>
                            </div>

                            {/* AI Buttons */}
                            {doc.status === "ready" && (
                              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleOpenGenerationDialog("flashcards")
                                  }}
                                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase bg-[#FBCFE8] dark:bg-pink-950/30 text-foreground border-2 border-border hover:bg-[#F9A8D4] dark:hover:bg-pink-950/50 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:-translate-y-[1px] transition-all"
                                >
                                  <Brain className="h-4 w-4" strokeWidth={2.5} />
                                  Flashcards
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleOpenGenerationDialog("quiz")
                                  }}
                                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase bg-[#BBF7D0] dark:bg-emerald-950/30 text-foreground border-2 border-border hover:bg-[#86EFAC] dark:hover:bg-emerald-950/50 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:-translate-y-[1px] transition-all"
                                >
                                  <ListChecks className="h-4 w-4" strokeWidth={2.5} />
                                  Quiz
                                </button>
                              </div>
                            )}

                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "px-3 py-1 rounded-lg text-xs font-black border-2 border-black uppercase",

                                doc.status === "ready"
                                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                  : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                              )}>
                                {doc.status === "ready" ? tStatus("ready") : tStatus("analyzing")}
                              </span>

                              <button
                                onClick={(e) => handleDeleteDocument(doc.id, e, doc.title)}
                                className="p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-950/30 text-muted-foreground hover:text-red-500 dark:hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Résumés rapides */}
                        {
                          doc.summaries && doc.summaries.length > 0 && (
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
                                    className="flex-shrink-0 w-64 p-3 rounded-xl bg-muted hover:bg-muted/80 border-2 border-border transition-colors text-xs cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
                                  >
                                    <h4 className="font-bold mb-1 line-clamp-1 uppercase text-foreground">{summary.heading}</h4>
                                    <p className="text-muted-foreground line-clamp-2">
                                      {summary.summary.replace(/#{1,6}\s?/g, '').replace(/\*\*/g, '').replace(/\*/g, '').replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1').replace(/`{3}[\s\S]*?`{3}/g, '').replace(/`([^`]+)`/g, '$1')}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        }
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
                      <Loader2 className="h-8 w-8 animate-spin text-foreground" />
                      <p className="text-sm text-muted-foreground font-bold uppercase">{tCommon("loading")}</p>
                    </div>
                  </div>
                ) : flashcardsCollections.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center bg-card border-2 border-dashed border-border rounded-3xl">
                    <div className="w-24 h-24 rounded-full bg-[#FBCFE8] border-2 border-border flex items-center justify-center mb-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
                      <Brain className="h-10 w-10 text-foreground" strokeWidth={2.5} />
                    </div>
                    <h3 className="text-2xl font-black uppercase mb-2 text-foreground">{t("noFlashcards")}</h3>
                    <p className="text-muted-foreground font-medium max-w-md mb-8">
                      {t("noFlashcardsDesc")}
                    </p>
                    <Button
                      onClick={() => handleOpenGenerationDialog("flashcards")}
                      className="h-12 rounded-xl px-8 bg-foreground text-background hover:bg-primary hover:text-primary-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:translate-y-[2px] active:translate-y-[4px] active:shadow-none transition-all border-2 border-border font-black uppercase"
                    >
                      <Sparkles className="h-5 w-5 mr-2" />
                      {t("createFlashcardsNow")}
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {flashcardsCollections.map((collection: any) => (
                      <div
                        key={collection.id}
                        onClick={() => {
                          setSelectedFlashcardCollectionId(collection.id)
                        }}
                        className="group bg-card border-2 border-border rounded-3xl p-6 hover:shadow-[8px_8px_0px_0px_#FBCFE8] dark:hover:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] hover:-translate-y-1 transition-all cursor-pointer relative overflow-hidden shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]"
                      >
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                          <Brain className="h-24 w-24 text-foreground" />
                        </div>
                        <div className="flex justify-between items-start mb-4 relative z-10">
                          <div className="w-12 h-12 bg-[#FBCFE8] dark:bg-pink-950/30 rounded-xl border-2 border-border flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
                            <Brain className="h-6 w-6 text-foreground" strokeWidth={2.5} />
                          </div>
                          <span className="bg-foreground text-background px-2 py-1 rounded-lg text-xs font-black uppercase">
                            {collection.flashcards?.length || 0} Cards
                          </span>
                        </div>
                        <h3 className="font-black text-xl mb-1 relative z-10 line-clamp-2 uppercase text-foreground">{collection.title}</h3>
                        <p className="text-muted-foreground text-xs font-bold uppercase relative z-10">
                          {new Date(collection.created_at).toLocaleDateString()}
                        </p>
                        <button
                          onClick={(e) => handleDeleteStudyCollection(collection.id, e, collection.title, "flashcards")}
                          className="absolute bottom-4 right-4 p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-950/30 text-muted-foreground hover:text-red-600 dark:hover:text-red-400 transition-colors z-20"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
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
                      <Loader2 className="h-8 w-8 animate-spin text-foreground" />
                      <p className="text-sm text-muted-foreground font-bold uppercase">{tCommon("loading")}</p>
                    </div>
                  </div>
                ) : quizCollections.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center bg-card border-2 border-dashed border-border rounded-3xl">
                    <div className="w-24 h-24 rounded-full bg-[#BBF7D0] border-2 border-border flex items-center justify-center mb-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
                      <ListChecks className="h-10 w-10 text-foreground" strokeWidth={2.5} />
                    </div>
                    <h3 className="text-2xl font-black uppercase mb-2 text-foreground">{t("noQuiz")}</h3>
                    <p className="text-muted-foreground font-medium max-w-md mb-8">
                      {t("noQuizDesc")}
                    </p>
                    <Button
                      onClick={() => handleOpenGenerationDialog("quiz")}
                      className="h-12 rounded-xl px-8 bg-foreground text-background hover:bg-primary hover:text-primary-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:translate-y-[2px] active:translate-y-[4px] active:shadow-none transition-all border-2 border-border font-black uppercase"
                    >
                      <Sparkles className="h-5 w-5 mr-2" />
                      {t("createQuizNow")}
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {quizCollections.map((collection: any) => (
                      <div
                        key={collection.id}
                        onClick={() => {
                          setSelectedQuizCollection(collection)
                        }}
                        className="group bg-card border-2 border-border rounded-3xl p-6 hover:shadow-[8px_8px_0px_0px_#BBF7D0] dark:hover:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] hover:-translate-y-1 transition-all cursor-pointer relative overflow-hidden shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]"
                      >
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                          <ListChecks className="h-24 w-24 text-foreground" />
                        </div>
                        <div className="flex justify-between items-start mb-4 relative z-10">
                          <div className="w-12 h-12 bg-[#BBF7D0] dark:bg-emerald-950/30 rounded-xl border-2 border-border flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
                            <ListChecks className="h-6 w-6 text-foreground" strokeWidth={2.5} />
                          </div>
                          <span className="bg-foreground text-background px-2 py-1 rounded-lg text-xs font-black uppercase">
                            {collection.quizQuestions?.length || 0} Questions
                          </span>
                        </div>
                        <h3 className="font-black text-xl mb-1 relative z-10 line-clamp-2 uppercase text-foreground">{collection.title}</h3>
                        <p className="text-muted-foreground text-xs font-bold uppercase relative z-10">
                          {new Date(collection.created_at).toLocaleDateString()}
                        </p>
                        <button
                          onClick={(e) => handleDeleteStudyCollection(collection.id, e, collection.title, "quiz")}
                          className="absolute bottom-4 right-4 p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-950/30 text-muted-foreground hover:text-red-600 dark:hover:text-red-400 transition-colors z-20"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Section Resume (Summaries) */}
            {activeTab === "resume" && (
              <div className="space-y-6">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="flex flex-col items-center gap-4">
                      <Loader2 className="h-8 w-8 animate-spin text-black" />
                      <p className="text-sm text-muted-foreground font-bold uppercase">{t("loadingSummaries")}</p>
                    </div>
                  </div>
                ) : totalSummaries === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center bg-card border-2 border-dashed border-border rounded-3xl">
                    <div className="w-24 h-24 rounded-full bg-[#FDE68A] border-2 border-border flex items-center justify-center mb-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
                      <BookOpen className="h-10 w-10 text-foreground" strokeWidth={2.5} />
                    </div>
                    <h3 className="text-2xl font-black uppercase mb-2 text-foreground">{t("noSummaries")}</h3>
                    <p className="text-muted-foreground font-medium max-w-md mb-8">
                      {t("noSummariesDesc")}
                    </p>
                    <Button
                      onClick={() => {
                        handleOpenGenerationDialog("summary")
                      }}
                      className="h-12 rounded-xl px-8 bg-foreground text-background hover:bg-primary hover:text-primary-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:translate-y-[2px] active:translate-y-[4px] active:shadow-none transition-all border-2 border-border font-black uppercase"
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
                        <div className="flex items-center gap-2 pb-2 border-b-2 border-border">
                          <Sparkles className="h-5 w-5 text-foreground fill-[#FDE68A]" />
                          <h3 className="text-sm font-black uppercase tracking-wider text-foreground">{t("collectionSummaries")}</h3>
                        </div>

                        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                          {collectionSummaries.map((summary: any) => (
                            <div
                              key={summary.id}
                              className="group relative flex flex-col bg-card border-2 border-border rounded-3xl p-6 hover:shadow-[8px_8px_0px_0px_#FDE68A] dark:hover:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] hover:-translate-y-1 transition-all cursor-pointer overflow-hidden"
                            >
                              <div className="relative z-10 flex flex-col h-full">
                                <div className="flex items-start justify-between mb-4">
                                  <div className="w-12 h-12 rounded-xl bg-[#FDE68A] border-2 border-border flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
                                    <BookOpen className="h-6 w-6 text-foreground" strokeWidth={2.5} />
                                  </div>
                                  <button
                                    onClick={(e) => handleDeleteStudyCollection(summary.id, e, summary.title, "summary")}
                                    className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                                  >
                                    <Trash2 className="h-5 w-5" />
                                  </button>
                                </div>

                                <h3 className="text-xl font-black text-foreground mb-3 line-clamp-2 uppercase">
                                  {summary.title}
                                </h3>

                                <div className="flex-1 mb-6">
                                  <p className="text-sm text-muted-foreground font-medium leading-relaxed line-clamp-4">
                                    {summary.summary.replace(/#{1,6}\s?/g, '').replace(/\*\*/g, '').replace(/\*/g, '').replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1').replace(/`{3}[\s\S]*?`{3}/g, '').replace(/`([^`]+)`/g, '$1')}
                                  </p>
                                </div>

                                <Button
                                  onClick={() => setSelectedSummary({
                                    ...summary,
                                    isDocumentSummary: false
                                  })}
                                  className="w-full h-10 rounded-xl bg-card text-foreground border-2 border-border hover:bg-accent hover:text-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:translate-y-[2px] active:translate-y-[4px] active:shadow-none transition-all font-bold uppercase"
                                >
                                  {t("readSummary")}
                                  <ArrowRight className="h-4 w-4 ml-2" strokeWidth={3} />
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
                                  <p className="text-sm text-muted-foreground dark:text-gray-100 leading-relaxed line-clamp-4">
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
              studySubjectId={selectedFlashcardCollectionId}
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
            studySubjectId={selectedQuizCollection.id}
            mode="adaptive"
            title={selectedQuizCollection.title}
            onClose={() => setSelectedQuizCollection(null)}
          />
        ) : selectedSummary ? (
          <div className="h-full flex flex-col bg-transparent animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Header du résumé */}
            <div className="flex-shrink-0 border-b-2 border-border bg-card/95 backdrop-blur-xl sticky top-0 z-10">
              <div className="flex items-center justify-between px-6 py-4 max-w-5xl mx-auto w-full">
                <div className="flex items-center gap-4">
                  <Button
                    variant="ghost"
                    onClick={() => setSelectedSummary(null)}
                    size="sm"
                    className="hover:bg-foreground hover:text-background text-foreground rounded-lg w-10 h-10 p-0 border-2 border-transparent hover:border-border transition-all"
                  >
                    <ArrowLeft className="h-5 w-5" strokeWidth={2.5} />
                  </Button>
                  <div>
                    <h2 className="text-xl font-black text-foreground flex items-center gap-3 uppercase">
                      {selectedSummary.title}
                      {selectedSummary.isDocumentSummary && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-[#BAE6FD] text-foreground border-2 border-border">
                          {selectedSummary.documentTitle}
                        </span>
                      )}
                    </h2>
                    <p className="text-xs font-bold text-muted-foreground uppercase">
                      {selectedSummary.createdAt ? new Date(selectedSummary.createdAt).toLocaleDateString() : t("aiGeneratedSummary")}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contenu du résumé */}
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-background">
              <div className="max-w-3xl mx-auto px-6 py-12">
                <div className="bg-card border-2 border-border rounded-3xl p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] relative">
                  {/* Decorative elements */}
                  <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
                    <BookOpen className="h-32 w-32 text-foreground" />
                  </div>

                  <div className="prose max-w-none prose-headings:font-black prose-headings:uppercase prose-headings:text-foreground prose-p:text-muted-foreground prose-p:leading-relaxed prose-p:font-medium prose-li:text-muted-foreground prose-strong:text-foreground prose-strong:font-black prose-code:text-primary prose-code:bg-primary/10 prose-code:border prose-code:border-primary/20 prose-code:rounded-md prose-code:px-1 prose-code:before:content-none prose-code:after:content-none dark:prose-invert">
                    <div className="flex items-center gap-2 mb-8 pb-4 border-b-2 border-border">
                      <div className="w-10 h-10 rounded-lg bg-accent border-2 border-border flex items-center justify-center">
                        <Sparkles className="h-5 w-5 text-foreground" />
                      </div>
                      <span className="text-sm font-black uppercase tracking-widest text-muted-foreground">Résumé généré par IA</span>
                    </div>
                    <MarkdownRenderer content={selectedSummary.summary} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null
        }
      </div >
      {/* Suggestions de prompts rapides - Cachées quand le chat est ouvert OU dans les onglets FC/Quiz/Résumés */}
      <AnimatePresence mode="wait">
        {!showChatInput && activeTab === "pdf" && (
          <motion.div
            key="action-buttons"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="mb-6 flex justify-center z-20 relative"
          >
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleOpenGenerationDialog("flashcards")}
                        className="px-6 py-4 text-sm font-black uppercase rounded-2xl bg-card border-2 border-border hover:bg-secondary hover:text-secondary-foreground transition-all flex items-center gap-3 text-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] hover:-translate-y-1 active:translate-y-0 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:active:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
              >
                <Brain className="h-5 w-5" strokeWidth={2.5} />
                {t("generateFlashcards")}
              </button>
              <button
                onClick={() => handleOpenGenerationDialog("quiz")}
                        className="px-6 py-4 text-sm font-black uppercase rounded-2xl bg-card border-2 border-border hover:bg-[#BBF7D0] hover:text-foreground transition-all flex items-center gap-3 text-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] hover:-translate-y-1 active:translate-y-0 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:active:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
              >
                <ListChecks className="h-5 w-5" strokeWidth={2.5} />
                {t("generateQuiz")}
              </button>
              <button
                onClick={() => handleOpenGenerationDialog("summary")}
                        className="px-6 py-4 text-sm font-black uppercase rounded-2xl bg-card border-2 border-border hover:bg-accent hover:text-foreground transition-all flex items-center gap-3 text-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] hover:-translate-y-1 active:translate-y-0 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:active:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
              >
                <FileText className="h-5 w-5" strokeWidth={2.5} />
                {t("summarize")}
              </button>

              <div className="w-px h-8 bg-black/20 mx-2"></div>

              <button
                onClick={() => setShowChatInput(!showChatInput)}
                  className={cn(
                  "p-4 rounded-2xl border-2 border-border transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] hover:-translate-y-1 active:translate-y-0 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:active:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]",
                  showChatInput
                    ? "bg-foreground text-background hover:bg-foreground/90"
                    : "bg-card text-muted-foreground hover:bg-foreground hover:text-background"
                )}
                title={t("conversationalAssistant")}
              >
                <MessageSquare className="h-5 w-5" strokeWidth={2.5} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Chat Input - Interface conversationnelle simplifiée */}
      <AnimatePresence>
        {showChatInput && (
          <motion.div
            key="chat-window"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed bottom-6 right-6 z-50"
          >
            <div className="w-[420px] bg-card border-2 border-border rounded-2xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] overflow-hidden flex flex-col max-h-[600px]">
              {/* Header simplifié */}
              <div className="flex justify-between items-center px-5 py-3 border-b-2 border-border bg-card">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary border-2 border-border flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
                  </div>
                  <span className="text-sm font-black uppercase text-foreground">Assistant IA</span>
                </div>
                <button
                  onClick={() => setShowChatInput(false)}
                  className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
                >
                  <X className="h-4 w-4 text-foreground" strokeWidth={2.5} />
                </button>
              </div>

              {/* Zone de messages - Améliorée */}
              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-6 space-y-4 min-h-[300px] bg-gradient-to-b from-card to-muted/30"
              >
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center py-10">
                    <div className="w-16 h-16 rounded-xl bg-primary/20 border-2 border-border flex items-center justify-center mb-3">
                      <Sparkles className="h-8 w-8 text-primary" strokeWidth={2} />
                    </div>
                    <h4 className="text-sm font-bold text-foreground mb-1">Posez votre question</h4>
                    <p className="text-xs text-muted-foreground max-w-xs">Discutez avec l'assistant pour mieux comprendre vos documents</p>
                  </div>
                ) : (
                  messages.map((msg, i) => (
                    <div key={i} className={cn("flex w-full gap-3", msg.role === 'user' ? "justify-end" : "justify-start")}>
                      {msg.role === 'assistant' && (
                        <div className="w-8 h-8 rounded-lg bg-primary border-2 border-border flex items-center justify-center flex-shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
                          <Sparkles className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
                        </div>
                      )}
                      <div className={cn(
                        "max-w-[75%] rounded-2xl px-4 py-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.1)]",
                        msg.role === 'user'
                          ? "bg-foreground text-background rounded-br-md border-2 border-border"
                          : "bg-card border-2 border-border text-foreground rounded-bl-md"
                      )}>
                        <div className={cn(
                          "prose prose-sm max-w-none",
                          msg.role === 'user'
                            ? "prose-invert prose-p:text-background prose-headings:text-background prose-strong:text-background"
                            : "prose-p:text-foreground prose-headings:text-foreground prose-strong:text-foreground"
                        )}>
                          <MarkdownRenderer content={msg.content} />
                        </div>
                      </div>
                      {msg.role === 'user' && (
                        <div className="w-8 h-8 rounded-lg bg-foreground border-2 border-border flex items-center justify-center flex-shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
                          <span className="text-background text-xs font-black">U</span>
                        </div>
                      )}
                    </div>
                  ))
                )}
                {isSending && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
                  <div className="flex justify-start">
                    <div className="bg-card border-2 border-border rounded-xl px-4 py-2.5 flex items-center gap-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" strokeWidth={2.5} />
                      <span className="text-xs font-medium text-muted-foreground">Réflexion...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Input simplifié */}
              <div className="p-3 border-t-2 border-border bg-card">
                <MentionInput
                  value={chatInput}
                  onChange={setChatInput}
                  onSend={() => handleSendMessage(undefined, undefined, undefined, 'conversation')}
                  onUpload={() => setIsUploadOpen(true)}
                  disabled={isSending}
                  isLoading={isSending}
                  placeholder="Tapez votre message..."
                  documents={documents.map((doc: any) => ({
                    id: doc.id,
                    title: doc.title,
                    filename: doc.filename,
                  }))}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {
        isUploadOpen && (
          <UploadDialog
            open={isUploadOpen}
            onOpenChange={setIsUploadOpen}
            subjectId={subject.id}
            subjectTitle={subject.title}
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
    </div >
  )
}
