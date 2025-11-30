"use client"

import { useEffect, useMemo, useState, useCallback, useRef } from "react"
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
  Brain,
  TrendingUp,
  Clock,
  Zap,
  RotateCcw,
  BarChart3,
  Award,
  AlertCircle,
  Loader2,
  Check,
  X,
  ArrowRight
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

import MarkdownRenderer from "@/components/MarkdownRenderer"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"

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
type MasteryLevel = "new" | "learning" | "reviewing" | "mastered"
type SessionMode = "practice" | "review" | "adaptive"

interface QuestionStats {
  mastery_level: MasteryLevel
  total_attempts: number
  correct_attempts: number
  incorrect_attempts: number
}

interface QuizViewerProps {
  questions: QuizQuestionItem[]
  studyCollectionId?: string
  mode?: SessionMode
  title?: string
  onClose?: () => void
}

const MASTERY_COLORS: Record<MasteryLevel, { bg: string; text: string; border: string; icon: typeof Brain; gradient: string }> = {
  new: {
    bg: "bg-slate-50 dark:bg-slate-900/50",
    text: "text-slate-700 dark:text-slate-300",
    border: "border-slate-200 dark:border-slate-700",
    icon: CircleDashed,
    gradient: "from-slate-500 to-slate-600"
  },
  learning: {
    bg: "bg-rose-50 dark:bg-rose-950/40",
    text: "text-rose-700 dark:text-rose-400",
    border: "border-rose-200 dark:border-rose-800",
    icon: AlertCircle,
    gradient: "from-rose-500 to-rose-600"
  },
  reviewing: {
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-400",
    border: "border-amber-200 dark:border-amber-800",
    icon: RotateCcw,
    gradient: "from-amber-500 to-amber-600"
  },
  mastered: {
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-400",
    border: "border-emerald-200 dark:border-emerald-800",
    icon: Award,
    gradient: "from-emerald-500 to-emerald-600"
  },
}

export default function QuizViewer({ questions, studyCollectionId, mode = "practice", title, onClose }: QuizViewerProps) {
  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(null)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [revealAnswer, setRevealAnswer] = useState(false)
  const [questionStatuses, setQuestionStatuses] = useState<Record<string, QuizQuestionStatus>>({})
  const [questionStats, setQuestionStats] = useState<Record<string, QuestionStats>>({})
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [timeSpent, setTimeSpent] = useState<number>(0)
  const [isSaving, setIsSaving] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [weakAreas, setWeakAreas] = useState<any[]>([])
  const [showWeakAreas, setShowWeakAreas] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  const [isFinished, setIsFinished] = useState(false)

  // Charger les zones de difficulté
  useEffect(() => {
    if (studyCollectionId) {
      fetch(`/api/quiz/generate-targeted?studyCollectionId=${studyCollectionId}`)
        .then((res) => {
          if (!res.ok) {
            if (res.status === 400) {
              return { weakAreas: [] }
            }
            throw new Error(`Erreur ${res.status}`)
          }
          return res.json()
        })
        .then((data) => {
          if (data.weakAreas) {
            setWeakAreas(data.weakAreas)
          }
        })
        .catch((err) => {
          if (err.message !== "Erreur 400") {
            console.error("Erreur chargement zones de difficulté:", err)
          }
          setWeakAreas([])
        })
    } else {
      setWeakAreas([])
    }
  }, [studyCollectionId])

  // Charger les statistiques au démarrage
  useEffect(() => {
    if (studyCollectionId && questions.length > 0) {
      fetch(`/api/quiz/progress?studyCollectionId=${studyCollectionId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.stats) {
            const statsMap: Record<string, QuestionStats> = {}
            data.stats.forEach((stat: any) => {
              statsMap[stat.quiz_question_id] = {
                mastery_level: stat.mastery_level || "new",
                total_attempts: stat.total_attempts || 0,
                correct_attempts: stat.correct_attempts || 0,
                incorrect_attempts: stat.incorrect_attempts || 0,
              }
            })
            setQuestionStats(statsMap)
          }
        })
        .catch((err) => console.error("Erreur chargement stats:", err))
    }
  }, [studyCollectionId, questions])

  const [filterMode, setFilterMode] = useState<"all" | "mistakes">("all")

  // Mode adaptatif : réorganiser les questions par priorité
  const prioritizedQuestions = useMemo(() => {
    let filtered = questions

    if (filterMode === "mistakes") {
      filtered = questions.filter(q => {
        const stats = questionStats[q.id]
        return stats && (stats.incorrect_attempts > 0 || stats.mastery_level === "learning")
      })
    }

    if (mode !== "adaptive" && filterMode !== "mistakes") return filtered

    return [...filtered].sort((a, b) => {
      const statsA = questionStats[a.id]
      const statsB = questionStats[b.id]

      const priority = { learning: 4, reviewing: 3, new: 2, mastered: 1 }
      const priorityA = priority[statsA?.mastery_level || "new"] || 2
      const priorityB = priority[statsB?.mastery_level || "new"] || 2

      if (priorityA !== priorityB) return priorityB - priorityA

      const errorsA = statsA?.incorrect_attempts || 0
      const errorsB = statsB?.incorrect_attempts || 0
      return errorsB - errorsA
    })
  }, [questions, questionStats, mode, filterMode])

  const handleRestart = (onlyMistakes: boolean = false) => {
    setQuestionStatuses({})
    setIsFinished(false)
    setStartTime(Date.now())

    if (onlyMistakes) {
      setFilterMode("mistakes")
    } else {
      setFilterMode("all")
    }
  }

  const currentIndex = useMemo(() => {
    if (!currentQuestionId || prioritizedQuestions.length === 0) return 0
    const index = prioritizedQuestions.findIndex(q => q.id === currentQuestionId)
    return index >= 0 ? index : 0
  }, [currentQuestionId, prioritizedQuestions])

  const current = prioritizedQuestions[currentIndex] || null

  const previousQuestionsIds = useRef<Set<string>>(new Set())
  const isInitialMount = useRef(true)

  useEffect(() => {
    const currentQuestionsSet = new Set(prioritizedQuestions.map(q => q.id))
    const previousSet = previousQuestionsIds.current

    const isNewQuiz =
      previousSet.size === 0 ||
      currentQuestionsSet.size !== previousSet.size ||
      ![...currentQuestionsSet].every(id => previousSet.has(id))

    if (isNewQuiz) {
      previousQuestionsIds.current = currentQuestionsSet
      if (prioritizedQuestions.length > 0) {
        setCurrentQuestionId(prioritizedQuestions[0].id)
      }
      setSelectedOption(null)
      setRevealAnswer(false)
      setStartTime(Date.now())
      isInitialMount.current = false
    } else {
      previousQuestionsIds.current = currentQuestionsSet
      if (currentQuestionId && !currentQuestionsSet.has(currentQuestionId)) {
        if (prioritizedQuestions.length > 0) {
          setCurrentQuestionId(prioritizedQuestions[0].id)
        }
      }
    }

    setQuestionStatuses((prev) => {
      const next: Record<string, QuizQuestionStatus> = {}
      prioritizedQuestions.forEach((question) => {
        next[question.id] = prev[question.id] ?? "pending"
      })
      return next
    })
  }, [prioritizedQuestions, currentQuestionId])

  useEffect(() => {
    if (!currentQuestionId && prioritizedQuestions.length > 0 && !isInitialMount.current) {
      setCurrentQuestionId(prioritizedQuestions[0].id)
    } else if (currentQuestionId && !prioritizedQuestions.find(q => q.id === currentQuestionId)) {
      if (prioritizedQuestions.length > 0) {
        setCurrentQuestionId(prioritizedQuestions[0].id)
      }
    }
  }, [currentQuestionId, prioritizedQuestions])

  useEffect(() => {
    setSelectedOption(null)
    setRevealAnswer(false)
    if (current) {
      setStartTime(Date.now())
    }
  }, [currentQuestionId, current])

  useEffect(() => {
    if (!startTime || revealAnswer) return

    const interval = setInterval(() => {
      setTimeSpent(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)

    return () => clearInterval(interval)
  }, [startTime, revealAnswer])

  const progressLabel = useMemo(() => `Question ${currentIndex + 1} / ${prioritizedQuestions.length}`, [currentIndex, prioritizedQuestions.length])

  const statusCounts = useMemo(() => {
    const counts: Record<QuizQuestionStatus, number> = {
      pending: 0,
      correct: 0,
      incorrect: 0,
      flagged: 0,
    }
    for (const question of prioritizedQuestions) {
      const status = questionStatuses[question.id] ?? "pending"
      counts[status] += 1
    }
    return counts
  }, [questionStatuses, prioritizedQuestions])

  const answeredCount = prioritizedQuestions.length - statusCounts.pending
  const accuracyPercent = answeredCount ? Math.round((statusCounts.correct / answeredCount) * 100) : 0
  const progressPercent = prioritizedQuestions.length ? Math.round((answeredCount / prioritizedQuestions.length) * 100) : 0

  useEffect(() => {
    if (prioritizedQuestions.length > 0 && answeredCount === prioritizedQuestions.length && !isFinished) {
      const timer = setTimeout(() => setIsFinished(true), 1500)
      return () => clearTimeout(timer)
    }
  }, [answeredCount, prioritizedQuestions.length, isFinished])

  const currentStatus: QuizQuestionStatus = current ? questionStatuses[current.id] ?? "pending" : "pending"
  const currentStats = current ? questionStats[current.id] : null
  const currentMastery = currentStats?.mastery_level || "new"
  const masteryMeta = MASTERY_COLORS[currentMastery]

  const handleMarkStatus = (questionId: string, status: QuizQuestionStatus) => {
    setQuestionStatuses((prev) => ({
      ...prev,
      [questionId]: status,
    }))
  }

  const handleNext = () => {
    if (prioritizedQuestions.length === 0) return
    const nextIndex = (currentIndex + 1) % prioritizedQuestions.length
    setCurrentQuestionId(prioritizedQuestions[nextIndex].id)
  }

  const handlePrevious = () => {
    if (prioritizedQuestions.length === 0) return
    const prevIndex = (currentIndex - 1 + prioritizedQuestions.length) % prioritizedQuestions.length
    setCurrentQuestionId(prioritizedQuestions[prevIndex].id)
  }

  const saveAnswer = useCallback(
    async (questionId: string, isCorrect: boolean, userAnswer: string) => {
      if (!studyCollectionId || isSaving) return

      setIsSaving(true)
      try {
        const response = await fetch("/api/quiz/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            quizQuestionId: questionId,
            userAnswer,
            isCorrect,
            timeSpentSeconds: timeSpent,
            studyCollectionId,
          }),
        })

        const data = await response.json()
        if (data.success) {
          if (data.sessionId && !sessionId) {
            setSessionId(data.sessionId)
          }

          if (currentStats) {
            setQuestionStats((prev) => ({
              ...prev,
              [questionId]: {
                ...prev[questionId],
                total_attempts: (prev[questionId]?.total_attempts || 0) + 1,
                correct_attempts: isCorrect ? (prev[questionId]?.correct_attempts || 0) + 1 : prev[questionId]?.correct_attempts || 0,
                incorrect_attempts: !isCorrect ? (prev[questionId]?.incorrect_attempts || 0) + 1 : prev[questionId]?.incorrect_attempts || 0,
                mastery_level:
                  isCorrect && (prev[questionId]?.correct_attempts || 0) + 1 >= ((prev[questionId]?.total_attempts || 0) + 1) * 0.8
                    ? "mastered"
                    : (prev[questionId]?.correct_attempts || 0) + 1 >= ((prev[questionId]?.total_attempts || 0) + 1) * 0.5
                      ? "reviewing"
                      : "learning",
              },
            }))
          } else {
            setQuestionStats((prev) => ({
              ...prev,
              [questionId]: {
                mastery_level: isCorrect ? "reviewing" : "learning",
                total_attempts: 1,
                correct_attempts: isCorrect ? 1 : 0,
                incorrect_attempts: isCorrect ? 0 : 1,
              },
            }))
          }
        }
      } catch (error) {
        console.error("Erreur sauvegarde réponse:", error)
      } finally {
        setIsSaving(false)
      }
    },
    [studyCollectionId, sessionId, timeSpent, currentStats, isSaving]
  )

  const handleReveal = () => {
    if (!current) return

    setRevealAnswer(true)
    if (normalisedOptions.length > 0 && selectedOption !== null) {
      const selectedValue = normalisedOptions[selectedOption]
      if (selectedValue) {
        const isCorrect = isOptionCorrect(selectedValue)
        handleMarkStatus(current.id, isCorrect ? "correct" : "incorrect")
        saveAnswer(current.id, isCorrect, selectedValue)
      }
    }
  }

  const isOptionCorrect = (option: string) => {
    return option.trim().toLowerCase() === current.answer.trim().toLowerCase()
  }

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

  if (isFinished) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
        <div className="space-y-4">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-primary/10 mb-4 ring-8 ring-primary/5">
            <Award className="h-12 w-12 text-primary" />
          </div>
          <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600">Session terminée !</h2>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            Vous avez répondu à toutes les questions. Voici votre résumé.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-6 w-full max-w-2xl">
          <div className="bg-card border rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all">
            <div className="text-4xl font-bold text-primary mb-2">{accuracyPercent}%</div>
            <div className="text-sm text-muted-foreground font-medium">Précision</div>
          </div>
          <div className="bg-card border rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all">
            <div className="text-4xl font-bold text-emerald-500 mb-2">{statusCounts.correct}</div>
            <div className="text-sm text-muted-foreground font-medium">Correctes</div>
          </div>
          <div className="bg-card border rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all">
            <div className="text-4xl font-bold text-rose-500 mb-2">{statusCounts.incorrect}</div>
            <div className="text-sm text-muted-foreground font-medium">À revoir</div>
          </div>
        </div>

        <div className="flex items-center gap-4 pt-8">
          <Button
            variant="outline"
            size="lg"
            onClick={() => handleRestart(false)}
            className="h-12 px-8 text-base rounded-full"
          >
            <RotateCcw className="mr-2 h-5 w-5" />
            Tout recommencer
          </Button>
          {statusCounts.incorrect > 0 && (
            <Button
              size="lg"
              onClick={() => handleRestart(true)}
              className="h-12 px-8 text-base shadow-lg hover:shadow-xl transition-all rounded-full bg-primary hover:bg-primary/90"
            >
              <Target className="mr-2 h-5 w-5" />
              Revoir les erreurs
            </Button>
          )}
          {onClose && (
            <Button
              variant="ghost"
              size="lg"
              onClick={onClose}
              className="h-12 px-8 text-base rounded-full"
            >
              Fermer
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-background to-muted/20">
      {/* Unified Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-border/40 bg-background/80 backdrop-blur-md sticky top-0 z-10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <Brain className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              {title || "Quiz"}
              <span className="px-2 py-0.5 rounded-full bg-muted text-[10px] font-medium text-muted-foreground uppercase tracking-wider border border-border/50">
                {mode === "adaptive" ? "Adaptatif" : mode === "review" ? "Révision" : "Pratique"}
              </span>
            </h2>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Question {currentIndex + 1} sur {prioritizedQuestions.length}</span>
              <span className="w-1 h-1 rounded-full bg-border" />
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {Math.floor(timeSpent / 60)}:{(timeSpent % 60).toString().padStart(2, "0")}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-3 px-3 py-1.5 rounded-full bg-muted/50 border border-border/50 mr-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {statusCounts.correct}
            </div>
            <div className="w-px h-3 bg-border" />
            <div className="flex items-center gap-1.5 text-xs font-medium text-rose-600 dark:text-rose-400">
              <XCircle className="h-3.5 w-3.5" />
              {statusCounts.incorrect}
            </div>
          </div>

          {onClose && (
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-muted" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1 bg-muted">
        <motion.div
          className="h-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Main Content Area - Centered & Scrollable */}
      <div className="flex-1 overflow-hidden relative flex flex-col items-center justify-center p-4 md:p-6">
        <div className="w-full max-w-3xl h-full max-h-[800px] flex flex-col">
          <AnimatePresence mode="wait">
            {current && (
              <motion.div
                key={current.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="w-full h-full flex flex-col"
              >
                <div className={cn(
                  "flex-1 flex flex-col bg-card border rounded-3xl shadow-xl overflow-hidden transition-all duration-500",
                  revealAnswer && questionStatuses[current.id] === "correct" && "border-emerald-500/50 shadow-emerald-500/10",
                  revealAnswer && questionStatuses[current.id] === "incorrect" && "border-rose-500/50 shadow-rose-500/10"
                )}>
                  {/* Card Header & Question - Scrollable part 1 */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="p-8 border-b border-border/50 bg-muted/30 sticky top-0 z-10 backdrop-blur-sm supports-[backdrop-filter]:bg-muted/30">
                      <div className="flex items-center justify-between mb-4">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
                          masteryMeta.bg, masteryMeta.text, masteryMeta.border, "border"
                        )}>
                          {currentMastery === "new" ? "Nouvelle" : currentMastery === "learning" ? "À apprendre" : currentMastery === "reviewing" ? "En révision" : "Maîtrisée"}
                        </span>
                        {revealAnswer && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className={cn(
                              "flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border",
                              questionStatuses[current.id] === "correct"
                                ? "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800"
                                : "bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800"
                            )}
                          >
                            {questionStatuses[current.id] === "correct" ? (
                              <>Correct <Check className="h-3 w-3" /></>
                            ) : (
                              <>Incorrect <X className="h-3 w-3" /></>
                            )}
                          </motion.div>
                        )}
                      </div>
                      <div className="text-xl md:text-2xl font-medium leading-relaxed">
                        <MarkdownRenderer content={current.prompt} />
                      </div>
                    </div>

                    {/* Options */}
                    <div className="p-8 space-y-3 bg-background">
                      {normalisedOptions.map((option, index) => {
                        const isSelected = selectedOption === index
                        const isCorrectOption = revealAnswer && isOptionCorrect(option)
                        const isIncorrectSelection = revealAnswer && isSelected && !isCorrectOption

                        return (
                          <motion.button
                            key={`${current.id}-${index}`}
                            whileHover={!revealAnswer ? { scale: 1.01 } : {}}
                            whileTap={!revealAnswer ? { scale: 0.99 } : {}}
                            onClick={() => !revealAnswer && setSelectedOption(index)}
                            disabled={revealAnswer}
                            className={cn(
                              "w-full p-4 rounded-xl border-2 text-left transition-all duration-200 flex items-center gap-4 group relative overflow-hidden",
                              !revealAnswer && isSelected && "border-primary bg-primary/5 shadow-md ring-1 ring-primary/20",
                              !revealAnswer && !isSelected && "border-border hover:border-primary/50 hover:bg-muted/50",
                              isCorrectOption && "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 shadow-md",
                              isIncorrectSelection && "border-rose-500 bg-rose-50 dark:bg-rose-950/20 shadow-md",
                              revealAnswer && !isSelected && !isCorrectOption && "opacity-40 grayscale"
                            )}
                          >
                            <div className={cn(
                              "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold transition-colors",
                              isCorrectOption ? "bg-emerald-500 text-white" :
                                isIncorrectSelection ? "bg-rose-500 text-white" :
                                  isSelected ? "bg-primary text-white" :
                                    "bg-muted text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary"
                            )}>
                              {String.fromCharCode(65 + index)}
                            </div>
                            <div className="flex-1 text-base">
                              <MarkdownRenderer content={option} />
                            </div>
                            {isCorrectOption && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
                            {isIncorrectSelection && <XCircle className="h-5 w-5 text-rose-500" />}
                          </motion.button>
                        )
                      })}

                      {/* Explanation - Inside scrollable area */}
                      <AnimatePresence>
                        {revealAnswer && current.explanation && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="pt-6 border-t border-border mt-6"
                          >
                            <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
                              <div className="flex items-center gap-2 mb-2 text-sm font-semibold text-muted-foreground">
                                <Brain className="h-4 w-4" />
                                Explication
                              </div>
                              <div className="text-sm text-foreground leading-relaxed">
                                <MarkdownRenderer content={current.explanation} />
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Footer Controls - Fixed at bottom of card */}
                  <div className="flex-shrink-0 p-6 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between z-10">
                    <Button
                      variant="ghost"
                      onClick={handlePrevious}
                      disabled={currentIndex === 0}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <ChevronLeft className="h-4 w-4 mr-2" />
                      Précédent
                    </Button>

                    {!revealAnswer ? (
                      <Button
                        size="lg"
                        onClick={handleReveal}
                        disabled={selectedOption === null && normalisedOptions.length > 0}
                        className="rounded-full px-8 shadow-lg shadow-primary/20"
                      >
                        Vérifier
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    ) : (
                      <Button
                        size="lg"
                        onClick={handleNext}
                        className="rounded-full px-8 shadow-lg shadow-primary/20"
                      >
                        {currentIndex === prioritizedQuestions.length - 1 ? "Terminer" : "Suivant"}
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
