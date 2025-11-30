"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Loader2, UploadCloud, AlertCircle, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTranslations } from "next-intl"
// Collection type is not needed here, only collectionId and collectionTitle are used

interface UploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  subjectId?: string // ID du sujet dans lequel uploader
  subjectTitle?: string // Titre du sujet (pour affichage)
}

export function UploadDialog({
  open,
  onOpenChange,
  subjectId,
  subjectTitle
}: UploadDialogProps) {
  const t = useTranslations("UploadDialog")
  const queryClient = useQueryClient()
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState("")
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const resetForm = useCallback(() => {
    setFile(null)
    setTitle("")
    setUploadError(null)
    setIsDragging(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }, [])

  useEffect(() => {
    if (!open) {
      resetForm()
    }
  }, [open, resetForm])

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen)
    if (!newOpen) {
      resetForm()
    }
  }

  const processFile = useCallback((nextFile: File) => {
    if (!nextFile) return
    const isPdf =
      nextFile.type === "application/pdf" ||
      nextFile.name.toLowerCase().endsWith(".pdf")
    if (!isPdf) {
      setUploadError(t("errorPdfOnly"))
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
    processFile(nextFile)
  }, [processFile])

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
    const nextFile = event.dataTransfer.files?.[0]
    if (!nextFile) return
    processFile(nextFile)
  }, [processFile])

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
  }, [])

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error(t("errorNoFile"))
      if (!title.trim()) throw new Error(t("errorNoTitle"))

      const formData = new FormData()
      formData.append("file", file)
      formData.append("title", title.trim() || file.name.replace(/\.[a-z0-9]+$/i, ""))

      // Si on upload dans un sujet, ajouter l'ID du sujet
      if (subjectId) {
        formData.append("subject_id", subjectId)
      }

      const response = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error || t("errorUploadFailed"))
      }

      return response.json()
    },
    onSuccess: async () => {
      // Invalider les queries appropriées
      await queryClient.invalidateQueries({ queryKey: ["documents"] })
      if (subjectId) {
        // Invalider les queries du sujet et des sujets
        await queryClient.invalidateQueries({ queryKey: ["subject-documents", subjectId] })
        await queryClient.invalidateQueries({ queryKey: ["subjects"] })
      }
      resetForm()
      onOpenChange(false)
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : t("errorGeneric")
      setUploadError(message)
    },
  })

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={() => handleOpenChange(false)}
      />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative z-50 w-full max-w-lg rounded-2xl border border-border/40 bg-card/95 backdrop-blur-md p-6 shadow-2xl animate-in fade-in-0 zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold">{t("title")}</h2>
            {subjectTitle && (
              <p className="text-sm text-muted-foreground mt-1">
                {t("inCollection")} <span className="font-medium">{subjectTitle}</span>
              </p>
            )}
          </div>
          <button
            onClick={() => handleOpenChange(false)}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Zone de drop */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`
                relative flex h-40 cursor-pointer flex-col items-center justify-center gap-3 
                rounded-2xl border-2 border-dashed transition-all
                ${isDragging
              ? "border-primary bg-primary/5 scale-105"
              : file
                ? "border-primary/50 bg-muted/40"
                : "border-border bg-muted/20 hover:border-primary/50 hover:bg-muted/30"
            }
              `}
          onClick={() => fileInputRef.current?.click()}
        >
          <UploadCloud className={`h-12 w-12 transition-colors ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
          <div className="space-y-1 text-center">
            <p className="font-medium text-sm text-foreground">
              {file ? file.name : isDragging ? t("dropHere") : t("dragHere")}
            </p>
            <p className="text-xs text-muted-foreground">
              {file ? t("clickToChange") : t("clickToBrowse")}
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {/* Titre du document */}
        <div className="mt-6 space-y-2">
          <label htmlFor="doc-title" className="text-sm font-medium text-muted-foreground">
            {t("labelTitle")}
          </label>
          <input
            id="doc-title"
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={t("placeholderTitle")}
            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>

        {/* Erreur */}
        {uploadError && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive animate-in fade-in-0 slide-in-from-top-2 duration-200">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-border/40">
          <Button
            type="button"
            variant="ghost"
            onClick={() => handleOpenChange(false)}
            disabled={uploadMutation.isPending}
          >
            {t("cancel")}
          </Button>
          <Button
            type="button"
            onClick={() => uploadMutation.mutate()}
            disabled={!file || uploadMutation.isPending || !title.trim()}
            className="rounded-full"
          >
            {uploadMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {uploadMutation.isPending ? t("importing") : t("import")}
          </Button>
        </div>
      </div>
    </div>
  )
}
