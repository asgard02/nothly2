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
        className="relative z-50 w-full max-w-lg rounded-3xl border-2 border-black bg-white p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] animate-in fade-in-0 zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-black text-black uppercase tracking-tight">{t("title")}</h2>
            {subjectTitle && (
              <p className="text-sm text-gray-500 mt-1 font-bold uppercase">
                {t("inCollection")} <span className="text-black bg-[#FBCFE8] px-2 py-0.5 rounded border border-black">{subjectTitle}</span>
              </p>
            )}
          </div>
          <button
            onClick={() => handleOpenChange(false)}
            className="p-2 rounded-xl border-2 border-transparent hover:bg-black hover:text-white hover:border-black transition-all"
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
              ? "border-black bg-[#BBF7D0] scale-105 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              : file
                ? "border-black bg-[#F3F4F6]"
                : "border-black/30 bg-gray-50 hover:border-black hover:bg-white hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1"
            }
              `}
          onClick={() => fileInputRef.current?.click()}
        >
          {isDragging && (
            <div className="absolute inset-0 bg-[#BBF7D0] opacity-50 z-0"></div>
          )}

          <div className="relative z-10 flex flex-col items-center">
            {file ? (
              <div className="h-16 w-16 bg-white border-2 border-black rounded-xl flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-2">
                <FileText className="h-8 w-8 text-black" strokeWidth={2} />
              </div>
            ) : (
              <div className={`h-16 w-16 rounded-full border-2 border-black flex items-center justify-center mb-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-colors ${isDragging ? "bg-black text-white" : "bg-white text-black group-hover:bg-[#BBF7D0]"}`}>
                <UploadCloud className="h-8 w-8" strokeWidth={2.5} />
              </div>
            )}

            <div className="space-y-1 text-center">
              <p className="font-black text-lg text-black uppercase tracking-tight">
                {file ? file.name : isDragging ? t("dropHere") : t("dragHere")}
              </p>
              <p className="text-xs font-bold text-gray-500 uppercase">
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
          <label htmlFor="doc-title" className="text-sm font-bold text-black uppercase tracking-wide">
            {t("labelTitle")}
          </label>
          <input
            id="doc-title"
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={t("placeholderTitle")}
            className="w-full rounded-xl border-2 border-black bg-white px-4 py-3 text-lg font-bold text-black placeholder:text-gray-400 focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:-translate-y-1 focus:-translate-x-1 transition-all"
          />
        </div>

        {/* Erreur */}
        {uploadError && (
          <div className="mt-4 flex items-center gap-3 rounded-xl border-2 border-black bg-red-100 px-4 py-3 text-sm font-bold text-red-600 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] animate-in fade-in-0 slide-in-from-top-2 duration-200">
            <AlertCircle className="h-5 w-5 flex-shrink-0" strokeWidth={2.5} />
            <span className="uppercase">{uploadError}</span>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-4 mt-8 pt-6 border-t-2 border-black/5">
          <Button
            type="button"
            variant="ghost"
            onClick={() => handleOpenChange(false)}
            disabled={uploadMutation.isPending}
            className="text-gray-500 font-bold hover:text-black hover:bg-gray-100 rounded-xl"
          >
            {t("cancel")}
          </Button>
          <Button
            type="button"
            onClick={() => uploadMutation.mutate()}
            disabled={!file || uploadMutation.isPending || !title.trim()}
            className="h-12 px-8 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] active:translate-y-[4px] active:shadow-none transition-all font-black uppercase tracking-wide disabled:opacity-50 disabled:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:cursor-not-allowed"
          >
            {uploadMutation.isPending && <Loader2 className="mr-2 h-5 w-5 animate-spin" strokeWidth={3} />}
            {uploadMutation.isPending ? t("importing") : t("import")}
          </Button>
        </div>
      </div>
    </div>
  )
}
