"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { AlertTriangle, X } from "lucide-react"

import MarkdownRenderer from "@/components/MarkdownRenderer"
import { useTranslations } from "next-intl"

interface DeleteSubjectDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  subjectTitle: string
  isDeleting: boolean
}

export default function DeleteSubjectDialog({
  isOpen,
  onClose,
  onConfirm,
  subjectTitle,
  isDeleting,
}: DeleteSubjectDialogProps) {
  const t = useTranslations("DeleteCollectionDialog")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!isOpen || !mounted) return null

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative bg-card border-2 border-border rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] p-8 max-w-md w-full animate-in zoom-in-95 duration-200">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl border-2 border-transparent hover:bg-foreground hover:text-background hover:border-border transition-all text-foreground"
        >
          <X className="h-6 w-6" strokeWidth={3} />
        </button>

        {/* Icon */}
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-destructive border-2 border-border shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] mx-auto mb-6 rotate-3">
          <AlertTriangle className="h-8 w-8 text-destructive-foreground" strokeWidth={3} />
        </div>

        {/* Title */}
        <h3 className="text-2xl font-black text-foreground text-center mb-4 uppercase tracking-tight">
          {t('title')}
        </h3>

        {/* Description */}
        <p className="text-foreground font-medium text-center mb-8 leading-relaxed">
          {t.rich('description', {
            title: subjectTitle || "Sans titre",
            bold: (chunks) => (
              <span className="font-black bg-secondary px-2 py-0.5 rounded border border-border text-secondary-foreground">
                {chunks}
              </span>
            )
          })} <br />
          <span className="text-sm text-muted-foreground mt-2 block font-bold uppercase">{t('warning')}</span>
        </p>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 h-12 rounded-xl font-bold text-foreground border-2 border-border bg-card hover:bg-muted shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:translate-y-[2px] active:translate-y-[4px] active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wide"
          >
            {t('cancel')}
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 h-12 rounded-xl font-bold text-destructive-foreground bg-destructive border-2 border-border hover:bg-destructive/90 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:translate-y-[2px] active:translate-y-[4px] active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 uppercase tracking-wide"
          >
            {isDeleting ? (
              <>
                <div className="h-4 w-4 border-2 border-destructive-foreground border-t-transparent rounded-full animate-spin" />
                ...
              </>
            ) : (
              t('delete')
            )}
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}



