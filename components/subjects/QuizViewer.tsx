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
  ArrowRight,
  HelpCircle,
  Sparkles
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
  studySubjectId?: string
  mode?: SessionMode
  title?: string
  onClose?: () => void
}

const MASTERY_COLORS: Record<MasteryLevel, { bg: string; text: string; border: string; icon: typeof Brain; shadow: string }> = {
  new: {
    bg: "bg-white",
    text: "text-black",
    border: "border-black",
    icon: CircleDashed,
    shadow: "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
  },
  learning: {
    bg: "bg-[#FBCFE8]", // Pink
    text: "text-black",
    border: "border-black",
    icon: AlertCircle,
    shadow: "shadow-[4px_4px_0px_0px_#BE185D]"
  },
  reviewing: {
    bg: "bg-[#FDE68A]", // Amber
    text: "text-black",
    border: "border-black",
    icon: RotateCcw,
    shadow: "shadow-[4px_4px_0px_0px_#B45309]"
  },
  mastered: {
    bg: "bg-[#BBF7D0]", // Green
    text: "text-black",
    border: "border-black",
    icon: Award,
    shadow: "shadow-[4px_4px_0px_0px_#15803D]"
  },
}

export default function QuizViewer({ questions, studySubjectId, mode = "practice", title, onClose }: QuizViewerProps) {
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
    if (studySubjectId) {
      fetch(`/api/quiz/generate-targeted?studySubjectId=${studySubjectId}`)
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
  }, [studySubjectId])

  // Charger les statistiques au démarrage
  useEffect(() => {
    if (studySubjectId && questions.length > 0) {
      fetch(`/api/quiz/progress?studySubjectId=${studySubjectId}`)
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
  }, [studySubjectId, questions])

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
      if (!studySubjectId || isSaving) return

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
            studySubjectId,
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
    [studySubjectId, sessionId, timeSpent, currentStats, isSaving]
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
      <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-8 animate-in fade-in zoom-in-95 duration-500 bg-transparent">
        <div className="bg-white border-2 border-black rounded-3xl p-12 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative max-w-2xl w-full">

          <div className="space-y-6">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-[#BBF7D0] border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-4">
              <Award className="h-10 w-10 text-black" strokeWidth={2.5} />
            </div>

            <h2 className="text-4xl font-black uppercase text-black italic">Session terminée !</h2>
            <p className="text-gray-500 font-bold text-lg max-w-md mx-auto">
              Vous avez répondu à toutes les questions. Voici votre résumé.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-6 w-full max-w-xl mx-auto mt-10">
            <div className="bg-[#BAE6FD] border-2 border-black rounded-xl p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="text-4xl font-black text-black mb-1">{accuracyPercent}%</div>
              <div className="text-xs text-black font-bold uppercase">Précision</div>
            </div>
            <div className="bg-[#BBF7D0] border-2 border-black rounded-xl p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="text-4xl font-black text-black mb-1">{statusCounts.correct}</div>
              <div className="text-xs text-black font-bold uppercase">Correctes</div>
            </div>
            <div className="bg-[#FBCFE8] border-2 border-black rounded-xl p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="text-4xl font-black text-black mb-1">{statusCounts.incorrect}</div>
              <div className="text-xs text-black font-bold uppercase">À revoir</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-12">
            <Button
              variant="default"
              size="lg"
              onClick={() => handleRestart(false)}
              className="h-14 px-8 text-sm font-black uppercase rounded-xl bg-white text-black border-2 border-black hover:bg-gray-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] active:translate-y-[4px] active:shadow-none transition-all"
            >
              <RotateCcw className="mr-2 h-5 w-5" />
              Tout recommencer
            </Button>
            {statusCounts.incorrect > 0 && (
              <Button
                size="lg"
                onClick={() => handleRestart(true)}
                className="h-14 px-8 text-sm font-black uppercase rounded-xl bg-black text-white hover:bg-[#8B5CF6] border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] active:translate-y-[4px] active:shadow-none transition-all"
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
                className="h-14 px-8 text-sm font-bold uppercase rounded-xl hover:bg-transparent hover:underline decoration-2 underline-offset-4"
              >
                Fermer
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-transparent max-w-4xl mx-auto w-full pt-4">
      {/* Unified Header */}
      <div className="flex-shrink-0 px-6 py-4 mx-4 mb-6 bg-white border-2 border-black rounded-2xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2.5 rounded-xl bg-black text-white border-2 border-black shadow-sm">
              <Brain className="h-6 w-6" strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-xl font-black text-black flex items-center gap-3 uppercase tracking-tighter">
                {title || "Quiz"}
                <span className="px-2 py-0.5 rounded-md bg-[#BAE6FD] text-black text-[10px] font-black uppercase border-2 border-black">
                  {mode === "adaptive" ? "Adaptatif" : mode === "review" ? "Révision" : "Pratique"}
                </span>
              </h2>
              <div className="flex items-center gap-3 text-xs font-bold text-gray-500 uppercase mt-0.5">
                <span>Q. {currentIndex + 1} / {prioritizedQuestions.length}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-black/20" />
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {Math.floor(timeSpent / 60)}:{(timeSpent % 60).toString().padStart(2, "0")}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gray-100 border-2 border-black mr-2">
              <div className="flex items-center gap-1.5 text-xs font-black text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
                {statusCounts.correct}
              </div>
              <div className="w-0.5 h-4 bg-gray-300" />
              <div className="flex items-center gap-1.5 text-xs font-black text-rose-600">
                <XCircle className="h-4 w-4" />
                {statusCounts.incorrect}
              </div>
            </div>

            {onClose && (
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-xl hover:bg-black hover:text-white border-2 border-transparent hover:border-black transition-all"
                onClick={onClose}
              >
                <X className="h-5 w-5" strokeWidth={3} />
              </Button>
            )}
          </div>
        </div>

        {/* Progress Bar styled as a bottom border indicator actually */}
        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gray-100 rounded-b-xl overflow-hidden border-t-2 border-black">
          <motion.div
            className="h-full bg-[#8B5CF6]"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Main Question Card */}
      <div className="flex-1 overflow-visible relative flex flex-col px-4 pb-6">
        <div className="w-full h-full flex flex-col">
          <AnimatePresence mode="wait">
            {current && (
              <motion.div
                key={current.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease: "circOut" }}
                className="w-full h-full flex flex-col"
              >
                <div className={cn(
                  "flex-1 flex flex-col bg-white border-2 border-black rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden transition-all duration-500",
                  revealAnswer && questionStatuses[current.id] === "correct" && "shadow-[8px_8px_0px_0px_#BBF7D0] border-emerald-600",
                  revealAnswer && questionStatuses[current.id] === "incorrect" && "shadow-[8px_8px_0px_0px_#FBCFE8] border-rose-600"
                )}>

                  {/* Question Content */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {/* Header of Card */}
                    <div className="p-8 border-b-2 border-black bg-gray-50/50">
                      <div className="flex items-center justify-between mb-6">
                        <span className={cn(
                          "px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider border-2 flex items-center gap-2",
                          masteryMeta.bg, masteryMeta.text, masteryMeta.border,
                          // masteryMeta.shadow
                        )}>
                          <masteryMeta.icon className="h-3.5 w-3.5" />
                          {currentMastery === "new" ? "Nouvelle" : currentMastery === "learning" ? "À apprendre" : currentMastery === "reviewing" ? "En révision" : "Maîtrisée"}
                        </span>

                        {revealAnswer && (
                          <motion.div
                            initial={{ scale: 0, rotate: -10 }}
                            animate={{ scale: 1, rotate: 0 }}
                            className={cn(
                              "flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider border-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]",
                              questionStatuses[current.id] === "correct"
                                ? "bg-[#BBF7D0] text-emerald-800 border-black"
                                : "bg-[#FBCFE8] text-rose-800 border-black"
                            )}
                          >
                            {questionStatuses[current.id] === "correct" ? (
                              <>Correct <Check className="h-4 w-4" strokeWidth={3} /></>
                            ) : (
                              <>Incorrect <X className="h-4 w-4" strokeWidth={3} /></>
                            )}
                          </motion.div>
                        )}
                      </div>

                      <div className="text-xl md:text-2xl font-bold leading-relaxed text-black">
                        <MarkdownRenderer content={current.prompt} />
                      </div>
                    </div>

                    {/* Options List */}
                    <div className="p-8 space-y-4 bg-white">
                      {normalisedOptions.map((option, index) => {
                        const isSelected = selectedOption === index
                        const isCorrectOption = revealAnswer && isOptionCorrect(option)
                        const isIncorrectSelection = revealAnswer && isSelected && !isCorrectOption

                        return (
                          <motion.button
                            key={`${current.id}-${index}`}
                            whileHover={!revealAnswer ? { scale: 1.01, x: 4 } : {}}
                            whileTap={!revealAnswer ? { scale: 0.99 } : {}}
                            onClick={() => !revealAnswer && setSelectedOption(index)}
                            disabled={revealAnswer}
                            className={cn(
                              "w-full p-5 rounded-xl border-2 text-left transition-all duration-200 flex items-center gap-5 group relative overflow-hidden",
                              // Default state
                              !revealAnswer && !isSelected && "bg-white border-black hover:bg-gray-50 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
                              // Selected state
                              !revealAnswer && isSelected && "bg-black border-black text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] translate-x-1 -translate-y-1",
                              // Correct state (revealed)
                              isCorrectOption && "bg-[#BBF7D0] border-black text-black shadow-[4px_4px_0px_0px_green]",
                              // Incorrect state (revealed)
                              isIncorrectSelection && "bg-[#FBCFE8] border-black text-black shadow-[4px_4px_0px_0px_red]",
                              // Unselected & Revealed
                              revealAnswer && !isSelected && !isCorrectOption && "opacity-40 grayscale border-gray-200"
                            )}
                          >
                            <div className={cn(
                              "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-sm font-black border-2 transition-colors",
                              isCorrectOption ? "bg-white border-black text-emerald-600" :
                                isIncorrectSelection ? "bg-white border-black text-rose-600" :
                                  isSelected ? "bg-[#8B5CF6] border-white text-white" :
                                    "bg-gray-100 border-black text-gray-500 group-hover:bg-black group-hover:text-white"
                            )}>
                              {String.fromCharCode(65 + index)}
                            </div>
                            <div className={cn("flex-1 text-base font-bold", isSelected && !revealAnswer ? "text-white" : "text-black")}>
                              <MarkdownRenderer content={option} />
                            </div>
                            {isCorrectOption && <CheckCircle2 className="h-6 w-6 text-black" fill="#4ade80" />}
                            {isIncorrectSelection && <XCircle className="h-6 w-6 text-black" fill="#f43f5e" />}
                          </motion.button>
                        )
                      })}

                      {/* Explanation */}
                      <AnimatePresence>
                        {revealAnswer && current.explanation && (
                          <motion.div
                            initial={{ height: 0, opacity: 0, y: 10 }}
                            animate={{ height: "auto", opacity: 1, y: 0 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="pt-6 mt-6"
                          >
                            <div className="p-6 rounded-2xl bg-[#BAE6FD] border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                              <div className="flex items-center gap-2 mb-3 text-sm font-black uppercase text-black">
                                <Sparkles className="h-4 w-4" />
                                Explication
                              </div>
                              <div className="text-black font-medium leading-relaxed">
                                <MarkdownRenderer content={current.explanation} />
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Footer Controls */}
                  <div className="flex-shrink-0 p-6 border-t-2 border-black bg-gray-50 flex items-center justify-between z-10 w-full">
                    <Button
                      variant="ghost"
                      onClick={handlePrevious}
                      disabled={currentIndex === 0}
                      className="text-gray-500 hover:text-black hover:bg-transparent font-bold"
                    >
                      <ChevronLeft className="h-5 w-5 mr-1" />
                      Précédent
                    </Button>

                    {!revealAnswer ? (
                      <Button
                        size="lg"
                        onClick={handleReveal}
                        disabled={selectedOption === null && normalisedOptions.length > 0}
                        className={cn(
                          "h-14 rounded-xl px-10 text-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] active:translate-y-[4px] active:shadow-none transition-all font-black uppercase text-base",
                          selectedOption !== null ? "bg-[#8B5CF6] hover:bg-[#7C3AED]" : "bg-gray-300 cursor-not-allowed text-gray-400"
                        )}
                      >
                        Vérifier
                        <ArrowRight className="h-5 w-5 ml-2" strokeWidth={3} />
                      </Button>
                    ) : (
                      <Button
                        size="lg"
                        onClick={handleNext}
                        className="h-14 rounded-xl px-10 bg-black text-white hover:bg-gray-900 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] active:translate-y-[4px] active:shadow-none transition-all font-black uppercase text-base"
                      >
                        {currentIndex === prioritizedQuestions.length - 1 ? "Terminer" : "Suivant"}
                        <ArrowRight className="h-5 w-5 ml-2" strokeWidth={3} />
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
