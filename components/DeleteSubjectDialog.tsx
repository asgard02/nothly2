"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { AlertTriangle, X } from "lucide-react"

import MarkdownRenderer from "@/components/MarkdownRenderer"

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
      <div className="relative bg-white border-2 border-black rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8 max-w-md w-full animate-in zoom-in-95 duration-200">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl border-2 border-transparent hover:bg-black hover:text-white hover:border-black transition-all"
        >
          <X className="h-6 w-6" strokeWidth={3} />
        </button>

        {/* Icon */}
        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-[#EF4444] border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mx-auto mb-6 rotate-3">
          <AlertTriangle className="h-8 w-8 text-white" strokeWidth={3} />
        </div>

        {/* Title */}
        <h3 className="text-2xl font-black text-black text-center mb-4 uppercase tracking-tight">
          Supprimer cette matière ?
        </h3>

        {/* Description */}
        <p className="text-black font-medium text-center mb-8 leading-relaxed">
          Êtes-vous sûr de vouloir supprimer{" "}
          <span className="font-black bg-[#FBCFE8] px-2 py-0.5 rounded border border-black text-black">
            "{subjectTitle || "Sans titre"}"
          </span>{" "}
          ? <br />
          <span className="text-sm text-gray-500 mt-2 block font-bold uppercase">Cette action est irréversible.</span>
        </p>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 h-12 rounded-xl font-bold text-black border-2 border-black bg-white hover:bg-gray-100 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] active:translate-y-[4px] active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wide"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 h-12 rounded-xl font-bold text-white bg-[#EF4444] border-2 border-black hover:bg-[#DC2626] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] active:translate-y-[4px] active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 uppercase tracking-wide"
          >
            {isDeleting ? (
              <>
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ...
              </>
            ) : (
              "Supprimer"
            )}
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}



