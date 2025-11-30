"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle2, Loader2, Sparkles, FileText, Brain, Database } from "lucide-react"
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

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.9 }}
                    className="fixed bottom-6 right-6 z-50 w-80"
                >
                    <div className="bg-card/95 backdrop-blur-md border border-border/50 shadow-2xl rounded-2xl overflow-hidden">
                        {/* Header Compact */}
                        <div className="px-4 py-3 border-b border-border/50 bg-muted/30 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                {isComplete ? (
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                ) : (
                                    <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                                )}
                                <span className="text-sm font-semibold text-foreground">
                                    {isComplete ? t("completeTitle") : t("workingTitle")}
                                </span>
                            </div>
                        </div>

                        {/* Content - Sequential Animation */}
                        <div className="p-4">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={currentStepData.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ duration: 0.3 }}
                                    className="flex items-start gap-3"
                                >
                                    <div className={cn(
                                        "w-8 h-8 rounded-full flex items-center justify-center border flex-shrink-0",
                                        isComplete
                                            ? "bg-green-500/10 border-green-500/20 text-green-500"
                                            : "bg-primary/10 border-primary/20 text-primary"
                                    )}>
                                        {isComplete ? (
                                            <CheckCircle2 className="h-4 w-4" />
                                        ) : (
                                            <currentStepData.icon className="h-4 w-4" />
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-medium text-foreground">
                                            {isComplete ? t("contentGenerated") : currentStepData.label}
                                        </h3>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            {isComplete ? t("clickToView") : currentStepData.description}
                                        </p>
                                    </div>
                                </motion.div>
                            </AnimatePresence>

                            {/* Progress Bar */}
                            {!isComplete ? (
                                <div className="mt-4 h-1 w-full bg-muted rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full bg-primary"
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
                                    className="mt-4 w-full py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
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
