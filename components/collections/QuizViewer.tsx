"use client"

import { useEffect, useMemo, useState, useCallback, useRef } from "react"
// useRef importé pour suivre les IDs des questions précédentes
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

export default function QuizViewer({ questions, studyCollectionId, mode = "practice" }: QuizViewerProps) {
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
            // Si erreur 400, c'est normal (pas de zones de difficulté encore)
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
          // Ne pas afficher d'erreur si c'est juste qu'il n'y a pas encore de zones de difficulté
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
      // Filtrer les questions qui ont été ratées dans la session précédente
      // On utilise les stats actuelles pour identifier celles qui sont en "learning" ou ont des erreurs récentes
      filtered = questions.filter(q => {
        const stats = questionStats[q.id]
        return stats && (stats.incorrect_attempts > 0 || stats.mastery_level === "learning")
      })
    }

    if (mode !== "adaptive" && filterMode !== "mistakes") return filtered

    return [...filtered].sort((a, b) => {
      const statsA = questionStats[a.id]
      const statsB = questionStats[b.id]

      // Priorité : learning > reviewing > new > mastered
      const priority = { learning: 4, reviewing: 3, new: 2, mastered: 1 }
      const priorityA = priority[statsA?.mastery_level || "new"] || 2
      const priorityB = priority[statsB?.mastery_level || "new"] || 2

      if (priorityA !== priorityB) return priorityB - priorityA

      // Si même priorité, trier par nombre d'erreurs
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
      // On laisse le useEffect de prioritizedQuestions mettre à jour currentQuestionId
    } else {
      setFilterMode("all")
      // On laisse le useEffect de prioritizedQuestions mettre à jour currentQuestionId
    }
  }

  // Trouver l'index de la question actuelle dans prioritizedQuestions
  const currentIndex = useMemo(() => {
    if (!currentQuestionId || prioritizedQuestions.length === 0) return 0
    const index = prioritizedQuestions.findIndex(q => q.id === currentQuestionId)
    return index >= 0 ? index : 0
  }, [currentQuestionId, prioritizedQuestions])

  const current = prioritizedQuestions[currentIndex] || null

  // Réinitialiser seulement si les questions changent vraiment (nouveau quiz)
  // Pas si c'est juste un re-tri dû aux stats
  const previousQuestionsIds = useRef<Set<string>>(new Set())
  const isInitialMount = useRef(true)

  useEffect(() => {
    const currentQuestionsSet = new Set(prioritizedQuestions.map(q => q.id))
    const previousSet = previousQuestionsIds.current

    // Vérifier si c'est un nouveau quiz (nouvelles questions) ou juste un réordonnancement
    const isNewQuiz =
      previousSet.size === 0 ||
      currentQuestionsSet.size !== previousSet.size ||
      ![...currentQuestionsSet].every(id => previousSet.has(id))

    if (isNewQuiz) {
      // Nouveau quiz : réinitialiser
      previousQuestionsIds.current = currentQuestionsSet
      if (prioritizedQuestions.length > 0) {
        setCurrentQuestionId(prioritizedQuestions[0].id)
      }
      setSelectedOption(null)
      setRevealAnswer(false)
      setStartTime(Date.now())
      isInitialMount.current = false
    } else {
      // Juste un réordonnancement : préserver la question actuelle si elle existe toujours
      previousQuestionsIds.current = currentQuestionsSet
      if (currentQuestionId && !currentQuestionsSet.has(currentQuestionId)) {
        // Si la question actuelle n'existe plus dans la nouvelle liste, aller à la première
        if (prioritizedQuestions.length > 0) {
          setCurrentQuestionId(prioritizedQuestions[0].id)
        }
      }
    }

    // Toujours mettre à jour les statuts pour les nouvelles questions
    setQuestionStatuses((prev) => {
      const next: Record<string, QuizQuestionStatus> = {}
      prioritizedQuestions.forEach((question) => {
        next[question.id] = prev[question.id] ?? "pending"
      })
      return next
    })
  }, [prioritizedQuestions, currentQuestionId])

  // S'assurer que currentQuestionId est toujours valide
  useEffect(() => {
    if (!currentQuestionId && prioritizedQuestions.length > 0 && !isInitialMount.current) {
      setCurrentQuestionId(prioritizedQuestions[0].id)
    } else if (currentQuestionId && !prioritizedQuestions.find(q => q.id === currentQuestionId)) {
      // Si la question actuelle n'existe plus, aller à la première
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

  // Timer pour chaque question
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

  // Vérifier si le quiz est terminé
  useEffect(() => {
    if (prioritizedQuestions.length > 0 && answeredCount === prioritizedQuestions.length && !isFinished) {
      // Petit délai pour laisser l'utilisateur voir la dernière réponse
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

          // Mettre à jour les stats locales
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

  const handleSelectQuestion = (questionId: string) => {
    setCurrentQuestionId(questionId)
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
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-primary/10 mb-4">
            <Award className="h-12 w-12 text-primary" />
          </div>
          <h2 className="text-3xl font-bold">Session terminée !</h2>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            Vous avez répondu à toutes les questions. Voici votre résumé.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-6 w-full max-w-2xl">
          <div className="bg-card border rounded-xl p-6 shadow-sm">
            <div className="text-4xl font-bold text-primary mb-2">{accuracyPercent}%</div>
            <div className="text-sm text-muted-foreground font-medium">Précision</div>
          </div>
          <div className="bg-card border rounded-xl p-6 shadow-sm">
            <div className="text-4xl font-bold text-emerald-500 mb-2">{statusCounts.correct}</div>
            <div className="text-sm text-muted-foreground font-medium">Correctes</div>
          </div>
          <div className="bg-card border rounded-xl p-6 shadow-sm">
            <div className="text-4xl font-bold text-rose-500 mb-2">{statusCounts.incorrect}</div>
            <div className="text-sm text-muted-foreground font-medium">À revoir</div>
          </div>
        </div>

        <div className="flex items-center gap-4 pt-8">
          <Button
            variant="outline"
            size="lg"
            onClick={() => handleRestart(false)}
            className="h-12 px-8 text-base"
          >
            <RotateCcw className="mr-2 h-5 w-5" />
            Tout recommencer
          </Button>
          {statusCounts.incorrect > 0 && (
            <Button
              size="lg"
              onClick={() => {
                // Reset statuses for incorrect questions only? 
                // For now, let's just reset everything but maybe we can implement a "Review" mode later
                // Actually, let's just restart for now as per the alert above
                handleRestart(false)
              }}
              className="h-12 px-8 text-base shadow-lg hover:shadow-xl transition-all"
            >
              <Target className="mr-2 h-5 w-5" />
              Revoir les erreurs
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 h-full max-w-7xl mx-auto w-full px-4 py-6">
      {/* Header compact avec mode et progression */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
            <Brain className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">
              {mode === "adaptive" ? "Mode Adaptatif" : mode === "review" ? "Mode Révision" : "Mode Pratique"}
            </h2>
            <p className="text-xs text-muted-foreground">
              {progressLabel} • {answeredCount} répondu{answeredCount > 1 ? "es" : "e"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {weakAreas.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowWeakAreas(!showWeakAreas)}
              className="rounded-lg"
            >
              <AlertCircle className="h-4 w-4 mr-1.5" />
              Zones difficiles
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowStats(!showStats)}
            className="rounded-lg"
          >
            <BarChart3 className="h-4 w-4 mr-1.5" />
            {showStats ? "Masquer stats" : "Stats"}
          </Button>
          {weakAreas.length > 0 && (
            <Button
              variant="default"
              size="sm"
              onClick={async () => {
                if (!studyCollectionId || isGenerating) return
                setIsGenerating(true)
                try {
                  const response = await fetch("/api/quiz/generate-targeted", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      studyCollectionId,
                      type: "quiz",
                    }),
                  })

                  if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ error: "Erreur inconnue" }))
                    alert(`Erreur: ${errorData.error || `Erreur ${response.status}`}`)
                    return
                  }

                  const data = await response.json()
                  if (data.success) {
                    alert(`✅ ${data.itemsGenerated} questions ciblées générées avec succès !`)
                    window.location.reload()
                  } else {
                    alert(`Erreur: ${data.error || "Impossible de générer les questions"}`)
                  }
                } catch (error) {
                  console.error("Erreur génération:", error)
                  alert("Erreur lors de la génération des questions")
                } finally {
                  setIsGenerating(false)
                }
              }}
              disabled={isGenerating}
              className="rounded-lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  Génération...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-1.5" />
                  Générer ciblées
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Barre de progression principale */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Progression</span>
          <span className="font-semibold text-foreground">{progressPercent}%</span>
        </div>
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Zones de difficulté (collapsible) */}
      {showWeakAreas && weakAreas.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
              <h4 className="text-sm font-semibold text-foreground">Zones de difficulté</h4>
            </div>
            <span className="text-xs text-muted-foreground">{weakAreas.length} zone{weakAreas.length > 1 ? "s" : ""}</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {weakAreas.slice(0, 6).map((area, idx) => (
              <div
                key={area.tag}
                className="rounded-lg border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 p-3"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-foreground">#{area.tag}</span>
                  <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                    {Math.round(area.difficulty_score)}%
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {area.questions_count} erreur{area.questions_count > 1 ? "s" : ""}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Statistiques (collapsible) */}
      {showStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 rounded-xl border border-border bg-card p-4 animate-in fade-in slide-in-from-top-2">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-primary" />
              <p className="text-xs font-medium text-muted-foreground">Progression</p>
            </div>
            <p className="text-2xl font-bold text-foreground">{progressPercent}%</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <Award className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <p className="text-xs font-medium text-muted-foreground">Précision</p>
            </div>
            <p className="text-2xl font-bold text-foreground">{accuracyPercent}%</p>
            <p className="text-xs text-muted-foreground">{statusCounts.correct}/{answeredCount || 1}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <p className="text-xs font-medium text-muted-foreground">Réussies</p>
            </div>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{statusCounts.correct}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <XCircle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
              <p className="text-xs font-medium text-muted-foreground">À revoir</p>
            </div>
            <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">{statusCounts.incorrect}</p>
          </div>
        </div>
      )}

      {/* Contenu principal - Question et options */}
      <div className="flex-1 flex flex-col gap-4 min-h-0">
        {current ? (
          <div className="flex-1 flex flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-sm overflow-y-auto">
            {/* En-tête de la question */}
            <div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-border">
              <div className="flex items-center gap-2 flex-wrap">
                <div className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold",
                  masteryMeta.bg,
                  masteryMeta.text,
                  masteryMeta.border
                )}>
                  <masteryMeta.icon className="h-3 w-3" />
                  {currentMastery === "new" ? "Nouvelle" : currentMastery === "learning" ? "À apprendre" : currentMastery === "reviewing" ? "En révision" : "Maîtrisée"}
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/50 px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  {current?.question_type === "multiple_choice"
                    ? "QCM"
                    : current?.question_type === "true_false"
                      ? "Vrai / Faux"
                      : "Complétion"}
                </div>
                {timeSpent > 0 && (
                  <div className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/50 px-2.5 py-1 text-xs font-medium text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {Math.floor(timeSpent / 60)}:{(timeSpent % 60).toString().padStart(2, "0")}
                  </div>
                )}
                {currentStats && (
                  <div className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/50 px-2.5 py-1 text-xs font-medium text-muted-foreground">
                    <Zap className="h-3 w-3" />
                    {currentStats.total_attempts} tentative{currentStats.total_attempts > 1 ? "s" : ""}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevious}
                  className="rounded-lg"
                  disabled={currentIndex === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNext}
                  className="rounded-lg"
                  disabled={currentIndex === prioritizedQuestions.length - 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant={revealAnswer ? "secondary" : "default"}
                  size="sm"
                  onClick={handleReveal}
                  className="rounded-lg"
                  disabled={selectedOption === null && normalisedOptions.length > 0}
                >
                  {revealAnswer ? <EyeOff className="h-4 w-4 mr-1.5" /> : <Eye className="h-4 w-4 mr-1.5" />}
                  {revealAnswer ? "Masquer" : "Vérifier"}
                </Button>
              </div>
            </div>

            {/* Question */}
            <div className="space-y-4">
              <div className="text-base font-medium text-foreground leading-relaxed">
                <MarkdownRenderer content={current.prompt} />
              </div>

              {/* Options */}
              {normalisedOptions.length > 0 ? (
                <div className="space-y-2">
                  {normalisedOptions.map((option, index) => {
                    const isSelected = selectedOption === index
                    const isCorrectOption = revealAnswer && isOptionCorrect(option)
                    const isIncorrectSelection = revealAnswer && isSelected && !isCorrectOption

                    return (
                      <button
                        key={`${current.id}-${index}`}
                        type="button"
                        onClick={() => !revealAnswer && setSelectedOption(index)}
                        disabled={revealAnswer}
                        className={cn(
                          "w-full rounded-lg border-2 px-4 py-3 text-left text-sm transition-all relative",
                          !revealAnswer && isSelected && "border-primary bg-primary/5 text-primary shadow-sm",
                          !revealAnswer && !isSelected && "border-border bg-background hover:border-primary/50 hover:bg-primary/5",
                          isCorrectOption && "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300",
                          isIncorrectSelection && "border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300",
                          revealAnswer && !isSelected && !isCorrectOption && "opacity-50"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center text-xs font-bold mt-0.5",
                            isCorrectOption && "border-emerald-500 bg-emerald-500 text-white",
                            isIncorrectSelection && "border-rose-500 bg-rose-500 text-white",
                            !revealAnswer && isSelected && "border-primary bg-primary text-white",
                            !revealAnswer && !isSelected && "border-border bg-muted"
                          )}>
                            {String.fromCharCode(65 + index)}
                          </div>
                          <div className="flex-1">
                            <MarkdownRenderer content={option} />
                          </div>
                          {revealAnswer && (
                            <span className="flex-shrink-0">
                              {isCorrectOption ? (
                                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                              ) : isIncorrectSelection ? (
                                <XCircle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                              ) : null}
                            </span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className="rounded-lg border-2 border-dashed border-border bg-muted/30 px-4 py-3 text-center text-sm text-muted-foreground">
                  <p>Formule la réponse ou réfléchis avant de la révéler.</p>
                </div>
              )}

              {/* Réponse et explication */}
              {revealAnswer && (
                <div className="space-y-3 pt-2 animate-in fade-in slide-in-from-bottom-2">
                  <div className="rounded-lg border border-primary/40 bg-primary/5 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      <p className="text-xs font-semibold uppercase tracking-wide text-primary">Réponse correcte</p>
                    </div>
                    <div className="text-sm font-medium text-primary">
                      <MarkdownRenderer content={current.answer} />
                    </div>
                  </div>

                  {current.explanation && (
                    <div className="rounded-lg border border-border bg-muted/30 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Brain className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        <p className="text-xs font-semibold text-foreground">Explication</p>
                      </div>
                      <div className="text-sm text-muted-foreground leading-relaxed">
                        <MarkdownRenderer content={current.explanation} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tags */}
              {current.tags?.length ? (
                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border">
                  {current.tags.map((tag) => (
                    <span
                      key={`${current.id}-${tag}`}
                      className="inline-flex items-center gap-1 rounded-full bg-muted border border-border px-2 py-0.5 text-xs font-medium text-muted-foreground"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* Navigation rapide */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between text-xs mb-3">
            <span className="font-semibold text-foreground">Navigation</span>
            <span className="text-muted-foreground">{prioritizedQuestions.length} questions</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {prioritizedQuestions.map((question, idx) => {
              const status = questionStatuses[question.id] ?? "pending"
              const stats = questionStats[question.id]
              const mastery = stats?.mastery_level || "new"
              const masteryColor = MASTERY_COLORS[mastery]
              const isActive = question.id === currentQuestionId

              return (
                <button
                  key={question.id}
                  type="button"
                  onClick={() => handleSelectQuestion(question.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all",
                    isActive
                      ? "border-primary bg-primary/10 text-primary shadow-sm"
                      : cn(
                        masteryColor.border,
                        masteryColor.bg,
                        masteryColor.text,
                        "hover:opacity-80"
                      )
                  )}
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      status === "correct"
                        ? "bg-emerald-500"
                        : status === "incorrect"
                          ? "bg-rose-500"
                          : "bg-slate-400"
                    )}
                  />
                  {idx + 1}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
