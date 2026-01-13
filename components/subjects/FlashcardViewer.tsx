"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { RotateCcw, X, Zap, Brain, ChevronRight, ChevronLeft, ArrowRight, HelpCircle } from "lucide-react"
import MarkdownRenderer from "@/components/MarkdownRenderer"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"

export interface FlashcardItem {
  id: string
  question: string
  answer: string
  tags: string[]
  order_index: number
}

interface FlashcardViewerProps {
  cards: FlashcardItem[]
  onClose?: () => void
  studySubjectId?: string
}

export default function FlashcardViewer({ cards, onClose, studySubjectId }: FlashcardViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [showButtons, setShowButtons] = useState(false)
  const [stats, setStats] = useState<Record<string, any>>({})
  const [mode, setMode] = useState<"all" | "smart">("all")
  const [activeCards, setActiveCards] = useState<FlashcardItem[]>(cards)

  // Nouveaux états pour le résumé de fin de session
  const [showSummary, setShowSummary] = useState(false)
  const [sessionResults, setSessionResults] = useState<Record<string, "difficile" | "moyen" | "acquis">>({})

  // Charger les stats
  useEffect(() => {
    if (studySubjectId) {
      fetch(`/api/flashcards/progress?studySubjectId=${studySubjectId}`)
        .then(res => res.json())
        .then(data => {
          if (data.stats) {
            const statsMap: Record<string, any> = {}
            data.stats.forEach((s: any) => {
              statsMap[s.flashcard_id] = s
            })
            setStats(statsMap)
          }
        })
        .catch(err => console.error("Erreur chargement stats flashcards:", err))
    }
  }, [studySubjectId])

  // Filtrer les cartes en mode Smart
  useEffect(() => {
    if (mode === "smart") {
      const now = new Date()
      const dueCards = cards.filter(card => {
        const stat = stats[card.id]
        if (!stat) return true // Nouvelle carte -> à étudier
        return new Date(stat.next_review_at) <= now // Date passée -> à réviser
      })

      if (dueCards.length === 0) {
        const sorted = [...cards].sort((a, b) => {
          const boxA = stats[a.id]?.box || 0
          const boxB = stats[b.id]?.box || 0
          return boxA - boxB
        })
        setActiveCards(sorted)
      } else {
        setActiveCards(dueCards)
      }
    } else {
      setActiveCards(cards)
    }
    setCurrentIndex(0)
    setIsFlipped(false)
    setShowSummary(false)
    // setSessionResults({}) // Ne pas reset ici auto, car ça wipe si stats change
  }, [mode, cards, stats])

  // Fonction pour tronquer le texte si trop long - Memoized pour éviter les recalculs
  const truncateText = useCallback((text: string, maxLength: number = 300): string => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength).trim() + "..."
  }, [])

  const handleFlip = useCallback(() => {
    if (showSummary) return

    const newFlippedState = !isFlipped
    setIsFlipped(newFlippedState)

    if (newFlippedState) {
      setTimeout(() => {
        setShowButtons(true)
      }, 300)
    } else {
      setShowButtons(false)
    }
  }, [isFlipped, showSummary])

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (showSummary) return
      if (e.code === "Space" || e.key === " ") {
        e.preventDefault()
        handleFlip()
      }
    }

    window.addEventListener("keydown", handleKeyPress)
    return () => window.removeEventListener("keydown", handleKeyPress)
  }, [isFlipped, handleFlip, showSummary])

  if (!activeCards.length) {
    return null
  }

  const current = activeCards[currentIndex]
  const currentStat = stats[current.id]
  const progress = ((currentIndex + 1) / activeCards.length) * 100

  const handleStatus = async (status: "difficile" | "moyen" | "acquis") => {
    // Enregistrer le résultat localement pour le résumé de fin
    setSessionResults(prev => ({
      ...prev,
      [current.id]: status
    }))

    // Sauvegarder le progrès en DB
    if (studySubjectId) {
      const quality = status === "acquis" ? "easy" : status === "moyen" ? "medium" : "hard"
      try {
        const res = await fetch("/api/flashcards/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            flashcardId: current.id,
            quality,
            studySubjectId
          })
        })
        const data = await res.json()
        if (data.success) {
          // On ne met PAS à jour les stats locales ici pour éviter de déclencher
          // le useEffect qui recalcule activeCards et reset la session.
          // La notification visuelle (Badge niveau) restera sur l'ancien niveau
          // le temps que la carte disparaisse, ce qui est acceptable.
          /*
          setStats(prev => ({
            ...prev,
            [current.id]: {
              ...prev[current.id],
              box: data.box,
              next_review_at: data.nextReview
            }
          }))
          */
        }
      } catch (err) {
        console.error("Erreur sauvegarde flashcard:", err)
      }
    }

    // Gérer la navigation
    setShowButtons(false)
    if (currentIndex < activeCards.length - 1) {
      // Passer à la suivante
      setIsFlipped(false)
      setTimeout(() => setCurrentIndex(currentIndex + 1), 150)
    } else {
      // Fin de la liste -> Afficher le résumé
      setIsFlipped(false)
      setTimeout(() => setShowSummary(true), 150)
    }
  }

  const handleRestart = () => {
    setIsFlipped(false)
    setShowButtons(false)
    setCurrentIndex(0)
    setShowSummary(false)
  }

  // --- RENDU DU RÉSUMÉ DE SESSION ---
  if (showSummary) {
    const difficultCount = Object.values(sessionResults).filter(r => r === "difficile").length
    const mediumCount = Object.values(sessionResults).filter(r => r === "moyen").length
    const easyCount = Object.values(sessionResults).filter(r => r === "acquis").length

    const handleRetryMissed = () => {
      // Filtrer pour ne garder que les difficiles et moyennes
      const cardsToRetry = activeCards.filter(c => {
        const res = sessionResults[c.id]
        return res === "difficile" || res === "moyen"
      })

      setActiveCards(cardsToRetry)
      setCurrentIndex(0)
      setIsFlipped(false)
      setShowSummary(false)
      setSessionResults({}) // Reset resultats pour la nouvelle session
    }

    return (
      <div className="h-full w-full flex flex-col items-center justify-center p-6 bg-transparent max-w-3xl mx-auto">
        <div className="w-full bg-card border-4 border-border shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] dark:shadow-[16px_16px_0px_0px_rgba(255,255,255,1)] rounded-3xl p-8 md:p-12 relative overflow-hidden">
          {/* Confetti ou déco */}
          <div className="absolute top-0 left-0 w-full h-4 bg-foreground" />

          <h2 className="text-4xl md:text-5xl font-black text-foreground mb-2 text-center uppercase tracking-tighter">
            Session Terminée !
          </h2>
          <p className="text-muted-foreground font-bold text-center mb-10 text-lg">
            Voici comment tu t'en es sorti
          </p>

          <div className="grid grid-cols-3 gap-4 mb-10">
            <div className="flex flex-col items-center p-4 bg-red-50 dark:bg-red-950/30 border-2 border-border rounded-2xl">
              <span className="text-4xl font-black text-[#CD3244] dark:text-red-400 mb-1">{difficultCount}</span>
              <span className="text-xs font-black uppercase text-muted-foreground tracking-wider">À Revoir</span>
            </div>
            <div className="flex flex-col items-center p-4 bg-amber-50 dark:bg-amber-950/30 border-2 border-border rounded-2xl">
              <span className="text-4xl font-black text-[#F59E0B] dark:text-amber-400 mb-1">{mediumCount}</span>
              <span className="text-xs font-black uppercase text-muted-foreground tracking-wider">Pas mal</span>
            </div>
            <div className="flex flex-col items-center p-4 bg-emerald-50 dark:bg-emerald-950/30 border-2 border-border rounded-2xl">
              <span className="text-4xl font-black text-[#10B981] dark:text-emerald-400 mb-1">{easyCount}</span>
              <span className="text-xs font-black uppercase text-muted-foreground tracking-wider">Maîtrisé</span>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {(difficultCount > 0 || mediumCount > 0) && (
              <button
                onClick={handleRetryMissed}
                className="w-full py-4 bg-foreground text-background text-lg font-black uppercase tracking-wider rounded-xl hover:bg-foreground/90 transition-colors shadow-[4px_4px_0px_0px_rgba(100,100,100,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] border-2 border-border active:translate-y-[2px] active:shadow-none flex items-center justify-center gap-3"
              >
                <RotateCcw className="h-5 w-5" />
                Réviser les erreurs ({difficultCount + mediumCount})
              </button>
            )}

            <button
              onClick={onClose}
              className="w-full py-4 bg-card text-foreground text-lg font-black uppercase tracking-wider rounded-xl hover:bg-muted transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] border-2 border-border active:translate-y-[2px] active:shadow-none"
            >
              Terminer pour aujourd'hui
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (currentIndex >= activeCards.length) return null

  return (
    <div className="h-full w-full flex flex-col items-center justify-start py-6 px-4 md:px-8 bg-transparent max-w-5xl mx-auto">
      <div className="w-full flex flex-col h-full">
        {/* Header avec mode et progression - Unified Toolbar */}
        <div className="w-full flex justify-center mb-8 px-4">
          <div className="flex flex-wrap items-center justify-between gap-4 p-2 bg-card border-2 border-border rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] w-full max-w-4xl">

            {/* Gauche: Compteur + Mode */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-xl border-2 border-transparent">
                <span className="text-foreground font-black">{currentIndex + 1}</span>
                <span className="text-muted-foreground font-bold">/</span>
                <span className="text-muted-foreground font-bold">{activeCards.length}</span>
              </div>

              <div className="h-8 w-0.5 bg-border/20 mx-1 hidden md:block" />

              <div className="flex bg-muted p-1 rounded-xl">
                <button
                  onClick={() => {
                    setMode("all")
                    setSessionResults({})
                  }}
                  className={cn(
                    "px-3 py-1.5 text-xs font-black uppercase rounded-lg transition-all",
                    mode === "all" ? "bg-foreground text-background shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-card/50"
                  )}
                >
                  Tout
                </button>
                <button
                  onClick={() => {
                    setMode("smart")
                    setSessionResults({})
                  }}
                  className={cn(
                    "px-3 py-1.5 text-xs font-black uppercase rounded-lg transition-all flex items-center gap-1.5",
                    mode === "smart" ? "bg-[#FBCFE8] text-foreground shadow-sm ring-1 ring-border/10" : "text-muted-foreground hover:text-foreground hover:bg-card/50"
                  )}
                >
                  <Zap className="h-3.5 w-3.5" strokeWidth={2.5} />
                  Smart
                </button>
              </div>
            </div>

            {/* Droite: Niveau + Fermer */}
            <div className="flex items-center gap-3">
              {/* Info sur la carte actuelle (Box Leitner) */}
              <div className={cn(
                "hidden md:inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-black tracking-wide uppercase transition-colors border-2",
                currentStat?.box
                  ? "bg-[#BBF7D0] text-foreground border-border"
                  : "bg-muted text-muted-foreground border-transparent"
              )}>
                <Brain className="h-4 w-4" strokeWidth={2.5} />
                {currentStat ? `Niveau ${currentStat.box}/5` : "Nouveau"}
              </div>

              {onClose && (
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl hover:bg-destructive/10 hover:text-destructive transition-colors text-foreground"
                  aria-label="Fermer"
                >
                  <X className="h-5 w-5" strokeWidth={3} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Scène 3D pour l'animation de flip */}
        <div className="flex-1 flex flex-col justify-center items-center min-h-[400px]">
          <div
            className="w-full max-w-2xl relative group cursor-pointer"
            style={{
              perspective: '1200px',
              height: '400px',
            }}
            onClick={handleFlip}
          >
            {/* Carte qui va tourner */}
            <div
              className={cn(
                "w-full h-full relative transition-all duration-700"
              )}
              style={{
                transformStyle: 'preserve-3d',
                transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
              }}>
              {/* Face avant (Question) */}
              <div
                className="absolute inset-0 w-full h-full bg-background rounded-3xl border-4 border-border shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] dark:shadow-[16px_16px_0px_0px_rgba(255,255,255,1)] flex flex-col overflow-hidden hover:-translate-y-2 hover:shadow-[20px_20px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[20px_20px_0px_0px_rgba(255,255,255,1)] transition-all duration-300"
                style={{
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                }}
              >
                {/* Barre décorative en haut */}
                <div className="absolute top-0 left-0 w-full h-3 bg-foreground" />

                {/* Barre de progression intégrée dans la carte */}
                <div className="absolute top-0 left-0 w-full h-1 bg-muted z-10">
                  <motion.div
                    className="h-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>

                {/* Badge Question */}
                <div className="absolute top-8 left-8">
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-card text-foreground border-3 border-border text-xs font-black tracking-wider uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]">
                    <span className="text-lg">❓</span>
                    Question
                  </span>
                </div>

                {/* Contenu de la question */}
                <div className="flex-1 flex flex-col items-center justify-center px-16 py-20 text-center">
                  <div className="text-3xl md:text-5xl font-black text-foreground leading-tight max-w-2xl">
                    <MarkdownRenderer content={truncateText(current.question, 200)} />
                  </div>
                </div>

                {/* Indicateur subtil en bas */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-xs font-bold text-muted-foreground uppercase tracking-widest animate-pulse">
                  Espace pour retourner
                </div>
              </div>

              {/* Face arrière (Réponse) - Pré-rotée de 180deg */}
              <div
                className="absolute inset-0 w-full h-full bg-[#DDD6FE] rounded-3xl border-4 border-border shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] dark:shadow-[16px_16px_0px_0px_rgba(255,255,255,1)] flex flex-col overflow-hidden"
                style={{
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                }}
              >
                {/* Barre décorative en haut */}
                <div className="absolute top-0 left-0 w-full h-3 bg-foreground" />

                {/* Badge Réponse */}
                <div className="absolute top-8 left-8">
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-card text-foreground border-3 border-border text-xs font-black tracking-wider uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]">
                    <span className="text-lg">💡</span>
                    Réponse
                  </span>
                </div>

                {/* Contenu de la réponse */}
                <div className="flex-1 flex flex-col items-center justify-center px-16 py-20 text-center">
                  <div className="text-2xl md:text-4xl font-bold text-foreground leading-relaxed max-w-2xl">
                    <MarkdownRenderer content={truncateText(current.answer, 250)} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="h-[120px] mt-12 flex justify-center items-center w-full max-w-2xl">
            <AnimatePresence mode="wait">
              {showButtons && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="grid grid-cols-3 gap-6 w-full"
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleStatus("difficile")
                    }}
                    className="flex flex-col items-center gap-3 group translate-y-2 hover:translate-y-0 transition-transform"
                  >
                    <div className="w-full h-16 rounded-xl bg-[#CD3244] border-2 border-border shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] flex items-center justify-center group-hover:bg-red-600 transition-colors">
                      <X className="h-8 w-8 text-white" strokeWidth={3} />
                    </div>
                    <span className="text-xs font-black uppercase text-muted-foreground group-hover:text-foreground">Difficile</span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleStatus("moyen")
                    }}
                    className="flex flex-col items-center gap-3 group translate-y-2 hover:translate-y-0 transition-transform"
                  >
                    <div className="w-full h-16 rounded-xl bg-[#F59E0B] border-2 border-border shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] flex items-center justify-center group-hover:bg-amber-500 transition-colors">
                      <div className="text-2xl font-black text-white">~</div>
                    </div>
                    <span className="text-xs font-black uppercase text-muted-foreground group-hover:text-foreground">Moyen</span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleStatus("acquis")
                    }}
                    className="flex flex-col items-center gap-3 group translate-y-2 hover:translate-y-0 transition-transform"
                  >
                    <div className="w-full h-16 rounded-xl bg-[#10B981] border-2 border-border shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] flex items-center justify-center group-hover:bg-emerald-500 transition-colors">
                      <div className="text-2xl font-black text-white">✓</div>
                    </div>
                    <span className="text-xs font-black uppercase text-muted-foreground group-hover:text-foreground">Facile</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}
