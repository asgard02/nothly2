"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { AlertTriangle, X, Trash2 } from "lucide-react"

interface DeleteConfirmationDialogProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void
    title: string
    description: string
    itemTitle?: string
    isDeleting: boolean
}

export default function DeleteConfirmationDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    itemTitle,
    isDeleting,
}: DeleteConfirmationDialogProps) {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!isOpen || !mounted) return null

    const modalContent = (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-all"
                onClick={onClose}
            />

            {/* Dialog */}
            <div className="relative bg-white border-2 border-black rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8 max-w-md w-full animate-in fade-in zoom-in-95 duration-200">
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-xl hover:bg-black hover:text-white border-2 border-transparent hover:border-black transition-all"
                >
                    <X className="h-5 w-5" strokeWidth={3} />
                </button>

                {/* Icon */}
                <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-[#FECACA] border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mx-auto mb-6 transform -rotate-3">
                    <Trash2 className="h-8 w-8 text-black" strokeWidth={2.5} />
                </div>

                {/* Title */}
                <h3 className="text-2xl font-black text-black text-center mb-2 uppercase tracking-tight">
                    {title}
                </h3>

                {/* Description */}
                <p className="text-gray-600 font-bold text-center mb-8">
                    {description}{" "}
                    {itemTitle && (
                        <span className="mt-2 px-3 py-1 bg-white border-2 border-black rounded-lg text-black font-black uppercase text-sm inline-block transform -rotate-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                            {itemTitle}
                        </span>
                    )}
                    {itemTitle ? " ?" : ""}
                </p>

                {/* Actions */}
                <div className="flex gap-4">
                    <button
                        onClick={onClose}
                        disabled={isDeleting}
                        className="flex-1 px-4 py-3 rounded-xl font-black uppercase text-black bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] active:translate-y-[4px] active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isDeleting}
                        className="flex-1 px-4 py-3 rounded-xl font-black uppercase text-white bg-red-500 hover:bg-red-600 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] active:translate-y-[4px] active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0 flex items-center justify-center gap-2"
                    >
                        {isDeleting ? (
                            <>
                                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Suppression...
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
