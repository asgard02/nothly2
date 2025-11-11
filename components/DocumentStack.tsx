"use client"

import { Loader2, Layers, Tag, UploadCloud, AlertCircle, CheckCircle2, Plus, FileText } from "lucide-react"
import Link from "next/link"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"

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
import { useDocuments } from "@/lib/hooks/useDocuments"

function formatDate(value: string) {
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

export default function DocumentStack() {
  const { data, isLoading, error } = useDocuments()
  const queryClient = useQueryClient()
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState("")
  const [tagsInput, setTagsInput] = useState("")
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!uploadSuccess) return
    const timeout = setTimeout(() => setUploadSuccess(null), 4000)
    return () => clearTimeout(timeout)
  }, [uploadSuccess])

  const resetForm = useCallback(() => {
    setFile(null)
    setTitle("")
    setTagsInput("")
    setUploadError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }, [])

  const processFile = useCallback((nextFile: File) => {
    if (!nextFile) return
    const isPdf =
      nextFile.type === "application/pdf" ||
      nextFile.name.toLowerCase().endsWith(".pdf")
    if (!isPdf) {
      setUploadError("Seuls les fichiers PDF sont acceptés.")
      setFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
      return
    }
    setFile(nextFile)
    setUploadError(null)
    if (!title) {
      const derived = nextFile.name.replace(/\.[a-z0-9]+$/i, "")
      setTitle(derived)
    }
  }, [title])

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0]
    if (!nextFile) return
    setUploadSuccess(null)
    processFile(nextFile)
  }, [processFile])

  const handleDrop = useCallback((event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    const nextFile = event.dataTransfer.files?.[0]
    if (!nextFile) return
    setUploadSuccess(null)
    processFile(nextFile)
  }, [processFile])

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) {
        throw new Error("Sélectionne un fichier avant d’envoyer.")
      }
      const formData = new FormData()
      formData.append("file", file)
      formData.append("title", title.trim() || file.name.replace(/\.[a-z0-9]+$/i, ""))
      formData.append("tags", tagsInput)

      const response = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error || "Impossible d’enregistrer ce support.")
      }

      return response.json()
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["documents"] })
      setUploadSuccess("Support ajouté à la bibliothèque.")
      setUploadError(null)
      resetForm()
      setIsDialogOpen(false)
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Impossible d’enregistrer ce support."
      setUploadError(message)
      setUploadSuccess(null)
    },
  })

  const supports = useMemo(() => data ?? [], [data])
  const totalSupports = supports.length

  if (isLoading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm">Chargement de tes supports…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-6 py-4 text-destructive">
          {(error as Error).message || "Impossible de charger les supports"}
        </div>
      </div>
    )
  }

  const totalPages = supports.reduce((sum, support) => {
    const latestVersion =
      support.document_versions?.find((version) => version.id === support.current_version_id) ??
      support.document_versions?.[support.document_versions.length - 1]
    return sum + (latestVersion?.page_count ?? 0)
  }, 0)

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Bibliothèque de supports</h1>
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open)
            if (open) {
              setUploadError(null)
            } else {
              resetForm()
            }
          }}
        >
          <DialogTrigger asChild>
            <Button className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium">
              <UploadCloud className="h-4 w-4" />
              Ajouter un PDF
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Empiler un nouveau support PDF</DialogTitle>
              <DialogDescription>
                Téléverse un document PDF, donne-lui un titre et ajoute un ou plusieurs tags (séparés par des virgules).
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <label
                htmlFor="support-file-input"
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleDrop}
                className="flex h-32 cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border bg-muted/40 px-4 text-center transition hover:border-primary hover:bg-muted/60"
              >
                <UploadCloud className="h-10 w-10 text-primary" />
                <div className="space-y-1 text-sm">
                  <p className="font-medium text-foreground">
                    {file ? file.name : "Glisse ton PDF ici ou clique pour sélectionner"}
                  </p>
                  <p className="text-xs text-muted-foreground">Format accepté : PDF (max 50&nbsp;Mo).</p>
                </div>
                <input
                  ref={fileInputRef}
                  id="support-file-input"
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
              <div className="space-y-2">
                <label htmlFor="support-title" className="text-sm font-medium text-muted-foreground">
                  Titre du support
                </label>
                <input
                  id="support-title"
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Exemple : Analyse - Chapitre 2"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="support-tags" className="text-sm font-medium text-muted-foreground">
                  Tags (séparés par des virgules)
                </label>
                <input
                  id="support-tags"
                  type="text"
                  value={tagsInput}
                  onChange={(event) => setTagsInput(event.target.value)}
                  placeholder="maths, analyse, dérivées"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
              </div>
              {uploadError && (
                <div className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4" />
                  <span>{uploadError}</span>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  resetForm()
                  setIsDialogOpen(false)
                }}
              >
                Annuler
              </Button>
              <Button
                type="button"
                onClick={() => uploadMutation.mutate()}
                disabled={!file || uploadMutation.isPending || !title.trim()}
              >
                {uploadMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Empiler le PDF
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      {uploadSuccess && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm text-emerald-700">
          <CheckCircle2 className="mr-2 inline h-4 w-4" />
          {uploadSuccess}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-3xl border border-border/70 bg-card/80 p-5 shadow-sm">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Layers className="h-4 w-4 text-primary" />
            Supports empilés
          </div>
          <p className="mt-2 text-3xl font-semibold text-foreground">{totalSupports}</p>
        </div>
        <div className="rounded-3xl border border-border/70 bg-card/80 p-5 shadow-sm">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <FileText className="h-4 w-4 text-primary" />
            Pages totales
          </div>
          <p className="mt-2 text-3xl font-semibold text-foreground">{totalPages > 0 ? totalPages : "—"}</p>
        </div>
        <div className="rounded-3xl border border-border/70 bg-card/80 p-5 shadow-sm">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Plus className="h-4 w-4 text-primary" />
            Dernier ajout
          </div>
          <p className="mt-2 text-base font-medium text-foreground">
            {supports[0]?.created_at ? formatDate(supports[0].created_at) : "—"}
          </p>
        </div>
      </section>

      {supports.length === 0 ? (
        <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-3xl border border-dashed border-border/80 bg-card/60 text-center">
          <UploadCloud className="h-10 w-10 text-muted-foreground" />
          <h2 className="mt-4 text-xl font-semibold text-foreground">Aucun support encore importé</h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Ajoute un PDF pour constituer ta bibliothèque. Chaque support est stocké en toute sécurité sur ton espace.
          </p>
          <Link
            href="/new"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            Importer un support
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-border/70 bg-card/70 shadow-sm">
          <table className="min-w-full divide-y divide-border/60">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-6 py-3 text-left">Support</th>
                <th className="px-6 py-3 text-left">Tags</th>
                <th className="px-6 py-3 text-left">Pages</th>
                <th className="px-6 py-3 text-left">Créé</th>
                <th className="px-6 py-3 text-left">Dernière mise à jour</th>
                <th className="px-6 py-3 text-left" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 text-sm">
              {supports.map((support) => {
                const latestVersion =
                  support.document_versions?.find((version) => version.id === support.current_version_id) ??
                  support.document_versions?.[support.document_versions.length - 1]
                const pageCount = latestVersion?.page_count ?? 0
                return (
                  <tr key={support.id} className="transition hover:bg-muted/40">
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-foreground font-medium">{support.title}</span>
                        <span className="text-xs text-muted-foreground">{support.original_filename}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {support.tags?.length ? (
                        <div className="flex flex-wrap items-center gap-2">
                          {support.tags.map((tagValue) => (
                            <span
                              key={`${support.id}-${tagValue}`}
                              className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground"
                            >
                              <Tag className="h-3 w-3 text-primary" />
                              {tagValue}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs italic text-muted-foreground/70">Aucun tag</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{pageCount > 0 ? pageCount : "—"}</td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {formatDate(support.created_at)}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{formatDate(support.updated_at)}</td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/documents/${support.id}`} className="text-primary hover:text-primary/80">
                        Ouvrir
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

