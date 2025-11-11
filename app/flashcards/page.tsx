"use client"

import { useEffect, useMemo, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { LucideIcon } from "lucide-react"

import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Clock,
  Layers,
  ListChecks,
  Loader2,
  PlusCircle,
  Sparkles,
  Tag,
  X,
} from "lucide-react"

import ChatButton from "@/components/ChatButton"
import Sidebar from "@/components/Sidebar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useCollections, useCollectionDetail } from "@/lib/hooks/useCollections"
import { useDocuments } from "@/lib/hooks/useDocuments"
import { cn } from "@/lib/utils"
import FlashcardViewer from "@/components/collections/FlashcardViewer"
import QuizViewer from "@/components/collections/QuizViewer"
import MarkdownRenderer from "@/components/MarkdownRenderer"

const CONTEXT_CHAR_LIMIT = Number(process.env.NEXT_PUBLIC_COLLECTION_CONTEXT_LIMIT_CHARS || 120_000)
const AVG_CHARS_PER_PAGE = Number(process.env.NEXT_PUBLIC_COLLECTION_AVG_CHARS_PER_PAGE || 2400)

function computeEstimatedCharacters(documents: any[] | undefined, selectedTags: string[]) {
  if (!documents || selectedTags.length === 0) {
    return { total: 0, matched: [] as any[] }
  }

  const matched = documents.filter((document) =>
    Array.isArray(document.tags) ? document.tags.some((tag: string) => selectedTags.includes(tag)) : false
  )

  const total = matched.reduce((sum, document) => {
    const latestVersion =
      document.current_version ??
      document.document_versions?.[document.document_versions.length - 1]

    if (!latestVersion) return sum
    const pageCount = latestVersion.page_count ?? 0
    return sum + pageCount * AVG_CHARS_PER_PAGE
  }, 0)

  return { total, matched }
}

const statusStyles: Record<string, { badge: string; dot: string; label: string }> = {
  processing: {
    badge: "bg-amber-100 text-amber-800 border border-amber-200",
    dot: "bg-amber-500",
    label: "Génération en cours",
  },
  ready: {
    badge: "bg-emerald-100 text-emerald-800 border border-emerald-200",
    dot: "bg-emerald-500",
    label: "Prête",
  },
  failed: {
    badge: "bg-rose-100 text-rose-700 border border-rose-200",
    dot: "bg-rose-500",
    label: "Échec",
  },
}

export default function CollectionsPage() {
  const queryClient = useQueryClient()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [collectionTitle, setCollectionTitle] = useState("")
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null)
  const [creationError, setCreationError] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState<"overview" | "flashcards" | "quiz">("overview")

  const { data: collections, isLoading: isLoadingCollections } = useCollections()
  const { data: documents } = useDocuments()
  const { data: collectionDetail, isLoading: isLoadingDetail, refetch: refetchDetail } =
    useCollectionDetail(selectedCollectionId)

  const availableTags = useMemo(() => {
    if (!documents?.length) return []
    const all = new Set<string>()
    for (const document of documents) {
      if (Array.isArray(document.tags)) {
        document.tags.forEach((tag) => all.add(tag))
      }
    }
    return Array.from(all).sort((a, b) => a.localeCompare(b))
  }, [documents])

  const { total: estimatedCharacters, matched } = useMemo(
    () => computeEstimatedCharacters(documents, selectedTags),
    [documents, selectedTags]
  )

  useEffect(() => {
    if (collections?.length && !selectedCollectionId) {
      setSelectedCollectionId(collections[0].id)
    }
  }, [collections, selectedCollectionId])

  useEffect(() => {
    if (!collectionDetail) {
      return
    }
    setActiveSection((current) => {
      if (current !== "overview") {
        return current
      }
      if (collectionDetail.flashcards.length > 0) {
        return "flashcards"
      }
      if (collectionDetail.quiz.length > 0) {
        return "quiz"
      }
      return "overview"
    })
  }, [collectionDetail])

  const orderedFlashcards = useMemo(() => {
    if (!collectionDetail?.flashcards) return []
    return [...collectionDetail.flashcards].sort((a, b) => a.order_index - b.order_index)
  }, [collectionDetail?.flashcards])

  const orderedQuiz = useMemo(() => {
    if (!collectionDetail?.quiz) return []
    return [...collectionDetail.quiz].sort((a, b) => a.order_index - b.order_index)
  }, [collectionDetail?.quiz])

  const collectionSummary =
    typeof collectionDetail?.metadata === "object" &&
    collectionDetail?.metadata !== null &&
    typeof (collectionDetail.metadata as Record<string, unknown>).summary === "string"
      ? ((collectionDetail.metadata as Record<string, unknown>).summary as string)
      : null

  const collectionNotes =
    typeof collectionDetail?.metadata === "object" &&
    collectionDetail?.metadata !== null &&
    Array.isArray((collectionDetail.metadata as Record<string, unknown>).notes)
      ? ((collectionDetail.metadata as Record<string, unknown>).notes as unknown[])
          .filter((entry): entry is string => typeof entry === "string")
      : []

  const hasOverviewContent =
    Boolean(collectionSummary) || collectionNotes.length > 0 || Boolean(collectionDetail?.sources?.length)

  const detailTabs: Array<{
    id: "overview" | "flashcards" | "quiz"
    label: string
    icon: LucideIcon
    disabled: boolean
  }> = [
    {
      id: "overview",
      label: "Synthèse",
      icon: BookOpen,
      disabled: !hasOverviewContent,
    },
    {
      id: "flashcards",
      label: `Flashcards (${orderedFlashcards.length})`,
      icon: Sparkles,
      disabled: orderedFlashcards.length === 0,
    },
    {
      id: "quiz",
      label: `Quiz (${orderedQuiz.length})`,
      icon: ListChecks,
      disabled: orderedQuiz.length === 0,
    },
  ]

  const contextRatio = CONTEXT_CHAR_LIMIT
    ? Math.min(estimatedCharacters / CONTEXT_CHAR_LIMIT, 1)
    : 0
  const contextPercent = Math.round(contextRatio * 100)
  const contextOverLimit = CONTEXT_CHAR_LIMIT ? estimatedCharacters > CONTEXT_CHAR_LIMIT : false

  const createCollection = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/collections", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: collectionTitle,
          tags: selectedTags,
        }),
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        throw new Error(payload.error || "Impossible de lancer la génération")
      }

      return res.json() as Promise<{ collectionId: string; jobId: string; status: string }>
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["collections"] })
      setIsDialogOpen(false)
      setCollectionTitle("")
      setSelectedTags([])
      setCreationError(null)
      setSelectedCollectionId(result.collectionId)
      setActiveSection("overview")
      await refetchDetail()
    },
    onError: (error: unknown) => {
      setCreationError(error instanceof Error ? error.message : "Impossible de créer la collection")
    },
  })

  useEffect(() => {
    if (!collections?.length) return
    const hasProcessing = collections.some((item) => item.status === "processing")
    if (!hasProcessing) return

    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["collections"] })
      if (selectedCollectionId) {
        queryClient.invalidateQueries({ queryKey: ["collection", selectedCollectionId] })
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [collections, queryClient, selectedCollectionId])

  const handleToggleTag = (tag: string) => {
    setSelectedTags((current) =>
      current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]
    )
  }

  const handleOpenDialog = (open: boolean) => {
    setIsDialogOpen(open)
    if (!open) {
      setSelectedTags([])
      setCollectionTitle("")
      setCreationError(null)
    }
  }

  const handleCreateCollection = () => {
    if (selectedTags.length === 0) {
      setCreationError("Sélectionne au moins un tag.")
      return
    }
    createCollection.mutate()
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="ml-64 flex-1 overflow-y-auto bg-muted/20">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-12">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">Collections de révision</h1>
              <p className="text-sm text-muted-foreground">
                Combine tes supports taggés pour générer automatiquement flashcards et quiz.
              </p>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={handleOpenDialog}>
              <DialogTrigger asChild>
                <Button className="inline-flex items-center gap-2 rounded-full px-4 py-2">
                  <PlusCircle className="h-4 w-4" />
                  Créer une collection
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Nouvelle collection</DialogTitle>
                  <DialogDescription>
                    Sélectionne les tags correspondant aux supports que tu souhaites regrouper. Nous te signalons si la
                    fenêtre de contexte risque d’être dépassée.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      Titre
                    </label>
                    <input
                      value={collectionTitle}
                      onChange={(event) => setCollectionTitle(event.target.value)}
                      placeholder="Ex. Révision Analyse - chapitres 1 à 3"
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-medium text-muted-foreground">Tags disponibles</label>
                    {availableTags.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Aucun tag pour le moment. Empile d’abord quelques supports depuis la bibliothèque.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {availableTags.map((tag) => {
                          const isSelected = selectedTags.includes(tag)
                          return (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => handleToggleTag(tag)}
                              className={cn(
                                "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition",
                                isSelected
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-border bg-muted/40 text-muted-foreground hover:border-primary/40"
                              )}
                            >
                              <Tag className="h-3 w-3" />
                              {tag}
                              {isSelected && <X className="h-3 w-3" />}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl border border-border/70 bg-muted/40 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">Fenêtre de contexte estimée</p>
                        <p className="text-xs text-muted-foreground">
                          {Math.round(estimatedCharacters / 4)} tokens (~{estimatedCharacters.toLocaleString("fr-FR")} caractères)
                        </p>
                      </div>
                      <span
                        className={cn(
                          "rounded-full px-3 py-1 text-xs font-medium",
                          contextOverLimit
                            ? "bg-rose-100 text-rose-700"
                            : contextPercent > 70
                            ? "bg-amber-100 text-amber-700"
                            : "bg-emerald-100 text-emerald-700"
                        )}
                      >
                        {contextPercent} %
                      </span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-border">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          contextOverLimit
                            ? "bg-rose-500"
                            : contextPercent > 70
                            ? "bg-amber-500"
                            : "bg-primary"
                        )}
                        style={{ width: `${Math.min(contextPercent, 100)}%` }}
                      />
                    </div>
                    {contextOverLimit && (
                      <p className="mt-2 text-xs text-rose-600">
                        La fenêtre de contexte dépasse la limite (~{CONTEXT_CHAR_LIMIT.toLocaleString("fr-FR")} caractères).
                        Tu peux quand même lancer la génération, mais certaines informations pourraient être tronquées.
                      </p>
                    )}
                    {matched.length > 0 && (
                      <div className="mt-4 space-y-1 text-xs text-muted-foreground">
                        <p className="font-medium text-foreground">Supports concernés</p>
                        {matched.map((document) => (
                          <div key={document.id} className="flex items-center justify-between">
                            <span>{document.title}</span>
                            <span className="text-muted-foreground/70">
                              {(document.current_version?.page_count ??
                                document.document_versions?.[document.document_versions.length - 1]?.page_count ??
                                0) || "—"}{" "}
                              pages
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {creationError && (
                    <div className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                      <AlertCircle className="mt-0.5 h-4 w-4" />
                      <span>{creationError}</span>
                    </div>
                  )}
                </div>

                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => handleOpenDialog(false)}>
                    Annuler
                  </Button>
                  <Button
                    type="button"
                    onClick={handleCreateCollection}
                    disabled={createCollection.isPending || availableTags.length === 0}
                  >
                    {createCollection.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Lancer la génération
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </header>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {isLoadingCollections ? (
              Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-32 animate-pulse rounded-3xl border border-border/60 bg-card/70"
                />
              ))
            ) : collections?.length ? (
              collections.map((collection) => {
                const status = statusStyles[collection.status] ?? statusStyles.processing
                return (
                  <button
                    key={collection.id}
                    onClick={() => setSelectedCollectionId(collection.id)}
                    className={cn(
                      "flex h-full flex-col rounded-3xl border border-border/60 bg-card/70 p-5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg",
                      selectedCollectionId === collection.id && "border-primary shadow-primary/20"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium", status.badge)}>
                        <span className={cn("h-2 w-2 rounded-full", status.dot)} />
                        {status.label}
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(collection.created_at).toLocaleString("fr-FR")}
                      </span>
                    </div>
                    <h3 className="mt-3 text-lg font-semibold text-foreground">{collection.title}</h3>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {collection.tags?.length ? (
                        collection.tags.map((tag) => (
                          <span
                            key={`${collection.id}-${tag}`}
                            className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground"
                          >
                            <Tag className="h-3 w-3 text-primary" />
                            {tag}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground/70">Aucun tag</span>
                      )}
                    </div>
                    <div className="mt-auto flex items-center justify-between pt-6 text-xs text-muted-foreground/80">
                      <span>{collection.total_flashcards} flashcards</span>
                      <span>{collection.total_quiz} questions</span>
                    </div>
                  </button>
                )
              })
            ) : (
              <div className="col-span-full rounded-3xl border border-dashed border-border/70 bg-card/70 p-8 text-center">
                <Layers className="mx-auto mb-4 h-10 w-10 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">Aucune collection pour l’instant</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Crée ta première collection pour transformer automatiquement tes supports en flashcards et quiz.
                </p>
                <Button onClick={() => handleOpenDialog(true)} className="mt-4 inline-flex items-center gap-2">
                  <PlusCircle className="h-4 w-4" />
                  Créer une collection
                </Button>
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-border/60 bg-card/70 p-6 shadow-sm">
            {selectedCollectionId ? (
              isLoadingDetail ? (
                <div className="flex h-40 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : collectionDetail ? (
                <div className="space-y-8">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-1">
                      <h2 className="text-2xl font-semibold text-foreground">{collectionDetail.title}</h2>
                      <p className="text-sm text-muted-foreground">
                        Créée le {new Date(collectionDetail.created_at).toLocaleDateString("fr-FR")} • Dernière mise à jour{" "}
                        {new Date(collectionDetail.updated_at).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                    <div>
                      {collectionDetail.status === "ready" ? (
                        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-700">
                          <CheckCircle2 className="h-3 w-3" />
                          Collection prête
                        </span>
                      ) : collectionDetail.status === "processing" ? (
                        <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs text-amber-700">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Génération en cours
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs text-rose-700">
                          <AlertCircle className="h-3 w-3" />
                          Génération en échec
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-border/50 bg-muted/30 p-4">
                      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground/70">
                        <Layers className="h-4 w-4 text-primary" />
                        Supports
                      </div>
                      <p className="mt-2 text-2xl font-semibold text-foreground">{collectionDetail.total_sources}</p>
                    </div>
                    <div className="rounded-2xl border border-border/50 bg-muted/30 p-4">
                      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground/70">
                        <Sparkles className="h-4 w-4 text-primary" />
                        Flashcards
                      </div>
                      <p className="mt-2 text-2xl font-semibold text-foreground">{collectionDetail.total_flashcards}</p>
                    </div>
                    <div className="rounded-2xl border border-border/50 bg-muted/30 p-4">
                      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground/70">
                        <ListChecks className="h-4 w-4 text-primary" />
                        Questions
                      </div>
                      <p className="mt-2 text-2xl font-semibold text-foreground">{collectionDetail.total_quiz}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {detailTabs.map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveSection(tab.id)}
                        disabled={tab.disabled}
                        className={cn(
                          "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                          activeSection === tab.id
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-muted/40 text-muted-foreground hover:border-primary/40",
                          tab.disabled && "cursor-not-allowed opacity-60"
                        )}
                      >
                        <tab.icon className="h-4 w-4" />
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {activeSection === "overview" && (
                    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                      <div className="space-y-6">
                        {collectionSummary ? (
                          <div className="rounded-3xl border border-border/50 bg-background/80 p-6">
                            <h3 className="text-lg font-semibold text-foreground">Synthèse générale</h3>
                            <div className="mt-3 text-sm text-muted-foreground">
                              <MarkdownRenderer content={collectionSummary} />
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-3xl border border-dashed border-border/50 bg-background/30 p-6 text-sm text-muted-foreground">
                            Aucune synthèse fournie pour cette collection.
                          </div>
                        )}

                        {collectionNotes.length ? (
                          <div className="rounded-3xl border border-border/50 bg-background/80 p-6">
                            <h3 className="text-lg font-semibold text-foreground">Points clés</h3>
                            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                              {collectionNotes.map((note, index) => (
                                <li key={`${collectionDetail.id}-note-${index}`} className="flex items-start gap-2">
                                  <span className="mt-1 h-2 w-2 rounded-full bg-primary/60" />
                                  <span>{note}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </div>

                      <div className="space-y-6">
                        <div className="rounded-3xl border border-border/50 bg-background/60 p-6">
                          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground/70">
                            Informations complémentaires
                          </h3>
                          <dl className="mt-4 space-y-3 text-sm text-muted-foreground">
                            <div className="flex items-center justify-between gap-4">
                              <dt>Statut</dt>
                              <dd className="font-medium text-foreground capitalize">{statusStyles[collectionDetail.status]?.label ?? collectionDetail.status}</dd>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <dt>Prompt tokens</dt>
                              <dd className="font-medium text-foreground">
                                {collectionDetail.prompt_tokens ?? "—"}
                              </dd>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <dt>Completion tokens</dt>
                              <dd className="font-medium text-foreground">
                                {collectionDetail.completion_tokens ?? "—"}
                              </dd>
                            </div>
                          </dl>
                        </div>

                        <div className="rounded-3xl border border-border/50 bg-background/60 p-6">
                          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground/70">
                            Sources utilisées
                          </h3>
                          {collectionDetail.sources?.length ? (
                            <ul className="mt-3 space-y-3 text-sm text-muted-foreground">
                              {collectionDetail.sources.map((source) => (
                                <li key={source.id} className="rounded-2xl border border-border/40 bg-muted/30 px-4 py-3">
                                  <p className="font-medium text-foreground">{source.title}</p>
                                  <p className="mt-1 text-xs text-muted-foreground/70">
                                    Version {source.document_version_id.slice(0, 8)} •{" "}
                                    {new Date(source.created_at).toLocaleDateString("fr-FR")}
                                  </p>
                                  {source.tags?.length ? (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      {source.tags.map((tag) => (
                                        <span
                                          key={`${source.id}-${tag}`}
                                          className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground"
                                        >
                                          #{tag}
                                        </span>
                                      ))}
                                    </div>
                                  ) : null}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="mt-3 text-sm text-muted-foreground">
                              Aucune source enregistrée pour cette collection.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeSection === "flashcards" && (
                    <div>
                      {orderedFlashcards.length ? (
                        <FlashcardViewer cards={orderedFlashcards} />
                      ) : (
                        <div className="rounded-3xl border border-dashed border-border/50 bg-background/40 p-6 text-sm text-muted-foreground">
                          Encore aucune flashcard générée. Reviens plus tard une fois la génération terminée.
                        </div>
                      )}
                    </div>
                  )}

                  {activeSection === "quiz" && (
                    <div>
                      {orderedQuiz.length ? (
                        <QuizViewer questions={orderedQuiz} />
                      ) : (
                        <div className="rounded-3xl border border-dashed border-border/50 bg-background/40 p-6 text-sm text-muted-foreground">
                          Aucune question disponible pour l’instant.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                  Impossible de charger la collection sélectionnée.
                </div>
              )
            ) : (
              <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                Sélectionne une collection pour afficher les flashcards et quiz générés.
              </div>
            )}
          </section>
        </div>
      </main>
      <ChatButton />
    </div>
  )
}

