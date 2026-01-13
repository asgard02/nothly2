"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle2, Loader2, Sparkles, FileText, Brain, Database, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"

export type GenerationStep = "intent" | "documents" | "context" | "generation" | "saving" | "complete"

interface GenerationOverlayProps {
    isVisible: boolean
    currentStep: GenerationStep
    onClose?: () => void
}

export function GenerationOverlay({ isVisible, currentStep, onClose }: GenerationOverlayProps) {
    const t = useTranslations("GenerationOverlay")

    const steps = [
        {
            id: "intent",
            label: t("intentLabel"),
            icon: Sparkles,
            description: t("intentDescription")
        },
        {
            id: "documents",
            label: t("documentsLabel"),
            icon: FileText,
            description: t("documentsDescription")
        },
        {
            id: "context",
            label: t("contextLabel"),
            icon: Database,
            description: t("contextDescription")
        },
        {
            id: "generation",
            label: t("generationLabel"),
            icon: Brain,
            description: t("generationDescription")
        },
        {
            id: "saving",
            label: t("savingLabel"),
            icon: CheckCircle2,
            description: t("savingDescription")
        }
    ]
    // Calculer l'index de l'étape active
    const activeStepIndex = steps.findIndex(s => s.id === currentStep)
    const isComplete = currentStep === "complete"

    // Pour l'affichage séquentiel, on veut montrer l'étape courante
    // Si c'est terminé, on montre la dernière étape ou un message de fin
    const currentStepData = isComplete ? steps[steps.length - 1] : steps[activeStepIndex] || steps[0]

    // Auto-dismiss après 20s quand la génération est terminée
    useEffect(() => {
        if (isComplete && onClose) {
            const timer = setTimeout(() => {
                onClose()
            }, 20000) // 20 secondes

            return () => clearTimeout(timer)
        }
    }, [isComplete, onClose])

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.9 }}
                    className="fixed bottom-6 right-6 z-50 w-96"
                >
                    <div className="bg-card border-2 border-border shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] rounded-xl overflow-hidden">
                        {/* Header Compact */}
                        <div className={cn(
                            "px-4 py-3 border-b-2 border-border flex items-center justify-between",
                            isComplete ? "bg-emerald-100 dark:bg-emerald-950/30" : "bg-indigo-100 dark:bg-indigo-950/30"
                        )}>
                            <div className="flex items-center gap-2">
                                {isComplete ? (
                                    <CheckCircle2 className="h-4 w-4 text-foreground" strokeWidth={2.5} />
                                ) : (
                                    <Sparkles className="h-4 w-4 text-foreground animate-pulse" strokeWidth={2.5} />
                                )}
                                <span className="text-sm font-black uppercase tracking-tight text-foreground">
                                    {isComplete ? t("completeTitle") : t("workingTitle")}
                                </span>
                            </div>
                            {/* Bouton X pour fermer */}
                            <button
                                onClick={onClose}
                                className="p-1 rounded-lg hover:bg-foreground hover:text-background transition-colors text-foreground border-2 border-transparent hover:border-border"
                                aria-label="Close"
                            >
                                <X className="h-4 w-4" strokeWidth={3} />
                            </button>
                        </div>

                        {/* Content - Sequential Animation */}
                        <div className="p-5 bg-card">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={currentStepData.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.2 }}
                                    className="flex items-start gap-4"
                                >
                                    <div className={cn(
                                        "w-12 h-12 rounded-xl flex items-center justify-center border-2 border-border shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]",
                                        isComplete
                                            ? "bg-emerald-200 dark:bg-emerald-900/30"
                                            : "bg-indigo-200 dark:bg-indigo-900/30"
                                    )}>
                                        {isComplete ? (
                                            <CheckCircle2 className="h-6 w-6 text-foreground" strokeWidth={2.5} />
                                        ) : (
                                            <currentStepData.icon className="h-6 w-6 text-foreground" strokeWidth={2.5} />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-base font-bold text-foreground truncate">
                                            {isComplete ? t("contentGenerated") : currentStepData.label}
                                        </h3>
                                        <p className="text-xs font-medium text-muted-foreground mt-1 leading-relaxed">
                                            {isComplete ? t("clickToView") : currentStepData.description}
                                        </p>
                                    </div>
                                </motion.div>
                            </AnimatePresence>

                            {/* Progress Bar */}
                            {!isComplete ? (
                                <div className="mt-5 h-3 w-full bg-muted rounded-full overflow-hidden border-2 border-border">
                                    <motion.div
                                        className="h-full bg-foreground"
                                        initial={{ width: "0%" }}
                                        animate={{ width: `${((activeStepIndex + 1) / steps.length) * 100}%` }}
                                        transition={{ duration: 0.5 }}
                                    />
                                </div>
                            ) : (
                                <motion.button
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    onClick={onClose}
                                    className="mt-5 w-full py-2.5 rounded-lg bg-foreground text-background text-sm font-black uppercase tracking-wide border-2 border-border shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:translate-y-[2px] hover:shadow-none transition-all active:translate-y-[4px]"
                                >
                                    {t("openTab")}
                                </motion.button>
                            )}
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
