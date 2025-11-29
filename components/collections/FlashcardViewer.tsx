"use client"

import { useEffect, useState } from "react"
import { RotateCcw, X, Zap, Brain } from "lucide-react"
import MarkdownRenderer from "@/components/MarkdownRenderer"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

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
}

export default function FlashcardViewer({ cards, onClose, studyCollectionId }: FlashcardViewerProps & { studyCollectionId?: string }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [showButtons, setShowButtons] = useState(false)
  const [stats, setStats] = useState<Record<string, any>>({})
  const [mode, setMode] = useState<"all" | "smart">("all")
  const [activeCards, setActiveCards] = useState<FlashcardItem[]>(cards)

  // Charger les stats
  useEffect(() => {
    if (studyCollectionId) {
      fetch(`/api/flashcards/progress?studyCollectionId=${studyCollectionId}`)
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
  }, [studyCollectionId])

  // Filtrer les cartes en mode Smart
  useEffect(() => {
    if (mode === "smart") {
      const now = new Date()
      const dueCards = cards.filter(card => {
        const stat = stats[card.id]
        if (!stat) return true // Nouvelle carte -> à étudier
        return new Date(stat.next_review_at) <= now // Date passée -> à réviser
      })
      // Si aucune carte due, on montre tout (ou un message de félicitations ?)
      // Pour l'instant on montre tout trié par priorité (box la plus faible)
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
  const truncateText = (text: string, maxLength: number = 200): string => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength).trim() + "..."
  }

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.key === " ") {
        e.preventDefault()
        setIsFlipped(!isFlipped)
      }
    }

    window.addEventListener("keydown", handleKeyPress)
    return () => window.removeEventListener("keydown", handleKeyPress)
  }, [isFlipped])

  if (!activeCards.length) {
    return null
  }

  const current = activeCards[currentIndex]
  const currentStat = stats[current.id]
  const progress = ((currentIndex + 1) / activeCards.length) * 100

  const handleFlip = () => {
    const newFlippedState = !isFlipped
    setIsFlipped(newFlippedState)

    // Délai pour afficher les boutons après le début du flip
    if (newFlippedState) {
      setTimeout(() => {
        setShowButtons(true)
      }, 300) // Affiche les boutons à mi-parcours du flip
    } else {
      setShowButtons(false)
    }
  }

  const handleStatus = async (status: "difficile" | "moyen" | "acquis") => {
    // Sauvegarder le progrès
    if (studyCollectionId) {
      const quality = status === "acquis" ? "easy" : status === "moyen" ? "medium" : "hard"
      try {
        const res = await fetch("/api/flashcards/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            flashcardId: current.id,
            quality,
            studyCollectionId
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
      setCurrentIndex(currentIndex + 1)
    } else {
      // Si c'est la dernière carte, on peut recommencer ou fermer
      setIsFlipped(false)
      setCurrentIndex(0)
    }
  }

  const handleRestart = () => {
    setIsFlipped(false)
    setShowButtons(false)
    setCurrentIndex(0)
  }

  return (
    <div className="h-full w-full flex flex-col items-center justify-center p-6 md:p-8">
      <div className="w-full max-w-4xl mx-auto flex flex-col h-full justify-center">
        {/* Header avec mode et progression */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-foreground">
              {currentIndex + 1}/{activeCards.length}
            </h2>
            <div className="flex bg-muted rounded-lg p-1">
              <button
                onClick={() => setMode("all")}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-md transition-all",
                  mode === "all" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Tout
              </button>
              <button
                onClick={() => setMode("smart")}
                className={cn(
                  "px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5",
                  mode === "smart" ? "bg-background shadow text-primary" : "text-muted-foreground hover:text-foreground"
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
              className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              aria-label="Fermer"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Info sur la carte actuelle (Box Leitner) */}
        {currentStat && (
          <div className="flex justify-center mb-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
              <Brain className="h-3 w-3" />
              Niveau {currentStat.box || 1}/5
            </div>
          </div>
        )}

        {/* Scène 3D pour l'animation de flip */}
        <div
          className="w-full"
          style={{
            perspective: '1000px',
            height: '500px',
            maxHeight: '70vh'
          }}
        >
          {/* Carte qui va tourner */}
          <div
            className={cn(
              "w-full h-full relative cursor-pointer transition-transform transform-style-preserve-3d",
              isFlipped && "rotate-y-180"
            )}
            onClick={handleFlip}
            style={{
              WebkitFontSmoothing: 'antialiased',
              transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
              transitionDuration: '600ms',
              transitionTimingFunction: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
            }}
          >
            {/* Face avant (Question) */}
            <div
              className="absolute inset-0 w-full h-full bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-border/40 flex flex-col backface-hidden"
              style={{
                transform: 'translateZ(0)',
              }}
            >
              {/* Contenu de la question */}
              <div className="flex-1 flex flex-col items-center justify-center p-12 md:p-16 text-center">
                {/* Badge QUESTION */}
                <span className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-full text-sm font-bold tracking-wide mb-8">
                  QUESTION
                </span>
                {/* Question */}
                <div className="text-3xl md:text-4xl font-semibold text-gray-800 dark:text-gray-100 leading-relaxed max-w-4xl [&_.prose]:text-3xl [&_.prose]:md:text-4xl [&_.prose]:font-semibold [&_.prose]:text-gray-800 [&_.prose_dark]:text-gray-100">
                  <MarkdownRenderer content={truncateText(current.question)} />
                </div>
                {/* Instruction */}
                <p className="text-gray-400 dark:text-gray-400 text-base mt-6">
                  Cliquez pour voir la réponse
                </p>
              </div>

              {/* Barre de progression */}
              <div className="h-2 bg-gray-100 dark:bg-gray-700 w-full">
                <div
                  className="h-2 bg-indigo-500 dark:bg-indigo-400 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Face arrière (Réponse) - Pré-rotée de 180deg */}
            <div
              className="absolute inset-0 w-full h-full bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-border/40 flex flex-col backface-hidden"
              style={{
                transform: 'rotateY(180deg) translateZ(0)',
              }}
            >
              {/* Contenu de la réponse */}
              <div className="flex-1 flex flex-col items-center justify-center p-12 md:p-16 text-center">
                {/* Badge RÉPONSE */}
                <span className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 px-4 py-2 rounded-full text-sm font-bold tracking-wide mb-8">
                  RÉPONSE
                </span>
                {/* Réponse */}
                <div className="text-3xl md:text-4xl font-semibold text-gray-800 dark:text-gray-100 leading-relaxed max-w-4xl [&_.prose]:text-3xl [&_.prose]:md:text-4xl [&_.prose]:font-semibold [&_.prose]:text-gray-800 [&_.prose_dark]:text-gray-100">
                  <MarkdownRenderer content={truncateText(current.answer)} />
                </div>
                {/* Instruction */}
                <p className="text-gray-400 dark:text-gray-400 text-base mt-6">
                  Cliquez pour revenir à la question
                </p>
              </div>

              {/* Barre de progression */}
              <div className="h-2 bg-gray-100 dark:bg-gray-700 w-full">
                <div
                  className="h-2 bg-indigo-500 dark:bg-indigo-400 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Boutons d'action - Espace réservé pour éviter le saut */}
        <div className="min-h-[120px] mt-10 flex justify-center items-start">
          <div
            className={cn(
              "flex justify-center gap-6 transition-all duration-400 ease-out",
              showButtons
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-4 pointer-events-none"
            )}
          >
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleStatus("difficile")
              }}
              className="flex flex-col items-center gap-3 group"
            >
              <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400 flex items-center justify-center shadow-lg border-2 border-transparent group-hover:border-red-400 dark:group-hover:border-red-500 transition-all text-3xl group-hover:scale-110">
                ❌
              </div>
              <span className="text-sm text-foreground font-medium">Difficile</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleStatus("moyen")
              }}
              className="flex flex-col items-center gap-3 group"
            >
              <div className="w-16 h-16 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 flex items-center justify-center shadow-lg border-2 border-transparent group-hover:border-yellow-400 dark:group-hover:border-yellow-500 transition-all text-3xl group-hover:scale-110">
                🤔
              </div>
              <span className="text-sm text-foreground font-medium">Moyen</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleStatus("acquis")
              }}
              className="flex flex-col items-center gap-3 group"
            >
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center shadow-lg border-2 border-transparent group-hover:border-green-400 dark:group-hover:border-green-500 transition-all text-3xl group-hover:scale-110">
                ✅
              </div>
              <span className="text-sm text-foreground font-medium">Facile</span>
            </button>
          </div>
        </div>

        {/* Bouton recommencer */}
        {currentIndex > 0 && (
          <div className="flex justify-center mt-8">
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleRestart()
              }}
              className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-muted"
            >
              <RotateCcw className="h-4 w-4" />
              Recommencer
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
