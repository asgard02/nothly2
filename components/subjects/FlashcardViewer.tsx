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

  // Fonction pour tronquer le texte si trop long - Memoized pour éviter les recalculs
  const truncateText = useCallback((text: string, maxLength: number = 300): string => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength).trim() + "..."
  }, [])

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
    <div className="h-full w-full flex flex-col items-center justify-start py-6 px-4 md:px-8 bg-transparent max-w-5xl mx-auto">
      <div className="w-full flex flex-col h-full">
        {/* Header avec mode et progression */}
        <div className="flex justify-between items-center mb-8 px-2">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <span className="text-black font-black text-lg">{currentIndex + 1}</span>
              <span className="text-gray-400 font-bold">/</span>
              <span className="text-gray-500 font-bold">{activeCards.length}</span>
            </div>

            <div className="flex bg-white p-1 rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <button
                onClick={() => setMode("all")}
                className={cn(
                  "px-4 py-1.5 text-xs font-black uppercase rounded-lg transition-all border-2",
                  mode === "all" ? "bg-black text-white border-black" : "bg-transparent text-gray-500 border-transparent hover:bg-gray-100"
                )}
              >
                Tout
              </button>
              <button
                onClick={() => setMode("smart")}
                className={cn(
                  "px-4 py-1.5 text-xs font-black uppercase rounded-lg transition-all flex items-center gap-1.5 border-2",
                  mode === "smart" ? "bg-[#FBCFE8] text-black border-black" : "bg-transparent text-gray-500 border-transparent hover:bg-gray-100"
                )}
              >
                <Zap className="h-3.5 w-3.5" strokeWidth={2.5} />
                Smart Review
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Info sur la carte actuelle (Box Leitner) */}
            <div className={cn(
              "hidden md:inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black tracking-wide uppercase transition-colors border-2",
              currentStat?.box
                ? "bg-[#BBF7D0] text-black border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                : "bg-white text-gray-500 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            )}>
              <Brain className="h-4 w-4" strokeWidth={2.5} />
              {currentStat ? `Niveau ${currentStat.box}/5` : "Nouvelle carte"}
            </div>

            {onClose && (
              <button
                onClick={onClose}
                className="p-2.5 rounded-xl bg-white hover:bg-black hover:text-white transition-all text-black border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-none"
                aria-label="Fermer"
              >
                <X className="h-5 w-5" strokeWidth={3} />
              </button>
            )}
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
                className="absolute inset-0 w-full h-full bg-[#FDF6E3] rounded-3xl border-4 border-black shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] flex flex-col overflow-hidden hover:-translate-y-2 hover:shadow-[20px_20px_0px_0px_rgba(0,0,0,1)] transition-all duration-300"
                style={{
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                }}
              >
                {/* Barre décorative en haut */}
                <div className="absolute top-0 left-0 w-full h-3 bg-black" />

                {/* Badge Question */}
                <div className="absolute top-8 left-8">
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-black border-3 border-black text-xs font-black tracking-wider uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                    <span className="text-lg">❓</span>
                    Question
                  </span>
                </div>

                {/* Contenu de la question */}
                <div className="flex-1 flex flex-col items-center justify-center px-16 py-20 text-center">
                  <div className="text-3xl md:text-5xl font-black text-black leading-tight max-w-2xl">
                    <MarkdownRenderer content={truncateText(current.question, 200)} />
                  </div>
                </div>

                {/* Indicateur subtil en bas */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
                  <div className="w-12 h-1 bg-black/20 rounded-full" />
                </div>
              </div>

              {/* Face arrière (Réponse) - Pré-rotée de 180deg */}
              <div
                className="absolute inset-0 w-full h-full bg-[#DDD6FE] rounded-3xl border-4 border-black shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] flex flex-col overflow-hidden"
                style={{
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                }}
              >
                {/* Barre décorative en haut */}
                <div className="absolute top-0 left-0 w-full h-3 bg-black" />

                {/* Badge Réponse */}
                <div className="absolute top-8 left-8">
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-black border-3 border-black text-xs font-black tracking-wider uppercase shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                    <span className="text-lg">💡</span>
                    Réponse
                  </span>
                </div>

                {/* Contenu de la réponse */}
                <div className="flex-1 flex flex-col items-center justify-center px-16 py-20 text-center">
                  <div className="text-2xl md:text-4xl font-bold text-black leading-relaxed max-w-2xl">
                    <MarkdownRenderer content={truncateText(current.answer, 250)} />
                  </div>
                </div>

                {/* Indicateur subtil en bas */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
                  <div className="w-12 h-1 bg-black/20 rounded-full" />
                </div>
              </div>
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="h-[120px] mt-12 flex justify-center items-center w-full max-w-2xl">
            <AnimatePresence mode="wait">
              {showButtons ? (
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
                    <div className="w-full h-16 rounded-xl bg-[#CD3244] border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center group-hover:bg-red-600 transition-colors">
                      <X className="h-8 w-8 text-white" strokeWidth={3} />
                    </div>
                    <span className="text-xs font-black uppercase text-gray-500 group-hover:text-black">Difficile</span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleStatus("moyen")
                    }}
                    className="flex flex-col items-center gap-3 group translate-y-2 hover:translate-y-0 transition-transform"
                  >
                    <div className="w-full h-16 rounded-xl bg-[#F59E0B] border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center group-hover:bg-amber-500 transition-colors">
                      <div className="text-2xl font-black text-white">~</div>
                    </div>
                    <span className="text-xs font-black uppercase text-gray-500 group-hover:text-black">Moyen</span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleStatus("acquis")
                    }}
                    className="flex flex-col items-center gap-3 group translate-y-2 hover:translate-y-0 transition-transform"
                  >
                    <div className="w-full h-16 rounded-xl bg-[#10B981] border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center group-hover:bg-emerald-500 transition-colors">
                      <div className="text-2xl font-black text-white">✓</div>
                    </div>
                    <span className="text-xs font-black uppercase text-gray-500 group-hover:text-black">Facile</span>
                  </button>
                </motion.div>
              ) : (
                <div className="flex flex-col items-center gap-2 animate-pulse">
                  <div className="px-6 py-3 bg-white border-2 border-black rounded-full shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-xs font-black uppercase tracking-wider">
                    Espace pour retourner
                  </div>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Barre de progression globale */}
        <div className="w-full max-w-2xl mx-auto h-2 bg-gray-200 rounded-full overflow-hidden border-2 border-black mt-8">
          <motion.div
            className="h-full bg-black"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>
    </div>
  )
}
