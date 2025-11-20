"use client"

import { useMemo, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  Clock,
  Layers,
  Loader2,
  PlusCircle,
  Tag,
  Trash2,
  X,
} from "lucide-react"

import ChatButton from "@/components/ChatButton"
import Sidebar from "@/components/Sidebar"
import DeleteCollectionDialog from "@/components/DeleteCollectionDialog"
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
import { useCollections, useDeleteCollection } from "@/lib/hooks/useCollections"
import { useDocuments, type DocumentSummary } from "@/lib/hooks/useDocuments"
import { cn } from "@/lib/utils"

const CONTEXT_CHAR_LIMIT = Number(process.env.NEXT_PUBLIC_COLLECTION_CONTEXT_LIMIT_CHARS || 120_000)
const AVG_CHARS_PER_PAGE = Number(process.env.NEXT_PUBLIC_COLLECTION_AVG_CHARS_PER_PAGE || 2400)
const TOKENS_PER_CHAR = 0.25 // Approximation: 1 token ≈ 4 caractères
const POLLING_INTERVAL_MS = 5000 // 5 secondes pour le polling des collections en traitement
const STALE_TIME_MS = 60_000 // 60 secondes

function computeEstimatedCharacters(
  documents: DocumentSummary[] | undefined,
  selectedTags: string[]
): { total: number; matched: DocumentSummary[] } {
  if (!documents || selectedTags.length === 0) {
    return { total: 0, matched: [] }
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
    badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
    dot: "bg-emerald-500",
    label: "Prête",
  },
  failed: {
    badge: "bg-rose-100 text-rose-700 border-rose-200",
    dot: "bg-rose-500",
    label: "Échec",
  },
}

export default function CollectionsPage() {
  const queryClient = useQueryClient()
  const router = useRouter()

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [collectionTitle, setCollectionTitle] = useState("")
  const [creationError, setCreationError] = useState<string | null>(null)
  const [collectionToDelete, setCollectionToDelete] = useState<{ id: string; title: string } | null>(null)

  const { data: collections, isLoading: isLoadingCollections } = useCollections()
  const { data: documents } = useDocuments()
  const deleteCollection = useDeleteCollection()

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

  const { total: estimatedCharacters, matched: matchedDocuments } = useMemo(
    () => computeEstimatedCharacters(documents, selectedTags),
    [documents, selectedTags]
  )

  const estimatedTokens = Math.round(estimatedCharacters * TOKENS_PER_CHAR)
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
      router.push(`/flashcards/${result.collectionId}`)
    },
    onError: (error: unknown) => {
      setCreationError(error instanceof Error ? error.message : "Impossible de créer la collection")
    },
  })

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

  const handleDeleteClick = (e: React.MouseEvent, collection: { id: string; title: string }) => {
    e.stopPropagation() // Empêcher la navigation vers la collection
    setCollectionToDelete(collection)
  }

  const handleConfirmDelete = () => {
    if (!collectionToDelete) return

    deleteCollection.mutate(collectionToDelete.id, {
      onSuccess: () => {
        setCollectionToDelete(null)
      },
      onError: (error) => {
        console.error("Erreur lors de la suppression:", error)
        alert("Erreur lors de la suppression de la collection")
      },
    })
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
                          {estimatedTokens} tokens (~{estimatedCharacters.toLocaleString("fr-FR")} caractères)
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
                    {matchedDocuments.length > 0 && (
                      <div className="mt-4 space-y-1 text-xs text-muted-foreground">
                        <p className="font-medium text-foreground">Supports concernés</p>
                        {matchedDocuments.map((document) => (
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
                const statusConfig = statusStyles[collection.status] ?? statusStyles.processing
                return (
                  <div
                    key={collection.id}
                    className="relative flex h-full flex-col rounded-3xl border border-border/60 bg-card/70 p-5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg group"
                  >
                    {/* Bouton de suppression */}
                    <button
                      onClick={(e) => handleDeleteClick(e, { id: collection.id, title: collection.title })}
                      className="absolute top-4 right-4 p-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-100 dark:hover:bg-red-900/30 z-10"
                      title="Supprimer la collection"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>

                    {/* Contenu cliquable */}
                    <button
                      onClick={() => router.push(`/flashcards/${collection.id}`)}
                      className="flex h-full flex-col text-left w-full"
                    >
                      <div className="flex items-center gap-2">
                        <span className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium", statusConfig.badge)}>
                          <span className={cn("h-2 w-2 rounded-full", statusConfig.dot)} />
                          {statusConfig.label}
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
                  </div>
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
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground text-center">
              Clique sur une collection pour ouvrir la vue d’étude détaillée avec flashcards et quiz.
            </div>
          </section>
        </div>
      </main>
      <ChatButton />

      {/* Dialog de confirmation de suppression */}
      <DeleteCollectionDialog
        isOpen={collectionToDelete !== null}
        onClose={() => setCollectionToDelete(null)}
        onConfirm={handleConfirmDelete}
        collectionTitle={collectionToDelete?.title || ""}
        isDeleting={deleteCollection.isPending}
      />
    </div>
  )
}

