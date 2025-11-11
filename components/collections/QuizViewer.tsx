"use client"

import { useEffect, useMemo, useState } from "react"
import { CheckCircle2, ChevronLeft, ChevronRight, Eye, EyeOff } from "lucide-react"

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

interface QuizViewerProps {
  questions: QuizQuestionItem[]
}

export default function QuizViewer({ questions }: QuizViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [revealAnswer, setRevealAnswer] = useState(false)

  const current = questions[currentIndex]

  useEffect(() => {
    setCurrentIndex(0)
    setSelectedOption(null)
    setRevealAnswer(false)
  }, [questions])

  useEffect(() => {
    setSelectedOption(null)
    setRevealAnswer(false)
  }, [currentIndex])

  const progressLabel = useMemo(() => `Question ${currentIndex + 1} / ${questions.length}`, [currentIndex, questions.length])

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

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % questions.length)
  }

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + questions.length) % questions.length)
  }

  const handleReveal = () => {
    setRevealAnswer(true)
  }

  const isOptionCorrect = (option: string) => {
    return option.trim().toLowerCase() === current.answer.trim().toLowerCase()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-3xl border border-border/60 bg-background/60 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-medium text-muted-foreground">{progressLabel}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handlePrevious} className="rounded-full">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleNext} className="rounded-full">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card/80 p-6">
          <div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground/70">
            <span>
              {current.question_type === "multiple_choice"
                ? "Question à choix multiples"
                : current.question_type === "true_false"
                ? "Question vrai / faux"
                : "Question à complétion"}
            </span>
          </div>
          <div className="mt-3 text-sm text-foreground">
            <MarkdownRenderer content={current.prompt} />
          </div>

          {normalisedOptions.length > 0 && (
            <div className="mt-4 space-y-2">
              {normalisedOptions.map((option, index) => {
                const isSelected = selectedOption === index
                const revealed = revealAnswer && isOptionCorrect(option)
                return (
                  <button
                    key={`${current.id}-${index}`}
                    type="button"
                    onClick={() => setSelectedOption(index)}
                    className={cn(
                      "w-full rounded-2xl border border-border/60 px-4 py-3 text-left text-sm transition hover:border-primary/40 hover:bg-primary/5",
                      isSelected && "border-primary bg-primary/10 text-primary",
                      revealed && "border-emerald-400 bg-emerald-50 text-emerald-700"
                    )}
                  >
                    {option}
                  </button>
                )
              })}
            </div>
          )}

          {normalisedOptions.length === 0 && (
            <div className="mt-4 rounded-2xl border border-border/60 bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
              Formule la réponse ou réfléchis avant de la révéler.
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={handleReveal}
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium"
            >
              {revealAnswer ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {revealAnswer ? "Réponse affichée" : "Afficher la réponse"}
            </Button>
            {revealAnswer && normalisedOptions.length > 0 && selectedOption !== null && (
              <div
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium",
                  isOptionCorrect(normalisedOptions[selectedOption])
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-rose-200 bg-rose-50 text-rose-600"
                )}
              >
                <CheckCircle2 className="h-3 w-3" />
                {isOptionCorrect(normalisedOptions[selectedOption]) ? "Bonne réponse" : "Réponse incorrecte"}
              </div>
            )}
          </div>

          <div
            className={cn(
              "mt-4 rounded-2xl border border-primary/30 bg-primary/5 p-4 text-sm transition-all duration-200",
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
              <p className="mt-1 whitespace-pre-line">{current.explanation}</p>
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
      </div>

      <div className="rounded-3xl border border-border/40 bg-background/40">
        <details className="group rounded-3xl" open={questions.length <= 4}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-3xl px-4 py-3 text-sm font-medium text-muted-foreground transition hover:bg-muted/40">
            <span>Voir toutes les questions</span>
            <span className="text-xs text-muted-foreground/70">{questions.length} questions</span>
          </summary>
          <div className="divide-y divide-border/40">
            {questions.map((question, index) => (
              <button
                key={question.id}
                type="button"
                onClick={() => setCurrentIndex(index)}
                className={cn(
                  "flex w-full flex-col items-start gap-1 px-4 py-3 text-left transition hover:bg-muted/40",
                  index === currentIndex && "bg-muted/40"
                )}
              >
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground/70">
                  Question {index + 1}
                </span>
                <span className="line-clamp-2 text-sm text-foreground">{question.prompt}</span>
              </button>
            ))}
          </div>
        </details>
      </div>
    </div>
  )
}

