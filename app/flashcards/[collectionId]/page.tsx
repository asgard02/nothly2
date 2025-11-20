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
} from "lucide-react"

import Sidebar from "@/components/Sidebar"
import ChatButton from "@/components/ChatButton"
import MarkdownRenderer from "@/components/MarkdownRenderer"
import { useCollectionDetail } from "@/lib/hooks/useCollections"
import type { StudyCollectionFlashcard, StudyCollectionQuizQuestion } from "@/lib/hooks/useCollections"
import { cn } from "@/lib/utils"
import SidebarPanel from "./SidebarPanel"

// --- Helpers ---------------------------------------------------------------

function classNames(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ")
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[11px] uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-neutral-900">{value}</p>
    </div>
  )
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

function Flashcard({ card }: { card: StudyCollectionFlashcard }) {
  const [flipped, setFlipped] = useState(false)

  return (
    <div className="[perspective:1000px] mx-auto w-full max-w-2xl select-none">
      <button
        aria-label="Retourner la carte"
        aria-pressed={flipped}
        onClick={() => setFlipped((value) => !value)}
        className="relative h-56 w-full rounded-2xl border border-white/60 bg-white/80 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        style={{ transformStyle: "preserve-3d", transition: "transform .55s cubic-bezier(.2,.8,.2,1)", transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
      >
        <div
          className="absolute inset-0 grid place-items-center px-6 text-center text-lg font-medium leading-relaxed"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(0deg)" }}
        >
          <MarkdownRenderer content={card.question} />
        </div>
        <div
          className="absolute inset-0 grid place-items-center px-6 text-center text-lg font-medium leading-relaxed"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <MarkdownRenderer content={card.answer} />
        </div>
      </button>
      <p className="mt-2 text-center text-xs text-neutral-500">Astuce : barre espace pour retourner • ← / → pour naviguer</p>
    </div>
  )
}

type FlashcardState = "review" | "learning" | "mastered"

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
    <div className="rounded-2xl border border-white/60 bg-white/80 p-5 shadow-sm">
      <h3 className="text-base font-semibold">
        <MarkdownRenderer content={item.prompt} />
      </h3>
      <div className="mt-6 grid gap-3">
        {item.options.map((option) => {
          const state = !chosen
            ? "hover:bg-slate-50 hover:border-slate-300 border-slate-200 bg-white"
            : option.id === chosen && option.isCorrect
            ? "bg-emerald-50 border-emerald-400 border-2"
            : option.id === chosen && !option.isCorrect
            ? "bg-rose-50 border-rose-400 border-2"
            : "opacity-60 border-slate-200"
          return (
            <button
              key={option.id}
              disabled={Boolean(chosen)}
              onClick={() => setChosen(option.id)}
              className={classNames(
                "rounded-xl border px-5 py-4 text-left text-base font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 w-full",
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
        <p className={classNames("mt-3 text-sm", feedback.ok ? "text-emerald-600" : "text-rose-600")}>{feedback.message}</p>
      )}
      <div className="mt-4 flex justify-end">
        <PillButton tone="primary" disabled={!feedback} onClick={onNext}>
          Suivant
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionDetail?.id, flashcards.length, quizItems.length]) // Utiliser seulement les IDs et longueurs pour éviter les re-renders excessifs

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (activeTab !== "flashcards" || flashcards.length === 0) return
      if (event.key === "ArrowRight") {
        event.preventDefault()
        setFcIndex((index) => Math.min(index + 1, flashcards.length - 1))
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault()
        setFcIndex((index) => Math.max(index - 1, 0))
      }
      if (event.key === " ") {
        event.preventDefault()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [activeTab, flashcards.length])

  const currentFlashcard = flashcards[fcIndex]
  const currentQuiz = quizItems[qIndex]

  const masteredCount = flashcards.reduce((total, card) => (flashcardStates[card.id] === "mastered" ? total + 1 : total), 0)
  const reviewCount = flashcards.reduce((total, card) => (flashcardStates[card.id] === "review" ? total + 1 : total), 0)
  const progress = flashcards.length ? Math.round(((fcIndex + 1) / flashcards.length) * 100) : 0


  const showFlashcards = flashcards.length > 0
  const showQuiz = quizItems.length > 0

  const handleMarkFlashcard = (status: FlashcardState) => {
    if (!currentFlashcard) return
    setFlashcardStates((prev) => ({
      ...prev,
      [currentFlashcard.id]: status,
    }))
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
      <main className="ml-64 flex-1 overflow-y-auto bg-muted/20">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <div className="grid grid-cols-12 gap-6">
            {/* Sidebar */}
            <SidebarPanel collection={collectionDetail} activeTab={activeTab} onTabChange={setActiveTab} reviewCount={reviewCount} />

            {/* Main content */}
            <section className="col-span-12 md:col-span-9 pt-2">
              <div className="rounded-2xl border border-white/60 bg-white/70 p-5 shadow-sm space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div>
                    <h1 className="text-xl font-semibold">{collectionDetail.title}</h1>
                    <p className="text-sm text-neutral-600">
                      {collectionDetail.total_flashcards} flashcards • {collectionDetail.total_quiz} questions
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <PillButton tone="ghost" onClick={() => setFcIndex(0)} disabled={!showFlashcards}>
                      Mélanger
                    </PillButton>
                    <PillButton tone="primary" disabled>
                      Exporter
                    </PillButton>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <StatCard label="Progression" value={showFlashcards ? `${progress}%` : "—"} />
                  <StatCard label="Acquis" value={showFlashcards ? masteredCount : "—"} />
                  <StatCard label="À revoir" value={showFlashcards ? reviewCount : "—"} />
                </div>
              </div>

              <div className="mt-6">
                {activeTab === "flashcards" ? (
                  showFlashcards ? (
                    <div className="grid gap-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-neutral-600">
                          Carte <span className="font-medium">{fcIndex + 1}</span> / {flashcards.length}
                        </p>
                        <div className="flex items-center gap-2">
                          <PillButton tone="ghost" onClick={() => setFcIndex((index) => Math.max(index - 1, 0))}>
                            Précédent
                          </PillButton>
                          <PillButton tone="ghost" onClick={() => setFcIndex((index) => Math.min(index + 1, flashcards.length - 1))}>
                            Suivant
                          </PillButton>
                        </div>
                      </div>

                      {currentFlashcard ? <Flashcard card={currentFlashcard} /> : null}

                      <div className="mx-auto flex max-w-2xl items-center justify-center gap-2">
                        <PillButton tone="danger" onClick={() => handleMarkFlashcard("review")}>À revoir</PillButton>
                        <PillButton tone="ghost" onClick={() => handleMarkFlashcard("learning")}>En cours</PillButton>
                        <PillButton tone="success" onClick={() => handleMarkFlashcard("mastered")}>Acquis</PillButton>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-3xl border border-dashed border-white/60 bg-white/70 p-6 text-sm text-neutral-500">
                      Encore aucune flashcard générée. Reviens plus tard une fois la génération terminée.
                    </div>
                  )
                ) : showQuiz ? (
                  <div className="grid gap-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-neutral-600">
                        Question <span className="font-medium">{qIndex + 1}</span> / {quizItems.length}
                      </p>
                      <div className="flex items-center gap-2">
                        <PillButton tone="ghost" onClick={() => setQIndex((index) => Math.max(index - 1, 0))}>
                          Précédent
                        </PillButton>
                        <PillButton tone="ghost" onClick={() => setQIndex((index) => Math.min(index + 1, quizItems.length - 1))}>
                          Suivant
                        </PillButton>
                      </div>
                    </div>

                    {currentQuiz ? (
                      <QuizBlock
                        key={currentQuiz.id}
                        item={currentQuiz}
                        onNext={() => setQIndex((index) => Math.min(index + 1, quizItems.length - 1))}
                      />
                    ) : null}
                  </div>
                ) : (
                  <div className="rounded-3xl border border-dashed border-white/60 bg-white/70 p-6 text-sm text-neutral-500">
                    Aucune question disponible pour l’instant.
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>
      <ChatButton />
    </div>
  )
}
