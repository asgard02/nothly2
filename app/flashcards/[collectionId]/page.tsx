"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Layers,
  Loader2,
  Sparkles,
  Tag as TagIcon,
  ListChecks,
  Trash2,
} from "lucide-react"

import Sidebar from "@/components/Sidebar"
import ChatButton from "@/components/ChatButton"
import MarkdownRenderer from "@/components/MarkdownRenderer"
import { useCollectionDetail, useDeleteCollection } from "@/lib/hooks/useCollections"
import type { StudyCollectionFlashcard, StudyCollectionQuizQuestion } from "@/lib/hooks/useCollections"
import { cn } from "@/lib/utils"
import DeleteCollectionDialog from "@/components/DeleteCollectionDialog"

// --- Helpers ---------------------------------------------------------------

function classNames(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ")
}

function Tag({ tone = "success", children }: { tone?: "success" | "warning" | "neutral"; children: React.ReactNode }) {
  const toneMap: Record<string, string> = {
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    neutral: "bg-neutral-50 text-neutral-700 border-neutral-200",
  }

  return (
    <span className={classNames("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs", toneMap[tone])}>
      {children}
    </span>
  )
}

function PillButton({
  children,
  onClick,
  disabled,
  tone = "primary",
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  tone?: "primary" | "ghost" | "danger" | "success"
}) {
  const base =
    "inline-flex items-center justify-center rounded-xl px-3.5 py-2 text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
  const tones: Record<string, string> = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50",
    ghost: "bg-white/70 border border-white/60 hover:bg-white disabled:opacity-50",
    danger: "bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50",
    success: "bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50",
  }

  return (
    <button className={classNames(base, tones[tone])} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  )
}

// --- Components ------------------------------------------------------------

type FlashcardState = "review" | "learning" | "mastered"

function Flashcard({
  card,
  onRate
}: {
  card: StudyCollectionFlashcard
  onRate: (status: FlashcardState) => void
}) {
  const [flipped, setFlipped] = useState(false)

  // Reset flip state when card changes
  useEffect(() => {
    setFlipped(false)
  }, [card.id])

  return (
    <div className="flex flex-col items-center gap-8 w-full max-w-2xl mx-auto">
      <div className="[perspective:1000px] w-full select-none group">
        <button
          aria-label="Retourner la carte"
          aria-pressed={flipped}
          onClick={() => setFlipped((value) => !value)}
          className="relative h-80 w-full rounded-3xl border border-white/60 bg-white shadow-xl shadow-slate-200/50 transition-all hover:shadow-2xl hover:shadow-slate-200/60 outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30"
          style={{ transformStyle: "preserve-3d", transition: "transform .6s cubic-bezier(.4,0,.2,1)", transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
        >
          {/* Front */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center p-10 text-center"
            style={{ backfaceVisibility: "hidden", transform: "rotateY(0deg)" }}
          >
            <span className="mb-6 inline-flex items-center justify-center rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-blue-600">
              Question
            </span>
            <div className="prose prose-lg prose-slate max-w-none line-clamp-[8]">
              <MarkdownRenderer content={card.question} />
            </div>
          </div>

          {/* Back */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center p-10 text-center bg-slate-50/50"
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
          >
            <span className="mb-6 inline-flex items-center justify-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-600">
              Réponse
            </span>
            <div className="prose prose-lg prose-slate max-w-none overflow-y-auto max-h-[200px]">
              <MarkdownRenderer content={card.answer} />
            </div>
          </div>
        </button>
      </div>

      {/* Controls - Only visible when flipped */}
      <div className={cn("flex items-center gap-4 transition-all duration-500", flipped ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none")}>
        <button
          onClick={() => onRate("review")}
          className="flex flex-col items-center gap-1.5 rounded-2xl border border-rose-100 bg-rose-50 px-6 py-3 text-rose-700 transition hover:bg-rose-100 hover:scale-105 active:scale-95"
        >
          <span className="font-bold">À revoir</span>
          <span className="text-[10px] uppercase tracking-wide opacity-70">Difficile</span>
        </button>

        <button
          onClick={() => onRate("learning")}
          className="flex flex-col items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-6 py-3 text-slate-700 transition hover:bg-slate-50 hover:scale-105 active:scale-95"
        >
          <span className="font-bold">Correct</span>
          <span className="text-[10px] uppercase tracking-wide opacity-70">Moyen</span>
        </button>

        <button
          onClick={() => onRate("mastered")}
          className="flex flex-col items-center gap-1.5 rounded-2xl border border-emerald-100 bg-emerald-50 px-6 py-3 text-emerald-700 transition hover:bg-emerald-100 hover:scale-105 active:scale-95"
        >
          <span className="font-bold">Facile</span>
          <span className="text-[10px] uppercase tracking-wide opacity-70">Acquis</span>
        </button>
      </div>

      {!flipped && (
        <p className="text-sm text-slate-400 animate-pulse">
          Appuyez sur Espace pour retourner
        </p>
      )}
    </div>
  )
}

type QuizOption = {
  id: string
  label: string
  isCorrect: boolean
  explanation?: string | null
}

interface QuizItem {
  id: string
  prompt: string
  options: QuizOption[]
}

function buildQuizOptions(question: StudyCollectionQuizQuestion): QuizOption[] {
  if (question.options && question.options.length) {
    return question.options.map((label, index) => ({
      id: `${question.id}-opt-${index}`,
      label,
      isCorrect: label.trim().toLowerCase() === question.answer.trim().toLowerCase(),
      explanation: question.explanation,
    }))
  }

  if (question.question_type === "true_false") {
    return [
      { id: `${question.id}-true`, label: "Vrai", isCorrect: question.answer.trim().toLowerCase() === "vrai", explanation: question.explanation },
      { id: `${question.id}-false`, label: "Faux", isCorrect: question.answer.trim().toLowerCase() === "faux", explanation: question.explanation },
    ]
  }

  return [
    { id: `${question.id}-answer`, label: question.answer, isCorrect: true, explanation: question.explanation },
    { id: `${question.id}-unknown`, label: "Je ne sais pas", isCorrect: false, explanation: question.explanation },
  ]
}

function QuizBlock({ item, onNext }: { item: QuizItem; onNext: () => void }) {
  const [chosen, setChosen] = useState<string | null>(null)

  const feedback = useMemo(() => {
    if (!chosen) return null
    const opt = item.options.find((o) => o.id === chosen)
    if (!opt) return null
    return { ok: opt.isCorrect, message: opt.explanation ?? (opt.isCorrect ? "✅ Correct !" : "❌ Incorrect."), id: opt.id }
  }, [chosen, item.options])

  return (
    <div className="rounded-3xl border border-white/60 bg-white/80 p-8 shadow-sm max-w-2xl mx-auto">
      <h3 className="text-lg font-medium leading-relaxed text-slate-900">
        <MarkdownRenderer content={item.prompt} />
      </h3>
      <div className="mt-8 grid gap-3">
        {item.options.map((option) => {
          const state = !chosen
            ? "hover:bg-slate-50 hover:border-slate-300 border-slate-200 bg-white"
            : option.id === chosen && option.isCorrect
              ? "bg-emerald-50 border-emerald-400 border-2 text-emerald-900"
              : option.id === chosen && !option.isCorrect
                ? "bg-rose-50 border-rose-400 border-2 text-rose-900"
                : "opacity-50 border-slate-200 bg-slate-50"

          return (
            <button
              key={option.id}
              disabled={Boolean(chosen)}
              onClick={() => setChosen(option.id)}
              className={classNames(
                "rounded-xl border px-6 py-4 text-left text-base transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 w-full",
                state
              )}
            >
              <div className="[&_.prose]:max-w-none [&_.prose]:m-0 [&_.katex]:text-lg [&_.katex-display]:text-lg [&_.katex-display]:my-2 [&_span.katex]:inline-block">
                <MarkdownRenderer content={option.label} />
              </div>
            </button>
          )
        })}
      </div>
      {feedback && (
        <div className={classNames("mt-6 rounded-xl p-4 text-sm", feedback.ok ? "bg-emerald-50 text-emerald-800 border border-emerald-100" : "bg-rose-50 text-rose-800 border border-rose-100")}>
          <p className="font-semibold mb-1">{feedback.ok ? "Bien joué !" : "Pas tout à fait..."}</p>
          <div className="[&_.prose]:max-w-none [&_.prose]:m-0 [&_.katex]:text-sm [&_.katex-display]:my-1">
            <MarkdownRenderer content={feedback.message} />
          </div>
        </div>
      )}
      <div className="mt-8 flex justify-end">
        <PillButton tone="primary" disabled={!feedback} onClick={onNext}>
          Question suivante
        </PillButton>
      </div>
    </div>
  )
}

// --- Page ------------------------------------------------------------------

export default function CollectionDetailPage() {
  const params = useParams<{ collectionId: string }>()
  const router = useRouter()
  const collectionId = params?.collectionId ?? ""

  const { data: collectionDetail, isLoading, error } = useCollectionDetail(collectionId)
  const deleteCollection = useDeleteCollection()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const flashcards = useMemo<StudyCollectionFlashcard[]>(() => {
    if (!collectionDetail?.flashcards) return []
    return [...collectionDetail.flashcards].sort((a, b) => a.order_index - b.order_index)
  }, [collectionDetail?.flashcards])

  const quizItems = useMemo<QuizItem[]>(() => {
    if (!collectionDetail?.quiz) return []
    return [...collectionDetail.quiz]
      .sort((a, b) => a.order_index - b.order_index)
      .map((question) => ({
        id: question.id,
        prompt: question.prompt,
        options: buildQuizOptions(question),
      }))
  }, [collectionDetail?.quiz])

  const [activeTab, setActiveTab] = useState<"flashcards" | "quiz">("flashcards")
  const [fcIndex, setFcIndex] = useState(0)
  const [flashcardStates, setFlashcardStates] = useState<Record<string, FlashcardState>>({})
  const [qIndex, setQIndex] = useState(0)

  useEffect(() => {
    if (!collectionDetail) return
    setFcIndex(0)
    setQIndex(0)
    setActiveTab(flashcards.length ? "flashcards" : quizItems.length ? "quiz" : "flashcards")
    setFlashcardStates((prev) => {
      const next: Record<string, FlashcardState> = {}
      flashcards.forEach((card) => {
        next[card.id] = prev[card.id] ?? "review"
      })
      return next
    })
  }, [collectionDetail?.id, flashcards.length, quizItems.length])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (activeTab !== "flashcards" || flashcards.length === 0) return
      if (event.key === " " && document.activeElement?.tagName !== "BUTTON") {
        event.preventDefault()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [activeTab, flashcards.length])

  const handleDelete = () => {
    if (!collectionId) return
    deleteCollection.mutate(collectionId, {
      onSuccess: () => {
        router.push("/flashcards")
      },
      onError: (error) => {
        console.error("Erreur lors de la suppression:", error)
        alert("Erreur lors de la suppression de la collection")
      },
    })
  }

  const currentFlashcard = flashcards[fcIndex]
  const currentQuiz = quizItems[qIndex]

  const showFlashcards = flashcards.length > 0
  const showQuiz = quizItems.length > 0

  const handleMarkFlashcard = (status: FlashcardState) => {
    if (!currentFlashcard) return
    setFlashcardStates((prev) => ({
      ...prev,
      [currentFlashcard.id]: status,
    }))

    if (fcIndex < flashcards.length - 1) {
      setTimeout(() => {
        setFcIndex(prev => prev + 1)
      }, 200)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !collectionDetail) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex items-start gap-3 rounded-2xl border border-destructive/20 bg-destructive/10 px-5 py-4 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4" />
          Impossible de charger cette collection. Réessaie dans quelques instants.
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="ml-56 flex-1 overflow-y-auto bg-slate-50/50">
        <div className="mx-auto max-w-4xl px-6 py-10">

          {/* Header Navigation */}
          <div className="mb-8 flex items-center justify-between">
            <button
              onClick={() => router.push("/flashcards")}
              className="group flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white border border-slate-200 shadow-sm transition-colors group-hover:border-slate-300">
                <ArrowLeft className="h-4 w-4" />
              </div>
              Retour aux collections
            </button>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-full bg-white border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm">
                <span className={cn("h-2 w-2 rounded-full",
                  collectionDetail.status === "ready" ? "bg-emerald-500" :
                    collectionDetail.status === "failed" ? "bg-rose-500" : "bg-amber-500 animate-pulse"
                )} />
                {collectionDetail.status === "ready" ? "Prêt" : collectionDetail.status === "failed" ? "Erreur" : "Génération..."}
              </div>

              <button
                onClick={() => setShowDeleteDialog(true)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white border border-slate-200 text-slate-400 shadow-sm transition-all hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                title="Supprimer la collection"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Title & Controls */}
          <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-3">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">{collectionDetail.title}</h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-blue-500" />
                  {collectionDetail.total_flashcards} cartes
                </span>
                <span className="h-1 w-1 rounded-full bg-slate-300" />
                <span className="flex items-center gap-1.5">
                  <ListChecks className="h-4 w-4 text-purple-500" />
                  {collectionDetail.total_quiz} questions
                </span>
                {collectionDetail.tags && collectionDetail.tags.length > 0 && (
                  <>
                    <span className="h-1 w-1 rounded-full bg-slate-300" />
                    <div className="flex gap-1">
                      {collectionDetail.tags.map(tag => (
                        <span key={tag} className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex rounded-xl bg-slate-200/60 p-1">
              <button
                onClick={() => setActiveTab("flashcards")}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
                  activeTab === "flashcards"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                )}
              >
                <Layers className="h-4 w-4" />
                Flashcards
              </button>
              <button
                onClick={() => setActiveTab("quiz")}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
                  activeTab === "quiz"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                )}
              >
                <ListChecks className="h-4 w-4" />
                Quiz
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-10">
            <div className="flex items-center justify-between mb-2 text-xs font-medium text-slate-500">
              <span>Progression</span>
              <span>
                {activeTab === "flashcards"
                  ? `${Math.round(((fcIndex + 1) / Math.max(flashcards.length, 1)) * 100)}%`
                  : `${Math.round(((qIndex + 1) / Math.max(quizItems.length, 1)) * 100)}%`
                }
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={cn("h-full transition-all duration-500 ease-out rounded-full",
                  activeTab === "flashcards" ? "bg-blue-500" : "bg-purple-500"
                )}
                style={{
                  width: activeTab === "flashcards"
                    ? `${((fcIndex + 1) / Math.max(flashcards.length, 1)) * 100}%`
                    : `${((qIndex + 1) / Math.max(quizItems.length, 1)) * 100}%`
                }}
              />
            </div>
          </div>

          {/* Content Area */}
          <div className="min-h-[400px]">
            {activeTab === "flashcards" ? (
              showFlashcards ? (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <Flashcard
                    card={currentFlashcard}
                    onRate={handleMarkFlashcard}
                  />
                  <div className="mt-8 flex justify-center">
                    <button
                      onClick={() => setFcIndex(0)}
                      className="text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      Recommencer depuis le début
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex h-64 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50/50 text-center">
                  <Layers className="h-10 w-10 text-slate-300 mb-3" />
                  <p className="text-slate-500 font-medium">Encore aucune flashcard générée</p>
                  <p className="text-sm text-slate-400">Reviens plus tard une fois la génération terminée.</p>
                </div>
              )
            ) : showQuiz ? (
              <div className="mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                {currentQuiz ? (
                  <QuizBlock
                    key={currentQuiz.id}
                    item={currentQuiz}
                    onNext={() => setQIndex((index) => Math.min(index + 1, quizItems.length - 1))}
                  />
                ) : null}
              </div>
            ) : (
              <div className="flex h-64 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50/50 text-center">
                <ListChecks className="h-10 w-10 text-slate-300 mb-3" />
                <p className="text-slate-500 font-medium">Aucune question disponible</p>
              </div>
            )}
          </div>
        </div>
      </main>
      <ChatButton />

      <DeleteCollectionDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={() => {
          setShowDeleteDialog(false)
          handleDelete()
        }}
        collectionTitle={collectionDetail.title}
        isDeleting={deleteCollection.isPending}
      />
    </div>
  )
}
