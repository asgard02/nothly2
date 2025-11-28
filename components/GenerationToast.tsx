"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"
import { Loader2, CheckCircle2, Sparkles, BrainCircuit, FileText } from "lucide-react"

// Types pour les étapes
type Step = {
  id: number
  text: string
  icon: React.ElementType
}

const STEPS: Step[] = [
  { 
    id: 0, 
    text: "Initializing content generation...", 
    icon: Sparkles 
  },
  { 
    id: 1, 
    text: "Structuring questions & answers...", 
    icon: BrainCircuit 
  },
  { 
    id: 2, 
    text: "Applying formatting...", 
    icon: FileText 
  },
  { 
    id: 3, 
    text: "Quiz successfully created! 🚀", 
    icon: CheckCircle2 
  },
]

// Composant Interne du Toast
const GenerationToastInner = ({ onComplete }: { onComplete?: () => void }) => {
  const [currentStep, setCurrentStep] = useState(0)

  useEffect(() => {
    const timings = [0, 1500, 3000, 4500] // Délais cumulatifs
    
    // Planifier les changements d'état
    const timeouts = timings.map((time, index) => {
      if (index === 0) return null // Initial state déjà défini
      return setTimeout(() => {
        setCurrentStep(index)
        if (index === STEPS.length - 1 && onComplete) {
          onComplete()
        }
      }, time)
    })

    return () => {
      timeouts.forEach((t) => t && clearTimeout(t))
    }
  }, [onComplete])

  const step = STEPS[currentStep]
  const isSuccess = currentStep === STEPS.length - 1
  const progress = ((currentStep + 1) / STEPS.length) * 100

  return (
    <div className="relative w-full overflow-hidden rounded-lg border border-border/50 bg-background/80 p-4 shadow-xl backdrop-blur-md transition-all dark:bg-zinc-900/90 dark:border-zinc-800">
      <div className="flex items-center gap-3">
        {/* Morphing Icon Container */}
        <div className="relative flex h-8 w-8 items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={step.id}
              initial={{ opacity: 0, scale: 0.5, rotate: -20 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.5, rotate: 20 }}
              transition={{ duration: 0.3 }}
            >
              {isSuccess ? (
                <step.icon className="h-6 w-6 text-green-500" />
              ) : (
                <div className="relative">
                  <Loader2 className="absolute inset-0 h-6 w-6 animate-spin text-blue-500 opacity-30" />
                  <step.icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Text Container */}
        <div className="flex flex-1 flex-col justify-center overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.p
              key={step.text}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -10, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="truncate text-sm font-medium text-foreground"
            >
              {step.text}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="absolute bottom-0 left-0 h-1 w-full bg-muted/50">
        <motion.div
          className={`h-full ${isSuccess ? "bg-green-500" : "bg-blue-500"}`}
          initial={{ width: "0%" }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        />
      </div>
    </div>
  )
}

/**
 * Fonction utilitaire pour déclencher le toast de génération
 * À utiliser dans vos composants : triggerGenerationToast()
 */
export const triggerGenerationToast = (onComplete?: () => void) => {
  // Nous utilisons un ID constant ou auto-généré si on voulait gérer plusieurs générations
  // Ici, toast.custom rend notre composant React complet
  toast.custom((t) => <GenerationToastInner onComplete={onComplete} />, {
    duration: 5500, // Un peu plus long que l'animation totale (4.5s)
    id: "generation-toast", // Empêche les doublons si cliqué plusieurs fois rapidement
  })
}






