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
import { useTheme } from "next-themes"

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
    bg: "bg-card",
    text: "text-foreground",
    border: "border-border",
    icon: CircleDashed,
    shadow: "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
  },
  learning: {
    bg: "bg-[#FBCFE8]", // Pink
    text: "text-foreground",
    border: "border-border",
    icon: AlertCircle,
    shadow: "shadow-[4px_4px_0px_0px_#BE185D] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
  },
  reviewing: {
    bg: "bg-[#FDE68A]", // Amber
    text: "text-foreground",
    border: "border-border",
    icon: RotateCcw,
    shadow: "shadow-[4px_4px_0px_0px_#B45309] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
  },
  mastered: {
    bg: "bg-[#BBF7D0]", // Green
    text: "text-foreground",
    border: "border-border",
    icon: Award,
    shadow: "shadow-[4px_4px_0px_0px_#15803D] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
  },
}

export default function QuizViewer({ questions, studySubjectId, mode = "practice", title, onClose }: QuizViewerProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === "dark"
  
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
        <div className="bg-card border-2 border-border rounded-3xl p-12 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] relative max-w-2xl w-full">

          <div className="space-y-6">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-[#BBF7D0] border-2 border-border shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] mb-4">
              <Award className="h-10 w-10 text-foreground" strokeWidth={2.5} />
            </div>

            <h2 className="text-4xl font-black uppercase text-foreground italic">Session terminée !</h2>
            <p className="text-muted-foreground font-bold text-lg max-w-md mx-auto">
              Vous avez répondu à toutes les questions. Voici votre résumé.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-6 w-full max-w-xl mx-auto mt-10">
            <div className="bg-[#BAE6FD] border-2 border-border rounded-xl p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
              <div className="text-4xl font-black text-foreground mb-1">{accuracyPercent}%</div>
              <div className="text-xs text-foreground font-bold uppercase">Précision</div>
            </div>
            <div className="bg-[#BBF7D0] border-2 border-border rounded-xl p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
              <div className="text-4xl font-black text-foreground mb-1">{statusCounts.correct}</div>
              <div className="text-xs text-foreground font-bold uppercase">Correctes</div>
            </div>
            <div className="bg-[#FBCFE8] border-2 border-border rounded-xl p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
              <div className="text-4xl font-black text-foreground mb-1">{statusCounts.incorrect}</div>
              <div className="text-xs text-foreground font-bold uppercase">À revoir</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-12">
            <Button
              variant="default"
              size="lg"
              onClick={() => handleRestart(false)}
              className="h-14 px-8 text-sm font-black uppercase rounded-xl bg-card text-foreground border-2 border-border hover:bg-muted shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:translate-y-[2px] active:translate-y-[4px] active:shadow-none transition-all"
            >
              <RotateCcw className="mr-2 h-5 w-5" />
              Tout recommencer
            </Button>
            {statusCounts.incorrect > 0 && (
              <Button
                size="lg"
                onClick={() => handleRestart(true)}
                className="h-14 px-8 text-sm font-black uppercase rounded-xl bg-foreground text-background hover:bg-primary border-2 border-border shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:translate-y-[2px] active:translate-y-[4px] active:shadow-none transition-all"
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
    <div className="h-full flex flex-col p-4 md:p-8 font-sans overflow-hidden">
      {/* Container Principal style QuizHub */}
      <div className="w-full max-w-5xl mx-auto h-full flex flex-col bg-background border-2 border-border rounded-3xl overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)]">

        {/* Header */}
        <div className="p-6 md:p-8 border-b-2 border-border flex items-center justify-between bg-card shrink-0">
          <div className="flex items-center gap-4">
            <span className="bg-[#FDE68A] dark:bg-[#FDE68A] text-[#1e3a8a] dark:text-[#1e3a8a] px-3 py-1 rounded-lg font-bold text-xs uppercase border-2 border-border shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
              Question {currentIndex + 1} / {prioritizedQuestions.length}
            </span>
            <div className="h-3 w-24 md:w-64 bg-muted rounded-full border-2 border-border overflow-hidden relative hidden sm:block">
              <motion.div
                className="absolute left-0 top-0 bottom-0 bg-primary h-full"
                initial={{ width: 0 }}
                animate={{ width: `${((currentIndex + 1) / prioritizedQuestions.length) * 100}%` }}
              />
            </div>
            {/* Mode badge */}
            <span className={cn(
              "hidden md:inline-flex px-2 py-0.5 rounded-md text-[10px] font-black uppercase border-2 border-border ml-2",
              mode === "adaptive" 
                ? "bg-[#FBCFE8] dark:bg-[#FBCFE8] text-[#1e3a8a] dark:text-[#1e3a8a]" 
                : "bg-[#BBF7D0] dark:bg-[#BBF7D0] text-[#1e3a8a] dark:text-[#1e3a8a]"
            )}>
              {mode === "adaptive" ? "Mode Adaptatif" : "Mode Pratique"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card border-2 border-border">
              <div className="flex items-center gap-1.5 text-xs font-black text-[#FDE68A] dark:text-[#FDE68A]">
                <CheckCircle2 className="h-4 w-4" />
                {statusCounts.correct}
              </div>
              <div className="w-0.5 h-4 bg-border/20" />
              <div className="flex items-center gap-1.5 text-xs font-black text-[#FDE68A] dark:text-[#FDE68A]">
                <XCircle className="h-4 w-4" />
                {statusCounts.incorrect}
              </div>
            </div>

            <button
              onClick={onClose}
              className="h-10 w-10 border-2 border-border rounded-lg flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors bg-card text-foreground"
            >
              <X className="h-6 w-6" strokeWidth={3} />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6 md:p-12 overflow-y-auto flex flex-col items-center justify-center w-full">
          <AnimatePresence mode="wait">
            {current && (
              <motion.div
                key={current.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="w-full max-w-4xl flex flex-col items-center"
              >
                {/* Question Text */}
                <h2 
                  className="text-3xl md:text-5xl font-black text-center mb-12 leading-tight"
                  style={{ color: revealAnswer ? (isDark ? "#93c5fd" : "#1e3a8a") : "#FDE68A" }}
                >
                  <div 
                    className="[&_*]:!text-inherit [&_p]:!text-inherit [&_strong]:!text-inherit [&_em]:!text-inherit"
                    style={{ color: revealAnswer ? (isDark ? "#93c5fd" : "#1e3a8a") : "#FDE68A" }}
                  >
                    <MarkdownRenderer content={current.prompt} />
                  </div>
                </h2>

                {/* Options Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                  {normalisedOptions.map((option, index) => {
                    const isSelected = selectedOption === index
                    const isCorrect = revealAnswer && isOptionCorrect(option)
                    const isIncorrectSelection = revealAnswer && isSelected && !isCorrect

                    // Determine styles based on state
                    // Default State (Neo-Brutalism) - Jaune/beige par défaut
                    let buttonStyle = "bg-card border-border hover:bg-muted"
                    let letterStyle = "bg-card text-foreground border-border"
                    let shadowStyle = "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
                    let textColor = "#FDE68A" // Jaune/beige par défaut

                    if (revealAnswer) {
                      if (isCorrect) {
                        // Correct Answer - Noir/bleu après validation
                        buttonStyle = "bg-[#dcfce7] dark:bg-emerald-950/30 border-[#16a34a]"
                        letterStyle = "bg-foreground text-background border-border"
                        shadowStyle = "shadow-[4px_4px_0px_0px_#16a34a] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
                        textColor = isDark ? "#93c5fd" : "#1e3a8a" // Bleu clair en dark mode, bleu foncé en light mode
                      } else if (isIncorrectSelection) {
                        // Wrong Selection - Noir/bleu après validation
                        buttonStyle = "bg-[#ffe4e6] dark:bg-red-950/30 border-[#e11d48]"
                        letterStyle = "bg-[#e11d48] text-white border-[#e11d48]"
                        shadowStyle = "shadow-[4px_4px_0px_0px_#e11d48] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
                        textColor = isDark ? "#93c5fd" : "#1e3a8a" // Bleu clair en dark mode, bleu foncé en light mode
                      } else {
                        // Unselected and not correct - Ghost style
                        buttonStyle = "bg-transparent border-border/20 cursor-not-allowed"
                        letterStyle = "bg-transparent text-muted-foreground border-border/20"
                        shadowStyle = "shadow-none"
                        textColor = "" // Utilise la couleur par défaut
                      }
                    } else if (isSelected) {
                      // Active Selection (before reveal) - Garde jaune/beige jusqu'à validation
                      buttonStyle = "bg-[#dcfce7] dark:bg-emerald-950/30 border-[#16a34a]"
                      letterStyle = "bg-foreground text-background border-border"
                      shadowStyle = "shadow-[4px_4px_0px_0px_#16a34a] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
                      textColor = "#FDE68A" // Jaune/beige même quand sélectionné
                    }

                    return (
                      <button
                        key={index}
                        onClick={() => !revealAnswer && setSelectedOption(index)}
                        className="group relative disabled:cursor-not-allowed w-full outline-none"
                        disabled={revealAnswer}
                      >
                        {/* Static Shadow Element if needed, or use CSS shadow on main element. Using box-shadow class is easier. */}

                        <div className={cn(
                          "relative border-2 rounded-2xl p-6 h-full min-h-[5rem] flex items-center gap-5 transition-all duration-200 text-left overflow-hidden",
                          buttonStyle,
                          shadowStyle,
                          !revealAnswer && !isSelected && "hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]"
                        )}>
                          <div className={cn(
                            "h-12 w-12 min-w-[3rem] rounded-xl border-2 flex flex-shrink-0 items-center justify-center font-black text-lg transition-colors",
                            letterStyle
                          )}>
                            {String.fromCharCode(65 + index)}
                          </div>

                          <div 
                            className="text-xl font-bold leading-tight flex-1"
                            style={textColor ? { color: textColor } : undefined}
                          >
                            <div 
                              className="[&_*]:!text-inherit [&_p]:!text-inherit [&_strong]:!text-inherit [&_em]:!text-inherit"
                              style={textColor ? { color: textColor } : undefined}
                            >
                              <MarkdownRenderer content={option} />
                            </div>
                          </div>

                          {revealAnswer && isCorrect && <Check className="ml-auto text-[#16a34a] h-8 w-8 flex-shrink-0" strokeWidth={3} />}
                          {revealAnswer && isIncorrectSelection && <X className="ml-auto text-[#e11d48] h-8 w-8 flex-shrink-0" strokeWidth={3} />}
                        </div>
                      </button>
                    )
                  })}
                </div>

                {/* Explanation Reveal */}
                <AnimatePresence>
                  {revealAnswer && current.explanation && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      className="w-full max-w-4xl mt-8 pt-6 border-t-2 border-border/10"
                    >
                      <div className="bg-[#BAE6FD] border-2 border-border rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
                        <div className="flex items-center gap-2 mb-2 font-black uppercase text-sm text-[#FDE68A] dark:text-[#FDE68A]">
                          <Sparkles className="h-4 w-4" /> Explication
                        </div>
                        <div className="font-medium text-[#FDE68A] dark:text-[#FDE68A]">
                          <div className="[&_*]:!text-inherit [&_p]:!text-inherit [&_strong]:!text-inherit [&_em]:!text-inherit" style={{ color: "#FDE68A" }}>
                            <MarkdownRenderer content={current.explanation} />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-6 md:p-8 bg-card border-t-2 border-border flex justify-between items-center shrink-0 w-full z-10">
          <div className="font-black text-xl hidden sm:block text-[#FDE68A] dark:text-[#FDE68A]">
            Score: {statusCounts.correct} / {prioritizedQuestions.length}
          </div>
          <div className="sm:hidden font-black text-base text-[#FDE68A] dark:text-[#FDE68A]">
            {statusCounts.correct}/{prioritizedQuestions.length}
          </div>

          <div className="flex gap-4">
            <Button
              variant="ghost"
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              className="hidden sm:flex text-[#FDE68A] dark:text-[#FDE68A]"
            >
              Précédent
            </Button>

            {!revealAnswer ? (
              <Button
                onClick={handleReveal}
                disabled={selectedOption === null}
                className="h-14 px-10 rounded-xl border-2 border-border bg-accent text-foreground hover:bg-accent/90 text-xl font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:translate-y-[2px] active:translate-y-[4px] active:shadow-none transition-all disabled:opacity-50 disabled:shadow-none disabled:translate-y-[4px]"
              >
                Vérifier
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                className="h-14 px-10 rounded-xl border-2 border-border bg-foreground text-background hover:bg-primary text-xl font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:translate-y-[2px] active:translate-y-[4px] active:shadow-none transition-all"
              >
                {currentIndex < prioritizedQuestions.length - 1 ? "Question Suivante" : "Terminer"} <ArrowRight className="ml-3 h-6 w-6" strokeWidth={3} />
              </Button>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
