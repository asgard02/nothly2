"use client"

import { useEffect, useMemo, useState } from "react"
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDashed,
  Eye,
  EyeOff,
  Flag,
  Target,
  XCircle,
} from "lucide-react"

import MarkdownRenderer from "@/components/MarkdownRenderer"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type QuizQuestionType = "multiple_choice" | "true_false" | "completion"

export interface QuizQuestionItem {
  id: string
  question_type: QuizQuestionType
  prompt: string
  options: string[] | null
  answer: string
  explanation: string | null
  tags: string[]
  order_index: number
}

type QuizQuestionStatus = "pending" | "correct" | "incorrect" | "flagged"

const QUIZ_STATUS_META: Record<
  QuizQuestionStatus,
  {
    label: string
    description: string
    badge: string
    progress: string
    icon: typeof CircleDashed | typeof CheckCircle2 | typeof XCircle | typeof Flag
  }
> = {
  pending: {
    label: "À faire",
    description: "Questions non traitées",
    badge: "border-slate-200 bg-slate-50 text-slate-700",
    progress: "bg-slate-400",
    icon: CircleDashed,
  },
  correct: {
    label: "Réussies",
    description: "Réponses validées",
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
    progress: "bg-emerald-500",
    icon: CheckCircle2,
  },
  incorrect: {
    label: "À retravailler",
    description: "Réponses erronées",
    badge: "border-rose-200 bg-rose-50 text-rose-600",
    progress: "bg-rose-500",
    icon: XCircle,
  },
  flagged: {
    label: "À revoir",
    description: "Questions marquées pour révision",
    badge: "border-amber-200 bg-amber-50 text-amber-700",
    progress: "bg-amber-500",
    icon: Flag,
  },
}

interface QuizViewerProps {
  questions: QuizQuestionItem[]
}

export default function QuizViewer({ questions }: QuizViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [revealAnswer, setRevealAnswer] = useState(false)
  const [questionStatuses, setQuestionStatuses] = useState<Record<string, QuizQuestionStatus>>({})

  const current = questions[currentIndex]

  useEffect(() => {
    setCurrentIndex(0)
    setSelectedOption(null)
    setRevealAnswer(false)
    setQuestionStatuses((prev) => {
      const next: Record<string, QuizQuestionStatus> = {}
      questions.forEach((question) => {
        next[question.id] = prev[question.id] ?? "pending"
      })
      return next
    })
  }, [questions])

  useEffect(() => {
    setSelectedOption(null)
    setRevealAnswer(false)
  }, [currentIndex])

  const progressLabel = useMemo(() => `Question ${currentIndex + 1} / ${questions.length}`, [currentIndex, questions.length])

  const indexById = useMemo(
    () =>
      questions.reduce<Record<string, number>>((accumulator, question, index) => {
        accumulator[question.id] = index
        return accumulator
      }, {}),
    [questions]
  )

  const statusCounts = useMemo(() => {
    const counts: Record<QuizQuestionStatus, number> = {
      pending: 0,
      correct: 0,
      incorrect: 0,
      flagged: 0,
    }
    for (const question of questions) {
      const status = questionStatuses[question.id] ?? "pending"
      counts[status] += 1
    }
    return counts
  }, [questionStatuses, questions])

  const answeredCount = questions.length - statusCounts.pending
  const accuracyPercent = answeredCount ? Math.round((statusCounts.correct / answeredCount) * 100) : 0
  const progressPercent = questions.length ? Math.round((answeredCount / questions.length) * 100) : 0

  const currentStatus: QuizQuestionStatus = current ? questionStatuses[current.id] ?? "pending" : "pending"
  const currentStatusMeta = QUIZ_STATUS_META[currentStatus]

  const summaryCards = useMemo(
    () => [
      {
        id: "answered",
        label: "Questions traitées",
        value: answeredCount.toString(),
        description: `${questions.length} au total`,
        icon: Target,
      },
      {
        id: "accuracy",
        label: "Taux de réussite",
        value: `${accuracyPercent}%`,
        description: `${statusCounts.correct} bonnes réponses`,
        icon: CheckCircle2,
      },
      {
        id: "follow-up",
        label: "À suivre",
        value: (statusCounts.flagged + statusCounts.incorrect).toString(),
        description: `${statusCounts.flagged} marquées • ${statusCounts.incorrect} incorrectes`,
        icon: Flag,
      },
    ],
    [accuracyPercent, answeredCount, questions.length, statusCounts.correct, statusCounts.flagged, statusCounts.incorrect]
  )

  const normalisedOptions = useMemo(() => {
    if (current?.question_type === "multiple_choice" && Array.isArray(current.options)) {
      return current.options
    }
    if (current?.question_type === "true_false") {
      return ["Vrai", "Faux"]
    }
    return []
  }, [current])

  if (!questions.length) {
    return null
  }

  const handleMarkStatus = (questionId: string, status: QuizQuestionStatus) => {
    setQuestionStatuses((prev) => ({
      ...prev,
      [questionId]: status,
    }))
  }

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % questions.length)
  }

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + questions.length) % questions.length)
  }

  const handleReveal = () => {
    setRevealAnswer(true)
    if (!current) return
    if (normalisedOptions.length > 0 && selectedOption !== null) {
      const selectedValue = normalisedOptions[selectedOption]
      if (selectedValue) {
        handleMarkStatus(current.id, isOptionCorrect(selectedValue) ? "correct" : "incorrect")
      }
    }
  }

  const handleSelectQuestion = (questionId: string) => {
    const index = indexById[questionId]
    if (typeof index === "number") {
      setCurrentIndex(index)
    }
  }

  const isOptionCorrect = (option: string) => {
    return option.trim().toLowerCase() === current.answer.trim().toLowerCase()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-5 rounded-3xl border border-border/60 bg-background/60 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/60">Tableau de progression</p>
            <h3 className="text-lg font-semibold text-foreground">Quiz en direct</h3>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-muted/20 px-3 py-1 text-xs font-medium text-muted-foreground">
            <Target className="h-3 w-3" />
            {progressLabel}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {summaryCards.map((card) => (
            <div key={card.id} className="rounded-2xl border border-border/50 bg-card/70 p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-muted/40">
                  <card.icon className="h-4 w-4 text-primary" />
                </span>
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground/70">{card.label}</p>
                  <p className="text-xl font-semibold text-foreground">{card.value}</p>
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{card.description}</p>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Progression du quiz</span>
            <span>{progressPercent}% terminé</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-border/50">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-5 rounded-3xl border border-border/60 bg-background/80 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-muted/20 px-3 py-1 text-xs font-medium text-muted-foreground">
            <Target className="h-3 w-3" />
            {progressLabel}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handlePrevious} className="rounded-full">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleNext} className="rounded-full">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button
              type="button"
              variant={revealAnswer ? "secondary" : "ghost"}
              size="sm"
              onClick={handleReveal}
              className="gap-1 rounded-full"
            >
              {revealAnswer ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {revealAnswer ? "Masquer la réponse" : "Afficher la réponse"}
            </Button>
          </div>
        </div>

        {current ? (
          <div className="rounded-2xl border border-border/70 bg-card/80 p-6">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs uppercase tracking-wide text-muted-foreground/70">
              <span>
                {current.question_type === "multiple_choice"
                  ? "Question à choix multiples"
                  : current.question_type === "true_false"
                    ? "Question vrai / faux"
                    : "Question à complétion"}
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase",
                  currentStatusMeta.badge
                )}
              >
                <currentStatusMeta.icon className="h-3 w-3" />
                {currentStatusMeta.label}
              </span>
            </div>

            <div className="mt-3 text-sm text-foreground">
              <MarkdownRenderer content={current.prompt} />
            </div>

            {normalisedOptions.length > 0 ? (
              <div className="mt-4 space-y-2">
                {normalisedOptions.map((option, index) => {
                  const isSelected = selectedOption === index
                  const isCorrectOption = revealAnswer && isOptionCorrect(option)
                  const isIncorrectSelection = revealAnswer && isSelected && !isCorrectOption
                  return (
                    <button
                      key={`${current.id}-${index}`}
                      type="button"
                      onClick={() => setSelectedOption(index)}
                      className={cn(
                        "w-full rounded-2xl border border-border/60 px-4 py-3 text-left text-sm transition hover:border-primary/40 hover:bg-primary/5",
                        isSelected && "border-primary bg-primary/10 text-primary",
                        isCorrectOption && "border-emerald-400 bg-emerald-50 text-emerald-700",
                        isIncorrectSelection && "border-rose-300 bg-rose-50 text-rose-600"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <MarkdownRenderer content={option} />
                        </div>
                        {revealAnswer && (
                          <span className="text-xs font-semibold">
                            {isCorrectOption ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            ) : isIncorrectSelection ? (
                              <XCircle className="h-4 w-4 text-rose-600" />
                            ) : null}
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-border/60 bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                Formule la réponse ou réfléchis avant de la révéler.
              </div>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">
                Marquer cette question
              </span>
              {(Object.keys(QUIZ_STATUS_META) as QuizQuestionStatus[])
                .filter((status) => status !== "pending")
                .map((status) => {
                  const meta = QUIZ_STATUS_META[status]
                  const isActive = currentStatus === status
                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() => handleMarkStatus(current.id, status)}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition",
                        isActive
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-muted/30 text-muted-foreground hover:border-primary/40"
                      )}
                    >
                      <meta.icon className="h-3 w-3" />
                      {meta.label}
                    </button>
                  )
                })}
              {currentStatus !== "pending" && (
                <button
                  type="button"
                  onClick={() => handleMarkStatus(current.id, "pending")}
                  className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-primary/40"
                >
                  <CircleDashed className="h-3 w-3" />
                  Réinitialiser
                </button>
              )}
            </div>

            <div
              className={cn(
                "mt-5 rounded-2xl border border-primary/30 bg-primary/5 p-4 text-sm transition-all duration-200",
                revealAnswer ? "opacity-100" : "pointer-events-none opacity-0"
              )}
              aria-hidden={!revealAnswer}
            >
              <p className="text-xs uppercase tracking-wide text-primary/70">Réponse</p>
              <div className="mt-2 text-primary">
                {revealAnswer ? <MarkdownRenderer content={current.answer} /> : null}
              </div>
            </div>

            {revealAnswer && current.explanation ? (
              <div className="mt-3 rounded-2xl border border-border/40 bg-muted/40 p-3 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">Explication</p>
                <div className="mt-1">
                  <MarkdownRenderer content={current.explanation} />
                </div>
              </div>
            ) : null}

            {current.tags?.length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {current.tags.map((tag) => (
                  <span
                    key={`${current.id}-${tag}`}
                    className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="rounded-2xl border border-border/40 bg-muted/20 p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Navigation rapide</span>
            <span>{questions.length} questions</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {questions.map((question) => {
              const status = questionStatuses[question.id] ?? "pending"
              const meta = QUIZ_STATUS_META[status]
              const index = indexById[question.id]
              const isActive = index === currentIndex
              return (
                <button
                  key={question.id}
                  type="button"
                  onClick={() => handleSelectQuestion(question.id)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition",
                    isActive
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background/80 text-muted-foreground hover:border-primary/40"
                  )}
                >
                  <span className={cn("h-2 w-2 rounded-full", meta.progress)} />
                  Question {index + 1}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

