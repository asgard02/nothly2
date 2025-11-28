"use client"

import { Loader2, Layers, Tag, UploadCloud, AlertCircle, CheckCircle2, Plus, FileText, Trash2 } from "lucide-react"
import Link from "next/link"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useLocale, useTranslations } from "next-intl"

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
import type { DocumentSummary } from "@/lib/hooks/useDocuments"

function formatDate(value: string, locale: string) {
  try {
    return new Intl.DateTimeFormat(locale, {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value))
  } catch {
    return value
  }
}

export default function DocumentStack() {
  const t = useTranslations("DocumentStack")
  const locale = useLocale()
  const { data, isLoading, error } = useDocuments()
  const queryClient = useQueryClient()
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState("")
  const [tagsInput, setTagsInput] = useState("")
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [documentToDelete, setDocumentToDelete] = useState<DocumentSummary | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
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
      setUploadError(t("messages.pdfOnly"))
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
  }, [title, t])

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
        throw new Error(t("messages.selectFileFirst"))
      }
      if (!tagsInput.trim()) {
        throw new Error(t("dialog.tagsRequired"))
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
        throw new Error(payload.error || t("messages.uploadFailed"))
      }

      return response.json()
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["documents"] })
      setUploadSuccess(t("messages.uploadSuccess"))
      setUploadError(null)
      resetForm()
      setIsDialogOpen(false)
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : t("messages.uploadFailed")
      setUploadError(message)
      setUploadSuccess(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error || t("deleteDialog.error"))
      }

      return response.json()
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["documents"] })
      setDocumentToDelete(null)
      setDeleteError(null)
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : t("deleteDialog.error")
      setDeleteError(message)
    },
  })

  const supports = useMemo(() => data ?? [], [data])
  const totalSupports = supports.length

  if (isLoading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm">{t("loading")}</p>
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
      <Dialog
        open={Boolean(documentToDelete)}
        onOpenChange={(open) => {
          if (!open) {
            setDocumentToDelete(null)
            setDeleteError(null)
            deleteMutation.reset()
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteDialog.title")}</DialogTitle>
            <DialogDescription>
              {t.rich("deleteDialog.description", {
                title: documentToDelete?.title ?? "",
                bold: (chunks) => <span className="font-semibold text-foreground">{chunks}</span>,
              })}
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4" />
              <span>{deleteError}</span>
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setDocumentToDelete(null)
                setDeleteError(null)
                deleteMutation.reset()
              }}
              disabled={deleteMutation.isPending}
            >
              {t("deleteDialog.cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (documentToDelete) {
                  deleteMutation.mutate(documentToDelete.id)
                }
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("deleteDialog.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">{t("title")}</h1>
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
              {t("addButton")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("dialog.title")}</DialogTitle>
              <DialogDescription>{t("dialog.description")}</DialogDescription>
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
                    {file ? file.name : t("dialog.dropPlaceholder")}
                  </p>
                  <p className="text-xs text-muted-foreground">{t("dialog.dropInfo")}</p>
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
                  {t("dialog.titleLabel")}
                </label>
                <input
                  id="support-title"
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder={t("dialog.titlePlaceholder")}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="support-tags" className="text-sm font-medium text-muted-foreground">
                  {t("dialog.tagsLabel")}
                </label>
                <input
                  id="support-tags"
                  type="text"
                  value={tagsInput}
                  onChange={(event) => setTagsInput(event.target.value)}
                  placeholder={t("dialog.tagsPlaceholder")}
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
                {t("dialog.cancel")}
              </Button>
              <Button
                type="button"
                onClick={() => uploadMutation.mutate()}
                disabled={!file || uploadMutation.isPending || !title.trim() || !tagsInput.trim()}
              >
                {uploadMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("dialog.submit")}
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
        <div className="rounded-3xl border border-border/40 bg-card/40 backdrop-blur-sm p-5 shadow-sm transition-all hover:bg-card/60 hover:border-primary/20">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Layers className="h-4 w-4 text-primary" />
            {t("stats.totalDocuments")}
          </div>
          <p className="mt-2 text-3xl font-semibold text-foreground">{totalSupports}</p>
        </div>
        <div className="rounded-3xl border border-border/40 bg-card/40 backdrop-blur-sm p-5 shadow-sm transition-all hover:bg-card/60 hover:border-primary/20">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <FileText className="h-4 w-4 text-primary" />
            {t("stats.totalPages")}
          </div>
          <p className="mt-2 text-3xl font-semibold text-foreground">{totalPages > 0 ? totalPages : "—"}</p>
        </div>
        <div className="rounded-3xl border border-border/40 bg-card/40 backdrop-blur-sm p-5 shadow-sm transition-all hover:bg-card/60 hover:border-primary/20">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Plus className="h-4 w-4 text-primary" />
            {t("stats.lastAdded")}
          </div>
          <p className="mt-2 text-base font-medium text-foreground">
            {supports[0]?.created_at ? formatDate(supports[0].created_at, locale) : "—"}
          </p>
        </div>
      </section>

      {supports.length === 0 ? (
        <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-3xl border border-dashed border-border/60 bg-card/20 text-center backdrop-blur-sm">
          <UploadCloud className="h-10 w-10 text-muted-foreground/50" />
          <h2 className="mt-4 text-xl font-semibold text-foreground">{t("empty.title")}</h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            {t("empty.description")}
          </p>
          <Button
            onClick={() => setIsDialogOpen(true)}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-md transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/20"
          >
            <UploadCloud className="h-4 w-4" />
            {t("empty.cta")}
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-border/40 bg-card/40 backdrop-blur-md shadow-sm">
          <table className="min-w-full divide-y divide-border/40">
            <thead className="bg-muted/20 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-6 py-3 text-left">{t("table.document")}</th>
                <th className="px-6 py-3 text-left">{t("table.tags")}</th>
                <th className="px-6 py-3 text-left">{t("table.pages")}</th>
                <th className="px-6 py-3 text-left">{t("table.created")}</th>
                <th className="px-6 py-3 text-left">{t("table.updated")}</th>
                <th className="px-6 py-3 text-left">{t("table.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30 text-sm">
              {supports.map((support) => {
                const latestVersion =
                  support.document_versions?.find((version) => version.id === support.current_version_id) ??
                  support.document_versions?.[support.document_versions.length - 1]
                const pageCount = latestVersion?.page_count ?? 0
                return (
                  <tr key={support.id} className="transition hover:bg-primary/5">
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
                              className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/10 px-3 py-1 text-xs text-primary font-medium"
                            >
                              <Tag className="h-3 w-3" />
                              {tagValue}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs italic text-muted-foreground/50">{t("table.noTags")}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{pageCount > 0 ? pageCount : "—"}</td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {formatDate(support.created_at, locale)}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{formatDate(support.updated_at, locale)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link 
                          href={`/documents/${support.id}`} 
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                          title={t("table.open")}
                        >
                          <FileText className="h-4 w-4" />
                        </Link>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            setDocumentToDelete(support)
                            setDeleteError(null)
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">{t("table.delete")}</span>
                        </Button>
                      </div>
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

