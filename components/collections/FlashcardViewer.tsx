"use client"

import { useEffect, useMemo, useState } from "react"
import { RefreshCw, ChevronLeft, ChevronRight, Eye, EyeOff } from "lucide-react"

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
}

function shuffleArray<T>(items: T[]): T[] {
  const result = items.slice()
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[result[index], result[swapIndex]] = [result[swapIndex], result[index]]
  }
  return result
}

export default function FlashcardViewer({ cards }: FlashcardViewerProps) {
  const [deck, setDeck] = useState(() => cards)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)

  useEffect(() => {
    setDeck(cards)
    setCurrentIndex(0)
    setShowAnswer(false)
  }, [cards])

  const current = deck[currentIndex]

  const progressLabel = useMemo(() => `Carte ${currentIndex + 1} / ${deck.length}`, [currentIndex, deck.length])

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % deck.length)
    setShowAnswer(false)
  }

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + deck.length) % deck.length)
    setShowAnswer(false)
  }

  const handleShuffle = () => {
    setDeck((prev) => shuffleArray(prev))
    setCurrentIndex(0)
    setShowAnswer(false)
  }

  if (!deck.length) {
    return null
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-3xl border border-border/60 bg-background/60 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-medium text-muted-foreground">{progressLabel}</span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleShuffle} className="gap-1">
              <RefreshCw className="h-4 w-4" />
              Mélanger
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePrevious} className="rounded-full">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleNext} className="rounded-full">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card/80 p-6">
          <p className="text-xs uppercase tracking-wide text-muted-foreground/70">Question</p>
          <div className="mt-2 text-sm text-foreground">
            <MarkdownRenderer content={current.question} />
          </div>

          <div className="mt-6">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowAnswer((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium"
            >
              {showAnswer ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showAnswer ? "Masquer la réponse" : "Afficher la réponse"}
            </Button>
          </div>

          <div
            className={cn(
              "mt-4 rounded-2xl border border-primary/30 bg-primary/5 p-4 text-sm transition-all duration-200",
              showAnswer ? "opacity-100" : "pointer-events-none opacity-0"
            )}
            aria-hidden={!showAnswer}
          >
            <p className="text-xs uppercase tracking-wide text-primary/70">Réponse</p>
            <div className="mt-2 text-primary">
              {showAnswer ? <MarkdownRenderer content={current.answer} /> : null}
            </div>
          </div>

          {current.tags?.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {current.tags.map((tag) => (
                <span
                  key={`${current.id}-${tag}`}
                  className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground"
                >
                  #{tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="rounded-3xl border border-border/40 bg-background/40">
        <details className="group rounded-3xl" open={deck.length <= 4}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-3xl px-4 py-3 text-sm font-medium text-muted-foreground transition hover:bg-muted/40">
            <span>Voir toutes les flashcards</span>
            <span className="text-xs text-muted-foreground/70">{deck.length} cartes</span>
          </summary>
          <div className="divide-y divide-border/40">
            {deck.map((card, index) => (
              <button
                key={card.id}
                type="button"
                onClick={() => {
                  setCurrentIndex(index)
                  setShowAnswer(false)
                }}
                className={cn(
                  "flex w-full flex-col items-start gap-1 px-4 py-3 text-left transition hover:bg-muted/40",
                  index === currentIndex && "bg-muted/40"
                )}
              >
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground/70">
                  Carte {index + 1}
                </span>
                <span className="line-clamp-2 text-sm text-foreground">{card.question}</span>
              </button>
            ))}
          </div>
        </details>
      </div>
    </div>
  )
}

