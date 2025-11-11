"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import {
  Loader2,
  AlertCircle,
  ArrowRightCircle,
  Clock,
  Sparkles,
  Layers,
  Trash2,
  CheckCircle2,
  X,
} from "lucide-react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useDocuments, type DocumentSummary } from "@/lib/hooks/useDocuments"
import DeleteDeckDialog from "@/components/DeleteDeckDialog"

const statusLabels: Record<string, { label: string; className: string }> = {
  processing: {
    label: "Génération en cours",
    className: "bg-amber-100 text-amber-800 border-amber-200",
  },
  ready: {
    label: "Deck prêt",
    className: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  failed: {
    label: "Échec",
    className: "bg-red-100 text-red-700 border-red-200",
  },
}

function refineDate(value: string) {
  try {
    return new Date(value).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return value
  }
}

function DeckProcessingBanner() {
  const searchParams = useSearchParams()
  const deckStatus = searchParams.get("deckStatus")

  if (deckStatus !== "processing") {
    return null
  }

  return (
    <div className="mb-6 rounded-2xl border border-primary/20 bg-primary/10 px-5 py-4 text-sm text-primary flex items-start gap-3">
      <Sparkles className="h-5 w-5 mt-0.5 flex-shrink-0" />
      <div>
        <p className="font-medium">Ton deck est en cours de création</p>
        <p className="text-primary/80">
          Nous analysons ton PDF pour générer toutes les fiches de notes. Tu peux continuer à travailler pendant que nous terminons.
        </p>
      </div>
    </div>
  )
}

export default function DashboardClient() {
  const queryClient = useQueryClient()
  const { data: documents, isLoading, error } = useDocuments()
  const [deckToDelete, setDeckToDelete] = useState<DocumentSummary | null>(null)
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null)

  useEffect(() => {
    if (!feedback) return
    const timeout = setTimeout(() => setFeedback(null), 6000)
    return () => clearTimeout(timeout)
  }, [feedback])

  const deleteDeckMutation = useMutation({
    mutationFn: async ({ id }: { id: string; title: string }) => {
      const response = await fetch(`/api/documents/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error || "Impossible de supprimer le deck")
      }
    },
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["documents"] })
      setFeedback({
        type: "success",
        message: `Le deck "${variables.title}" a bien été supprimé.`,
      })
      setDeckToDelete(null)
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Impossible de supprimer le deck"
      setFeedback({
        type: "error",
        message,
      })
    },
  })

  const isDeletingDeck = deleteDeckMutation.isPending

  const handleDeleteDialogClose = () => {
    if (isDeletingDeck) return
    setDeckToDelete(null)
  }

  const handleDeleteConfirm = () => {
    if (!deckToDelete) return
    deleteDeckMutation.mutate({ id: deckToDelete.id, title: deckToDelete.title })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground font-medium">Chargement de tes decks...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="inline-flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/10 px-6 py-4 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span>{(error as Error).message || "Erreur lors du chargement des decks"}</span>
        </div>
      </div>
    )
  }

  const decks = documents ?? []
  const total = decks.length
  const readyCount = decks.filter((deck) => deck.status === "ready").length

  return (
    <div className="px-6 py-10 md:px-10 max-w-7xl mx-auto w-full">
      <header className="mb-10 flex flex-col gap-3 sm:flex-row sm:items-baseline sm:justify-between">
        <div>
          <h1 className="text-4xl font-bold text-foreground tracking-tight">Recueil de decks</h1>
          <p className="text-muted-foreground text-lg font-medium flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2">
              <Layers className="h-4 w-4" />
              {total} deck{total > 1 ? "s" : ""}
            </span>
            <span className="inline-flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              {readyCount} prêt{readyCount > 1 ? "s" : ""}
            </span>
          </p>
        </div>
        <Link
          href="/new"
          className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:border-primary hover:text-primary transition-colors"
        >
          Créer un nouveau deck
          <ArrowRightCircle className="h-4 w-4" />
        </Link>
      </header>

      <DeckProcessingBanner />

      {feedback && (
        <div
          className={`mb-6 flex items-start gap-3 rounded-2xl border px-5 py-4 text-sm ${
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-destructive/20 bg-destructive/10 text-destructive"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0" />
          ) : (
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
          )}
          <div className="flex-1">
            <p className="font-medium">{feedback.message}</p>
          </div>
          <button
            type="button"
            className="text-current transition-opacity hover:opacity-70"
            onClick={() => setFeedback(null)}
            aria-label="Fermer le message"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {total === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <div className="rounded-3xl border border-border bg-card/70 px-12 py-16 text-center shadow-xl">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Layers className="h-8 w-8 text-primary" />
            </div>
            <h2 className="mb-3 text-2xl font-semibold text-foreground">Aucun deck pour le moment</h2>
            <p className="mb-8 text-muted-foreground">
              Importe un PDF pour générer automatiquement toutes les fiches et quiz associés.
            </p>
            <Link
              href="/new"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-medium text-primary-foreground shadow-lg shadow-primary/30 transition hover:shadow-xl hover:shadow-primary/40"
            >
              Créer mon premier deck
              <ArrowRightCircle className="h-4 w-4" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {decks.map((deck) => {
            const statusMeta = statusLabels[deck.status] ?? statusLabels.processing
            const latestVersion =
              deck.document_versions?.find((version) => version.id === deck.current_version_id) ??
              deck.document_versions?.[deck.document_versions.length - 1]
            const versionCount = deck.document_versions?.length ?? 0
            const noteCount = latestVersion?.document_sections?.length ?? 0

            return (
              <div
                key={deck.id}
                className="relative flex h-full flex-col rounded-3xl border border-border bg-card/70 p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${statusMeta.className}`}
                    >
                      {statusMeta.label}
                    </p>
                    <h2 className="mt-4 text-lg font-semibold text-foreground line-clamp-2">{deck.title}</h2>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-1">{deck.original_filename}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDeckToDelete(deck)}
                    disabled={isDeletingDeck && deckToDelete?.id === deck.id}
                    className="rounded-full p-2 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label={`Supprimer le deck ${deck.title}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-6 space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>Importé le {refineDate(deck.created_at)}</span>
                  </div>
                  <p>
                    {noteCount} note{noteCount > 1 ? "s" : ""} générée{noteCount > 1 ? "s" : ""}
                  </p>
                  {latestVersion && (
                    <p>
                      Version courante : {latestVersion.page_count} page{latestVersion.page_count > 1 ? "s" : ""}
                      {latestVersion.processed_at ? ` • Générée le ${refineDate(latestVersion.processed_at)}` : ""}
                    </p>
                  )}
                  <p>{versionCount} version{versionCount > 1 ? "s" : ""}</p>
                </div>

                <div className="mt-auto flex items-center justify-between pt-6">
                  <Link
                    href={`/documents/${deck.id}`}
                    className="text-sm font-medium text-primary hover:text-primary/80"
                  >
                    Ouvrir le deck
                  </Link>
                  <ArrowRightCircle className="h-4 w-4 text-primary" />
                </div>
              </div>
            )
          })}
        </div>
      )}

      <DeleteDeckDialog
        isOpen={Boolean(deckToDelete)}
        deckTitle={deckToDelete?.title ?? ""}
        isDeleting={isDeletingDeck}
        onClose={handleDeleteDialogClose}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  )
}
