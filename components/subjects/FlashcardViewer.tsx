"use client"

import { useEffect, useState, useCallback } from "react"
import { RotateCcw, X, Zap, Brain, ChevronRight, ChevronLeft } from "lucide-react"
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
  }, [mode, cards, stats])

  // Fonction pour tronquer le texte si trop long
  const truncateText = (text: string, maxLength: number = 300): string => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength).trim() + "..."
  }

  const handleFlip = useCallback(() => {
    const newFlippedState = !isFlipped
    setIsFlipped(newFlippedState)

    if (newFlippedState) {
      setTimeout(() => {
        setShowButtons(true)
      }, 300)
    } else {
      setShowButtons(false)
    }
  }, [isFlipped])

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.key === " ") {
        e.preventDefault()
        handleFlip()
      }
    }

    window.addEventListener("keydown", handleKeyPress)
    return () => window.removeEventListener("keydown", handleKeyPress)
  }, [isFlipped, handleFlip])

  if (!activeCards.length) {
    return null
  }

  const current = activeCards[currentIndex]
  const currentStat = stats[current.id]
  const progress = ((currentIndex + 1) / activeCards.length) * 100

  const handleStatus = async (status: "difficile" | "moyen" | "acquis") => {
    // Sauvegarder le progrès
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
          setStats(prev => ({
            ...prev,
            [current.id]: {
              ...prev[current.id],
              box: data.box,
              next_review_at: data.nextReview
            }
          }))
        }
      } catch (err) {
        console.error("Erreur sauvegarde flashcard:", err)
      }
    }

    // Marquer le statut et passer à la carte suivante
    setShowButtons(false)
    if (currentIndex < activeCards.length - 1) {
      setIsFlipped(false)
      setTimeout(() => setCurrentIndex(currentIndex + 1), 150)
    } else {
      setIsFlipped(false)
      setTimeout(() => setCurrentIndex(0), 150)
    }
  }

  const handleRestart = () => {
    setIsFlipped(false)
    setShowButtons(false)
    setCurrentIndex(0)
  }

  return (
    <div className="h-full w-full flex flex-col items-center justify-center p-6 md:p-8 bg-gradient-to-b from-background to-muted/20">
      <div className="w-full max-w-4xl mx-auto flex flex-col h-full justify-center">
        {/* Header avec mode et progression */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <span className="text-foreground font-bold">{currentIndex + 1}</span>
              <span className="text-muted-foreground/50">/</span>
              <span>{activeCards.length}</span>
            </div>

            <div className="h-8 w-[1px] bg-border/60 mx-2" />

            <div className="flex bg-muted/50 p-1 rounded-lg border border-border/40">
              <button
                onClick={() => setMode("all")}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-md transition-all",
                  mode === "all" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Tout
              </button>
              <button
                onClick={() => setMode("smart")}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5",
                  mode === "smart" ? "bg-background shadow-sm text-purple-600 dark:text-purple-400" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Zap className="h-3 w-3" />
                Smart Review
              </button>
            </div>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground border border-transparent hover:border-border/50"
              aria-label="Fermer"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Info sur la carte actuelle (Box Leitner) */}
        <div className="flex justify-center mb-6">
          <div className={cn(
            "inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase transition-colors",
            currentStat?.box
              ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
              : "bg-muted text-muted-foreground border border-border/50"
          )}>
            <Brain className="h-3.5 w-3.5" />
            {currentStat ? `Niveau ${currentStat.box}/5` : "Nouvelle carte"}
          </div>
        </div>

        {/* Scène 3D pour l'animation de flip */}
        <div
          className="w-full relative group"
          style={{
            perspective: '1200px',
            height: '450px',
            maxHeight: '60vh'
          }}
        >
          {/* Carte qui va tourner */}
          <div
            className={cn(
              "w-full h-full relative cursor-pointer transition-all duration-700 transform-style-preserve-3d",
              isFlipped && "rotate-y-180"
            )}
            onClick={handleFlip}
          >
            {/* Face avant (Question) */}
            <div
              className="absolute inset-0 w-full h-full bg-card/80 backdrop-blur-xl rounded-3xl shadow-xl border border-border/50 flex flex-col backface-hidden overflow-hidden hover:shadow-2xl hover:border-purple-500/20 transition-all"
              style={{
                transform: 'translateZ(0)',
              }}
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-500/50 to-transparent opacity-50" />

              {/* Contenu de la question */}
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                <span className="inline-block px-3 py-1 rounded-full bg-muted/50 text-muted-foreground text-[10px] font-bold tracking-widest uppercase mb-8 border border-border/50">
                  Question
                </span>
                <div className="text-2xl md:text-3xl font-medium text-foreground leading-relaxed max-w-3xl prose dark:prose-invert">
                  <MarkdownRenderer content={truncateText(current.question)} />
                </div>
                <p className="text-muted-foreground/60 text-sm mt-8 font-medium animate-pulse">
                  Cliquez pour retourner
                </p>
              </div>
            </div>

            {/* Face arrière (Réponse) - Pré-rotée de 180deg */}
            <div
              className="absolute inset-0 w-full h-full bg-card/90 backdrop-blur-xl rounded-3xl shadow-xl border border-purple-500/20 flex flex-col backface-hidden overflow-hidden"
              style={{
                transform: 'rotateY(180deg) translateZ(0)',
              }}
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-indigo-500" />

              {/* Contenu de la réponse */}
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-gradient-to-b from-purple-500/5 to-transparent">
                <span className="inline-block px-3 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[10px] font-bold tracking-widest uppercase mb-8 border border-purple-500/20">
                  Réponse
                </span>
                <div className="text-2xl md:text-3xl font-medium text-foreground leading-relaxed max-w-3xl prose dark:prose-invert">
                  <MarkdownRenderer content={truncateText(current.answer)} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Boutons d'action */}
        <div className="min-h-[100px] mt-8 flex justify-center items-center">
          <AnimatePresence mode="wait">
            {showButtons ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="flex items-center gap-4 md:gap-8"
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleStatus("difficile")
                  }}
                  className="flex flex-col items-center gap-2 group"
                >
                  <div className="w-14 h-14 rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center border border-red-500/20 group-hover:bg-red-500 group-hover:text-white group-hover:shadow-lg group-hover:shadow-red-500/30 transition-all duration-300">
                    <X className="h-6 w-6" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">Difficile</span>
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleStatus("moyen")
                  }}
                  className="flex flex-col items-center gap-2 group"
                >
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20 group-hover:bg-amber-500 group-hover:text-white group-hover:shadow-lg group-hover:shadow-amber-500/30 transition-all duration-300">
                    <div className="text-lg font-bold">~</div>
                  </div>
                  <span className="text-xs font-medium text-muted-foreground group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">Moyen</span>
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleStatus("acquis")
                  }}
                  className="flex flex-col items-center gap-2 group"
                >
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 group-hover:bg-emerald-500 group-hover:text-white group-hover:shadow-lg group-hover:shadow-emerald-500/30 transition-all duration-300">
                    <div className="text-lg font-bold">✓</div>
                  </div>
                  <span className="text-xs font-medium text-muted-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">Facile</span>
                </button>
              </motion.div>
            ) : (
              <div className="h-14 flex items-center text-muted-foreground/40 text-sm font-medium">
                Appuyez sur Espace pour retourner
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Barre de progression globale */}
        <div className="w-full h-1 bg-muted rounded-full overflow-hidden mt-8">
          <motion.div
            className="h-full bg-gradient-to-r from-purple-500 to-indigo-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>
    </div>
  )
}
