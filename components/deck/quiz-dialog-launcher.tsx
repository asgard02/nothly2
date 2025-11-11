"use client"

import { useCallback, useMemo, useState } from "react"

import { PlayCircle, CheckCircle2, XCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import type { DocumentSectionDetail } from "@/lib/hooks/useDocuments"

export type DeckQuestion = {
  id: string
  sectionHeading: string
  question_type: string
  prompt: string
  options: string[] | null
  answer: string
  explanation: string
  tags: string[] | null
  order_index: number
}

export function buildDeckQuestions(
  quizSets: DocumentSectionDetail["quiz_sets"],
  sectionHeading: string
): DeckQuestion[] {
  if (!quizSets || quizSets.length === 0) return []

  return quizSets.flatMap((quizSet) =>
    (quizSet.quiz_questions ?? []).map((question) => {
      const rawOptions = question.options
      let options: string[] | null = null

      if (Array.isArray(rawOptions)) {
        options = rawOptions
      } else if (rawOptions && typeof rawOptions === "object") {
        options = Object.values(rawOptions as Record<string, string>)
      } else if (question.question_type === "true_false") {
        options = ["Vrai", "Faux"]
      }

      return {
        id: question.id,
        sectionHeading,
        question_type: question.question_type,
        prompt: question.prompt,
        options,
        answer: question.answer,
        explanation: question.explanation,
        tags: question.tags ?? [],
        order_index: question.order_index ?? 0,
      }
    })
  )
}

interface QuizDialogLauncherProps {
  questions: DeckQuestion[]
  label?: string
  variant?: "default" | "outline"
  size?: "default" | "sm"
}

export function QuizDialogLauncher({
  questions,
  label = "Lancer le quiz",
  variant = "default",
  size = "default",
}: QuizDialogLauncherProps) {
  const [open, setOpen] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [showSummary, setShowSummary] = useState(false)

  const total = questions.length

  const resetState = useCallback(() => {
    setCurrentIndex(0)
    setAnswers({})
    setShowSummary(false)
  }, [])

  const score = useMemo(() => {
    return questions.reduce((acc, question) => {
      const expected = question.answer?.toString().trim().toLowerCase()
      const received = (answers[question.id] ?? "").trim().toLowerCase()
      if (expected && received && expected === received) {
        return acc + 1
      }
      return acc
    }, 0)
  }, [answers, questions])

  const handleOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next)
      if (!next) {
        resetState()
      }
    },
    [resetState]
  )

  if (total === 0) {
    return (
      <Button variant="outline" size={size === "sm" ? "sm" : "default"} disabled className="w-full">
        Quiz en préparation
      </Button>
    )
  }

  const currentQuestion = questions[currentIndex]
  const normalizedOptions =
    Array.isArray(currentQuestion.options) && currentQuestion.options.length > 0
      ? currentQuestion.options
      : currentQuestion.question_type === "true_false"
      ? ["Vrai", "Faux"]
      : []

  const currentAnswer = answers[currentQuestion.id] ?? ""

  const recordAnswer = (value: string) => {
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: value }))
  }

  const goNext = () => {
    if (currentIndex >= total - 1) {
      setShowSummary(true)
    } else {
      setCurrentIndex((prev) => prev + 1)
    }
  }

  const goPrev = () => {
    setCurrentIndex((prev) => Math.max(prev - 1, 0))
  }

  const buttonSize = size === "sm" ? "sm" : "default"

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant={variant}
          size={buttonSize}
          className="w-full justify-center"
        >
          <PlayCircle className="mr-2 h-4 w-4" />
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        {showSummary ? (
          <>
            <DialogHeader>
              <DialogTitle>Bilan du quiz</DialogTitle>
              <DialogDescription>
                {score} bonne{score > 1 ? "s" : ""} réponse{score > 1 ? "s" : ""} sur {total}.
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-2">
              {questions.map((question) => {
                const expected = question.answer?.toString().trim().toLowerCase()
                const received = (answers[question.id] ?? "").trim().toLowerCase()
                const isCorrect = expected && received && expected === received
                return (
                  <div
                    key={question.id}
                    className="rounded-xl border border-border/60 bg-muted/30 p-4 text-sm"
                  >
                    <div className="flex items-start gap-3">
                      {isCorrect ? (
                        <CheckCircle2 className="mt-1 h-4 w-4 text-emerald-500" />
                      ) : (
                        <XCircle className="mt-1 h-4 w-4 text-destructive" />
                      )}
                      <div>
                        <p className="font-medium text-foreground">{question.prompt}</p>
                        <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                          {question.sectionHeading}
                        </p>
                        <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                          <p>
                            <span className="font-medium text-foreground">Ta réponse :</span>{" "}
                            {answers[question.id] ? answers[question.id] : "—"}
                          </p>
                          {!isCorrect && (
                            <p>
                              <span className="font-medium text-foreground">Réponse attendue :</span>{" "}
                              {question.answer}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={resetState}>
                Rejouer
              </Button>
              <Button onClick={() => handleOpenChange(false)}>Fermer</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>
                Question {currentIndex + 1} / {total}
              </DialogTitle>
              <DialogDescription>{currentQuestion.sectionHeading}</DialogDescription>
            </DialogHeader>
            <div className="space-y-5">
              <p className="text-sm leading-relaxed text-foreground">{currentQuestion.prompt}</p>
              {normalizedOptions.length > 0 ? (
                <div className="space-y-3">
                  {normalizedOptions.map((option) => (
                    <label
                      key={option}
                      className="flex cursor-pointer items-center gap-3 rounded-xl border border-border/50 bg-background/60 px-4 py-3 text-sm transition hover:border-primary/60 hover:bg-primary/5"
                    >
                      <input
                        type="radio"
                        name={`question-${currentQuestion.id}`}
                        value={option}
                        checked={currentAnswer === option}
                        onChange={(event) => recordAnswer(event.target.value)}
                        className="h-4 w-4 border border-border accent-primary"
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <textarea
                  className="h-28 w-full rounded-xl border border-border bg-muted/20 px-4 py-3 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="Écris ta réponse ici..."
                  value={currentAnswer}
                  onChange={(event) => recordAnswer(event.target.value)}
                />
              )}
            </div>
            <DialogFooter className="mt-6 flex items-center justify-between">
              <Button variant="outline" onClick={goPrev} disabled={currentIndex === 0}>
                Précédent
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowSummary(true)}>
                  Terminer maintenant
                </Button>
                <Button onClick={goNext}>
                  {currentIndex === total - 1 ? "Voir le résultat" : "Question suivante"}
                </Button>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

