"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { CheckCircle2 } from "lucide-react"

const GenerationToastInner = ({ status = 'loading' }: { status?: 'loading' | 'success' }) => {
  if (status === 'success') {
    return (
      <div className="generation-loader-card flex items-center justify-center gap-3 border border-border/50 shadow-xl backdrop-blur-md">
        <CheckCircle2 className="h-6 w-6 text-green-500" />
        <span className="text-lg font-medium text-foreground">
          Créé avec succès !
        </span>
      </div>
    )
  }

  return (
    <div className="generation-loader-card border border-border/50 shadow-xl backdrop-blur-md">
      <div className="generation-loader">
        <p>génération</p>
        <div className="generation-words">
          <span className="generation-word">flashcards</span>
          <span className="generation-word">quiz</span>
          <span className="generation-word">résumés</span>
          <span className="generation-word">notes</span>
          <span className="generation-word">flashcards</span>
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






