"use client"

import { useEffect, useMemo, useState } from "react"
import {
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  LayoutDashboard,
  Grid3X3,
  CircleDashed,
  Brain,
  CheckCircle2,
} from "lucide-react"

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

type FlashcardStatus = "todo" | "learning" | "mastered"

const STATUS_META: Record<
  FlashcardStatus,
  {
    label: string
    description: string
    badge: string
    progress: string
    icon: typeof CircleDashed | typeof Brain | typeof CheckCircle2
  }
> = {
  todo: {
    label: "À revoir",
    description: "Cartes encore jamais validées",
    badge: "border-amber-200 bg-amber-50 text-amber-700",
    progress: "bg-amber-400",
    icon: CircleDashed,
  },
  learning: {
    label: "En cours",
    description: "Cartes travaillées récemment",
    badge: "border-sky-200 bg-sky-50 text-sky-700",
    progress: "bg-sky-400",
    icon: Brain,
  },
  mastered: {
    label: "Acquis",
    description: "Cartes maîtrisées",
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
    progress: "bg-emerald-500",
    icon: CheckCircle2,
  },
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
  const [cardStatuses, setCardStatuses] = useState<Record<string, FlashcardStatus>>({})
  const [viewMode, setViewMode] = useState<"focus" | "grid">("focus")
  const [statusFilter, setStatusFilter] = useState<FlashcardStatus | "all">("all")

  useEffect(() => {
    setDeck(cards)
    setCurrentIndex(0)
    setShowAnswer(false)
    setCardStatuses((prev) => {
      const next: Record<string, FlashcardStatus> = {}
      cards.forEach((card) => {
        next[card.id] = prev[card.id] ?? "todo"
      })
      return next
    })
  }, [cards])

  const current = deck[currentIndex]

  const progressLabel = useMemo(() => `Carte ${currentIndex + 1} / ${deck.length}`, [currentIndex, deck.length])

  const indexById = useMemo(
    () =>
      deck.reduce<Record<string, number>>((accumulator, card, index) => {
        accumulator[card.id] = index
        return accumulator
      }, {}),
    [deck]
  )

  const statusCounts = useMemo(() => {
    const initialCounts: Record<FlashcardStatus, number> = {
      todo: 0,
      learning: 0,
      mastered: 0,
    }
    for (const card of deck) {
      const status = cardStatuses[card.id] ?? "todo"
      initialCounts[status] += 1
    }
    return initialCounts
  }, [cardStatuses, deck])

  const completionPercent = deck.length ? Math.round((statusCounts.mastered / deck.length) * 100) : 0

  const filterOptions = useMemo<
    Array<{
      value: FlashcardStatus | "all"
      label: string
    }>
  >(
    () => [
      { value: "all", label: "Toutes" },
      { value: "todo", label: STATUS_META.todo.label },
      { value: "learning", label: STATUS_META.learning.label },
      { value: "mastered", label: STATUS_META.mastered.label },
    ],
    []
  )

  const filteredCards = useMemo(() => {
    if (statusFilter === "all") return deck
    return deck.filter((card) => (cardStatuses[card.id] ?? "todo") === statusFilter)
  }, [deck, cardStatuses, statusFilter])

  const currentStatus: FlashcardStatus = current ? cardStatuses[current.id] ?? "todo" : "todo"

  const handleStatusChange = (cardId: string, status: FlashcardStatus) => {
    setCardStatuses((prev) => ({
      ...prev,
      [cardId]: status,
    }))
  }

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

  const handleSelectCard = (cardId: string) => {
    const index = indexById[cardId]
    if (typeof index === "number") {
      setCurrentIndex(index)
      setShowAnswer(false)
      setViewMode("focus")
    }
  }

  if (!deck.length) {
    return null
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-5 rounded-3xl border border-border/60 bg-background/60 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/60">Pilotage de session</p>
            <h3 className="text-lg font-semibold text-foreground">Tableau de révision</h3>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleShuffle} className="gap-1">
              <RefreshCw className="h-4 w-4" />
              Relancer l'ordre
            </Button>
            <div className="flex items-center gap-1 rounded-full bg-muted/30 p-1">
              <button
                type="button"
                onClick={() => setViewMode("focus")}
                className={cn(
                  "flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition",
                  viewMode === "focus"
                    ? "bg-background text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <LayoutDashboard className="h-3 w-3" />
                Mode focus
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={cn(
                  "flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition",
                  viewMode === "grid"
                    ? "bg-background text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Grid3X3 className="h-3 w-3" />
                Mini cartes
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {(Object.keys(STATUS_META) as FlashcardStatus[]).map((status) => {
            const meta = STATUS_META[status]
            return (
              <div key={status} className="rounded-2xl border border-border/50 bg-card/70 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">{meta.label}</p>
                    <p className="mt-1 text-2xl font-semibold text-foreground">{statusCounts[status]}</p>
                  </div>
                  <span className={cn("flex h-9 w-9 items-center justify-center rounded-full border text-xs", meta.badge)}>
                    <meta.icon className="h-4 w-4" />
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{meta.description}</p>
              </div>
            )
          })}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Progression générale</span>
            <span>{completionPercent}% acquis</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-border/50">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${completionPercent}%` }} />
          </div>
        </div>
      </div>

      {viewMode === "focus" ? (
        <div className="flex flex-col gap-5 rounded-3xl border border-border/60 bg-background/80 p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-muted/20 px-3 py-1 text-xs font-medium text-muted-foreground">
              <LayoutDashboard className="h-3 w-3" />
              {progressLabel}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handlePrevious} className="rounded-full">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={handleNext} className="rounded-full">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowAnswer((prev) => !prev)} className="gap-1 rounded-full">
                {showAnswer ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showAnswer ? "Masquer la réponse" : "Afficher la réponse"}
              </Button>
            </div>
          </div>

          {current ? (
            <div className="rounded-2xl border border-border/70 bg-card/80 p-6">
              <p className="text-xs uppercase tracking-wide text-muted-foreground/70">Question</p>
              <div className="mt-2 text-sm text-foreground">
                <MarkdownRenderer content={current.question} />
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">
                  Marquage rapide
                </span>
                {(Object.keys(STATUS_META) as FlashcardStatus[]).map((status) => {
                  const meta = STATUS_META[status]
                  const isActive = currentStatus === status
                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() => handleStatusChange(current.id, status)}
                      className={cn(
                        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition",
                        isActive
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-muted/30 text-muted-foreground hover:border-primary/40"
                      )}
                    >
                      <meta.icon className="h-3 w-3" />
                      {meta.label}
                    </button>
                  )
                })}
              </div>

              <div
                className={cn(
                  "mt-5 rounded-2xl border border-primary/30 bg-primary/5 p-4 text-sm transition-all duration-200",
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
          ) : null}

          <div className="rounded-2xl border border-border/40 bg-muted/20 p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Navigation rapide</span>
              <span>{deck.length} cartes</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {deck.map((card) => {
                const status = cardStatuses[card.id] ?? "todo"
                const meta = STATUS_META[status]
                const index = indexById[card.id]
                const isActive = index === currentIndex
                return (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => handleSelectCard(card.id)}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition",
                      isActive
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background/80 text-muted-foreground hover:border-primary/40"
                    )}
                  >
                    <span className={cn("h-2 w-2 rounded-full", meta.progress)} />
                    Carte {index + 1}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4 rounded-3xl border border-border/60 bg-background/80 p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Mini cartes</p>
              <p className="text-xs text-muted-foreground">
                Filtre les cartes par statut et clique pour ouvrir le mode focus.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1 rounded-full bg-muted/30 p-1">
              {filterOptions.map(({ value, label }) => {
                const isActive = statusFilter === value
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setStatusFilter(value)}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-medium transition",
                      isActive ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {filteredCards.length ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredCards.map((card) => {
                const status = cardStatuses[card.id] ?? "todo"
                const meta = STATUS_META[status]
                const index = indexById[card.id]
                const compactAnswer = card.answer.replace(/\s+/g, " ").trim()
                const answerPreview = compactAnswer.slice(0, 140)
                const hasMore = compactAnswer.length > 140
                const isActive = index === currentIndex
                return (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => handleSelectCard(card.id)}
                    className={cn(
                      "group flex h-full flex-col rounded-2xl border border-border/50 bg-card/70 p-4 text-left transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-md",
                      isActive && "border-primary shadow-primary/20"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs font-medium text-muted-foreground/70">
                      <span className="inline-flex items-center gap-1">
                        <span className={cn("h-2 w-2 rounded-full", meta.progress)} />
                        Carte {index + 1}
                      </span>
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide",
                          meta.badge
                        )}
                      >
                        {meta.label}
                      </span>
                    </div>
                    <p className="mt-3 line-clamp-3 text-sm text-foreground">{card.question}</p>
                    <p className="mt-3 line-clamp-2 text-xs text-muted-foreground/80">
                      {answerPreview}
                      {hasMore ? "…" : ""}
                    </p>
                    {card.tags?.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {card.tags.slice(0, 3).map((tag) => (
                          <span
                            key={`${card.id}-${tag}`}
                            className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-[10px] font-medium text-muted-foreground"
                          >
                            #{tag}
                          </span>
                        ))}
                        {card.tags.length > 3 && (
                          <span className="text-[10px] text-muted-foreground/70">+{card.tags.length - 3}</span>
                        )}
                      </div>
                    ) : null}
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border/50 bg-muted/20 p-6 text-sm text-muted-foreground">
              Aucune carte dans ce filtre. Marque tes cartes ou reviens sur "Toutes".
            </div>
          )}
        </div>
      )}
    </div>
  )
}

