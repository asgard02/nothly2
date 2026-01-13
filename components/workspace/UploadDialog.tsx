"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Loader2, UploadCloud, AlertCircle, X, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTranslations } from "next-intl"

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
    setUploadError(null)
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
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={() => handleOpenChange(false)}
      />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative z-50 w-full max-w-lg rounded-3xl border-2 border-border bg-card p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] animate-in fade-in-0 zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-black text-foreground uppercase tracking-tight">{t("title")}</h2>
            {subjectTitle && (
              <p className="text-sm text-muted-foreground mt-1 font-bold uppercase">
                {t("inCollection")} <span className="text-foreground bg-secondary px-2 py-0.5 rounded border border-border">{subjectTitle}</span>
              </p>
            )}
          </div>
          <button
            onClick={() => handleOpenChange(false)}
            className="p-2 rounded-xl border-2 border-transparent hover:bg-foreground hover:text-background hover:border-border transition-all text-foreground"
          >
            <X className="h-6 w-6" strokeWidth={3} />
          </button>
        </div>

        {/* Zone de drop */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`
                relative flex h-56 cursor-pointer flex-col items-center justify-center gap-4
                rounded-2xl border-2 border-dashed transition-all group overflow-hidden
                ${isDragging
              ? "border-border bg-[#BBF7D0] scale-105 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
              : file
                ? "border-border bg-muted"
                : "border-border/30 bg-muted/50 hover:border-border hover:bg-card hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:-translate-y-1"
            }
              `}
          onClick={() => fileInputRef.current?.click()}
        >
          {isDragging && (
            <div className="absolute inset-0 bg-[#BBF7D0] opacity-50 z-0"></div>
          )}

          <div className="relative z-10 flex flex-col items-center">
            {file ? (
              <div className="h-16 w-16 bg-card border-2 border-border rounded-xl flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] mb-2">
                <FileText className="h-8 w-8 text-foreground" strokeWidth={2} />
              </div>
            ) : (
              <div className={`h-16 w-16 rounded-full border-2 border-border flex items-center justify-center mb-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] transition-colors ${isDragging ? "bg-foreground text-background" : "bg-card text-foreground group-hover:bg-[#BBF7D0]"}`}>
                <UploadCloud className="h-8 w-8" strokeWidth={2.5} />
              </div>
            )}

            <div className="space-y-1 text-center">
              <p className="font-black text-lg text-foreground uppercase tracking-tight">
                {file ? file.name : isDragging ? t("dropHere") : t("dragHere")}
              </p>
              <p className="text-xs font-bold text-muted-foreground uppercase">
                {file ? t("clickToChange") : t("clickToBrowse")}
              </p>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            // limit to pdf
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {/* Titre du document */}
        <div className="mt-8 space-y-2">
          <label htmlFor="doc-title" className="text-sm font-bold text-foreground uppercase tracking-wide">
            {t("labelTitle")}
          </label>
          <input
            id="doc-title"
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={t("placeholderTitle")}
            className="w-full rounded-xl border-2 border-border bg-card px-4 py-3 text-lg font-bold text-foreground placeholder:text-muted-foreground focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:focus:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] focus:-translate-y-1 focus:-translate-x-1 transition-all"
          />
        </div>

        {/* Erreur */}
        {uploadError && (
          <div className="mt-4 flex items-center gap-3 rounded-xl border-2 border-border bg-destructive/10 px-4 py-3 text-sm font-bold text-destructive shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] animate-in fade-in-0 slide-in-from-top-2 duration-200">
            <AlertCircle className="h-5 w-5 flex-shrink-0" strokeWidth={2.5} />
            <span className="uppercase">{uploadError}</span>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-4 mt-8 pt-6 border-t-2 border-border/5">
          <Button
            type="button"
            variant="ghost"
            onClick={() => handleOpenChange(false)}
            disabled={uploadMutation.isPending}
            className="text-muted-foreground font-bold hover:text-foreground hover:bg-muted rounded-xl"
          >
            {t("cancel")}
          </Button>
          <Button
            type="button"
            onClick={() => uploadMutation.mutate()}
            disabled={!file || uploadMutation.isPending || !title.trim()}
            className="h-12 px-8 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground border-2 border-border shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:translate-y-[2px] active:translate-y-[4px] active:shadow-none transition-all font-black uppercase tracking-wide disabled:opacity-50 disabled:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:disabled:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] disabled:cursor-not-allowed"
          >
            {uploadMutation.isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" strokeWidth={3} />}
            {uploadMutation.isPending ? t("importing") : t("import")}
          </Button>
        </div>
      </div>
    </div>
  )
}
