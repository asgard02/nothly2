"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Check, Loader2 } from "lucide-react"

const GenerationToastInner = ({ status = 'loading' }: { status?: 'loading' | 'success' }) => {
  if (status === 'success') {
    return (
      <div className="flex items-center gap-4 bg-white border-2 border-black p-4 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] w-full max-w-sm">
        <div className="h-10 w-10 bg-[#BBF7D0] border-2 border-black rounded-lg flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          <Check className="h-6 w-6 text-black" strokeWidth={3} />
        </div>
        <div>
          <h4 className="font-black text-black uppercase text-lg leading-tight">Succès !</h4>
          <p className="font-bold text-gray-500 text-xs uppercase">Contenu généré</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-4 bg-white border-2 border-black p-4 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] w-full max-w-sm">
      <div className="relative h-10 w-10 bg-[#FDE68A] border-2 border-black rounded-lg flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
        <Loader2 className="h-6 w-6 text-black animate-spin" strokeWidth={3} />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-black text-black uppercase text-lg leading-tight">Génération...</h4>
        <div className="h-4 overflow-hidden relative">
          <div className="animate-slide-up-infinite">
            <p className="font-bold text-gray-500 text-xs uppercase">Flashcards</p>
            <p className="font-bold text-gray-500 text-xs uppercase">Quiz</p>
            <p className="font-bold text-gray-500 text-xs uppercase">Résumés</p>
            <p className="font-bold text-gray-500 text-xs uppercase">Notes</p>
            <p className="font-bold text-gray-500 text-xs uppercase">Flashcards</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export const showGenerationLoading = () => {
  return toast.custom(() => <GenerationToastInner status="loading" />, {
    duration: Infinity, // Ne pas fermer automatiquement
    id: "generation-toast",
  })
}

export const showGenerationSuccess = () => {
  toast.custom(() => <GenerationToastInner status="success" />, {
    duration: 4000,
    id: "generation-toast",
  })
}

/**
 * @deprecated Use showGenerationLoading and showGenerationSuccess instead
 */
export const triggerGenerationToast = (onComplete?: () => void) => {
  showGenerationLoading()
  setTimeout(() => {
    showGenerationSuccess()
    onComplete?.()
  }, 4000)
}






