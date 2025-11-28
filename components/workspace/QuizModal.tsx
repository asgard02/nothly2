"use client"

import { useState } from "react"
import { X, CheckCircle2, XCircle, ArrowRight, ArrowLeft, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface QuizQuestion {
  id: string
  question_type: string
  prompt: string
  options?: string[] | string | null
  answer: string
  explanation?: string | null
}

interface QuizModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  questions: QuizQuestion[]
}

// Helper pour parser les options (peuvent être un tableau ou une chaîne JSON)
function parseOptions(options: string[] | string | null | undefined): string[] {
  if (!options) return []
  if (Array.isArray(options)) return options
  try {
    const parsed = JSON.parse(options)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function QuizModal({ isOpen, onClose, title, questions }: QuizModalProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({})
  const [showResults, setShowResults] = useState(false)
  const [showExplanations, setShowExplanations] = useState<Record<string, boolean>>({})

  if (!isOpen || questions.length === 0) return null

  const currentQuestion = questions[currentQuestionIndex]
  const questionOptions = parseOptions(currentQuestion.options)
  const selectedAnswer = selectedAnswers[currentQuestion.id]
  const isCorrect = selectedAnswer === currentQuestion.answer
  const hasAnswered = selectedAnswer !== undefined

  const handleAnswerSelect = (answer: string) => {
    if (showResults) return
    setSelectedAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: answer,
    }))
    setShowExplanations((prev) => ({
      ...prev,
      [currentQuestion.id]: true,
    }))
  }

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    } else {
      setShowResults(true)
    }
  }

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
    }
  }

  const handleReset = () => {
    setCurrentQuestionIndex(0)
    setSelectedAnswers({})
    setShowResults(false)
    setShowExplanations({})
  }

  const getScore = () => {
    let correct = 0
    questions.forEach((q) => {
      if (selectedAnswers[q.id] === q.answer) {
        correct++
      }
    })
    return { correct, total: questions.length, percentage: Math.round((correct / questions.length) * 100) }
  }

  const score = getScore()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-200"
        onClick={onClose}
      />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative z-50 w-full max-w-3xl max-h-[90vh] rounded-2xl border border-border/40 bg-card/95 backdrop-blur-md shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border/40">
          <div>
            <h2 className="text-2xl font-semibold">{title}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Question {currentQuestionIndex + 1} sur {questions.length}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {showResults ? (
            <div className="space-y-6">
              <div className="text-center">
                <div className={cn(
                  "inline-flex items-center justify-center w-24 h-24 rounded-full mb-4",
                  score.percentage >= 70 ? "bg-emerald-500/20 text-emerald-500" :
                  score.percentage >= 50 ? "bg-amber-500/20 text-amber-500" :
                  "bg-rose-500/20 text-rose-500"
                )}>
                  <span className="text-4xl font-bold">{score.percentage}%</span>
                </div>
                <h3 className="text-2xl font-semibold mb-2">Quiz terminé !</h3>
                <p className="text-muted-foreground">
                  Vous avez obtenu {score.correct} bonne{score.correct > 1 ? "s" : ""} réponse{score.correct > 1 ? "s" : ""} sur {score.total}
                </p>
              </div>

              <div className="space-y-4">
                {questions.map((question, index) => {
                  const userAnswer = selectedAnswers[question.id]
                  const isCorrectAnswer = userAnswer === question.answer
                  const qOptions = parseOptions(question.options)
                  return (
                    <div
                      key={question.id}
                      className={cn(
                        "p-4 rounded-xl border",
                        isCorrectAnswer
                          ? "bg-emerald-500/10 border-emerald-500/30"
                          : "bg-rose-500/10 border-rose-500/30"
                      )}
                    >
                      <div className="flex items-start gap-3 mb-3">
                        {isCorrectAnswer ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="h-5 w-5 text-rose-500 flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <p className="font-medium text-foreground mb-2">
                            Question {index + 1}: {question.prompt}
                          </p>
                          {qOptions.length > 0 && (
                            <div className="space-y-2 mb-3">
                              {qOptions.map((option, optIndex) => (
                                <div
                                  key={optIndex}
                                  className={cn(
                                    "p-2 rounded-lg text-sm",
                                    option === question.answer
                                      ? "bg-emerald-500/20 border border-emerald-500/50"
                                      : option === userAnswer && !isCorrectAnswer
                                      ? "bg-rose-500/20 border border-rose-500/50"
                                      : "bg-muted/50 border border-border/30"
                                  )}
                                >
                                  {option}
                                  {option === question.answer && (
                                    <span className="ml-2 text-xs text-emerald-600 font-medium">✓ Bonne réponse</span>
                                  )}
                                  {option === userAnswer && !isCorrectAnswer && (
                                    <span className="ml-2 text-xs text-rose-600 font-medium">✗ Votre réponse</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          {question.explanation && (
                            <div className="mt-3 p-3 rounded-lg bg-muted/50 border border-border/30">
                              <p className="text-sm font-medium text-foreground mb-1">Explication :</p>
                              <p className="text-sm text-muted-foreground">{question.explanation}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Question */}
              <div>
                <p className="text-lg font-medium text-foreground mb-4">{currentQuestion.prompt}</p>
                
                {/* Options pour QCM */}
                {questionOptions.length > 0 ? (
                  <div className="space-y-2">
                    {questionOptions.map((option, index) => {
                      const isSelected = selectedAnswer === option
                      const showCorrect = hasAnswered && option === currentQuestion.answer
                      const showIncorrect = hasAnswered && isSelected && !isCorrect
                      
                      return (
                        <button
                          key={index}
                          onClick={() => handleAnswerSelect(option)}
                          disabled={showResults}
                          className={cn(
                            "w-full p-4 rounded-xl border text-left transition-all",
                            isSelected
                              ? showCorrect
                                ? "bg-emerald-500/20 border-emerald-500/50"
                                : showIncorrect
                                ? "bg-rose-500/20 border-rose-500/50"
                                : "bg-primary/10 border-primary/50"
                              : "bg-muted/50 border-border/30 hover:border-primary/50 hover:bg-muted",
                            showResults && "cursor-not-allowed"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "flex items-center justify-center w-6 h-6 rounded-full border-2 flex-shrink-0",
                              isSelected
                                ? showCorrect
                                  ? "border-emerald-500 bg-emerald-500"
                                  : showIncorrect
                                  ? "border-rose-500 bg-rose-500"
                                  : "border-primary bg-primary"
                                : "border-border"
                            )}>
                              {isSelected && (
                                <div className="w-2 h-2 rounded-full bg-white" />
                              )}
                            </div>
                            <span className="flex-1">{option}</span>
                            {showCorrect && (
                              <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                            )}
                            {showIncorrect && (
                              <XCircle className="h-5 w-5 text-rose-500 flex-shrink-0" />
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  /* Question ouverte */
                  <div className="p-4 rounded-xl bg-muted/50 border border-border/30">
                    <p className="text-sm text-muted-foreground mb-2">Réponse attendue :</p>
                    <p className="font-medium text-foreground">{currentQuestion.answer}</p>
                  </div>
                )}

                {/* Explication */}
                {hasAnswered && currentQuestion.explanation && showExplanations[currentQuestion.id] && (
                  <div className="mt-4 p-4 rounded-xl bg-primary/5 border border-primary/20">
                    <p className="text-sm font-medium text-foreground mb-2">
                      {isCorrect ? (
                        <span className="text-emerald-600">✓ Correct !</span>
                      ) : (
                        <span className="text-rose-600">✗ Incorrect</span>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">{currentQuestion.explanation}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-border/40">
          {showResults ? (
            <Button onClick={handleReset} variant="outline" className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Recommencer
            </Button>
          ) : (
            <Button onClick={handlePrevious} variant="outline" disabled={currentQuestionIndex === 0} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Précédent
            </Button>
          )}
          
          <div className="flex items-center gap-2">
            {questions.map((_, index) => (
              <div
                key={index}
                className={cn(
                  "h-2 w-2 rounded-full transition-all",
                  index === currentQuestionIndex
                    ? "bg-primary w-8"
                    : index < currentQuestionIndex
                    ? "bg-primary/50"
                    : "bg-muted"
                )}
              />
            ))}
          </div>

          {showResults ? (
            <Button onClick={onClose} className="gap-2">
              Fermer
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={!hasAnswered}
              className="gap-2"
            >
              {currentQuestionIndex === questions.length - 1 ? "Terminer" : "Suivant"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

