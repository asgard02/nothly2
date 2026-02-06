"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { usePathname, useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Sparkles, X, ArrowRight, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useTutorial } from "@/components/providers/TutorialProvider"
import type { TutorialStep } from "@/components/providers/TutorialProvider"
import { TutorialSpotlight } from "./TutorialSpotlight"

function getRedirectPath(pathPattern: TutorialStep["pathPattern"]): string {
    if (pathPattern === "/workspace/subjects/[id]") return "/workspace/subjects"
    return pathPattern
}

// Welcome screen shown before interactive tutorial starts
function WelcomeScreen({ onStart, onSkip }: { onStart: () => void; onSkip: () => void }) {
    const t = useTranslations("Tutorial")
    
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative w-full max-w-lg"
            >
                <div className="bg-card border-4 border-border rounded-3xl shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] dark:shadow-[12px_12px_0px_0px_rgba(255,255,255,1)] overflow-hidden">
                    {/* Top accent */}
                    <div className="h-3 bg-gradient-to-r from-[#BAE6FD] via-[#FBCFE8] to-[#BBF7D0]" />
                    
                    <div className="p-8 text-center">
                        {/* Logo animation */}
                        <motion.div
                            animate={{ rotate: [0, 5, -5, 0] }}
                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                            className="mb-6"
                        >
                            <div className="w-24 h-24 mx-auto bg-[#BAE6FD] border-4 border-border rounded-full flex items-center justify-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]">
                                <span className="text-5xl font-black italic tracking-tighter">n.</span>
                            </div>
                        </motion.div>
                        
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 bg-accent border-2 border-border px-4 py-2 rounded-full shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] mb-6">
                            <Sparkles className="w-4 h-4 text-primary" fill="currentColor" />
                            <span className="font-bold text-sm uppercase">{t("welcomeBadge")}</span>
                        </div>
                        
                        {/* Title */}
                        <h2 className="text-3xl font-black uppercase tracking-tight mb-3">
                            {t("welcomeTitle")}
                        </h2>
                        
                        {/* Description */}
                        <p className="text-muted-foreground font-medium mb-8 leading-relaxed">
                            {t("welcomeDesc")}
                        </p>
                        
                        {/* Interactive hint */}
                        <div className="bg-muted/50 border-2 border-border rounded-xl p-4 mb-8">
                            <p className="text-sm font-bold text-foreground">
                                {t("interactiveHint")}
                            </p>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex flex-col gap-3">
                            <Button
                                onClick={onStart}
                                className="w-full h-14 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-lg uppercase border-2 border-border shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:translate-y-[2px] transition-all"
                            >
                                {t("startTutorial")}
                                <ArrowRight className="ml-2 h-5 w-5" strokeWidth={3} />
                            </Button>
                            
                            <Button
                                variant="ghost"
                                onClick={onSkip}
                                className="font-bold text-muted-foreground hover:text-foreground"
                            >
                                {t("skipTutorial")}
                            </Button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}

// Completion screen shown after tutorial finishes
function CompletionScreen({ onClose }: { onClose: () => void }) {
    const t = useTranslations("Tutorial")
    
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative w-full max-w-lg"
            >
                <div className="bg-card border-4 border-border rounded-3xl shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] dark:shadow-[12px_12px_0px_0px_rgba(255,255,255,1)] overflow-hidden">
                    {/* Top accent */}
                    <div className="h-3 bg-gradient-to-r from-[#BBF7D0] via-[#FDE68A] to-[#BAE6FD]" />
                    
                    <div className="p-8 text-center">
                        {/* Success icon */}
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", bounce: 0.5 }}
                            className="mb-6"
                        >
                            <div className="w-24 h-24 mx-auto bg-[#BBF7D0] border-4 border-border rounded-full flex items-center justify-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]">
                                <Check className="w-12 h-12 text-foreground" strokeWidth={3} />
                            </div>
                        </motion.div>
                        
                        {/* Title */}
                        <h2 className="text-3xl font-black uppercase tracking-tight mb-3">
                            {t("completionTitle")}
                        </h2>
                        
                        {/* Description */}
                        <p className="text-muted-foreground font-medium mb-8 leading-relaxed">
                            {t("completionDesc")}
                        </p>
                        
                        {/* Action */}
                        <Button
                            onClick={onClose}
                            className="w-full h-14 rounded-xl bg-[#BBF7D0] hover:bg-[#BBF7D0]/90 text-foreground font-black text-lg uppercase border-2 border-border shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:translate-y-[2px] transition-all"
                        >
                            {t("letsGo")}
                            <Sparkles className="ml-2 h-5 w-5" fill="currentColor" />
                        </Button>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}

// No steps available screen
function NoStepsScreen({ onClose }: { onClose: () => void }) {
    const t = useTranslations("Tutorial")
    
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative w-full max-w-md"
            >
                <div className="bg-card border-4 border-border rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] p-8 text-center">
                    <p className="text-lg font-bold mb-4">{t("noStepsForPage")}</p>
                    <p className="text-sm text-muted-foreground mb-6">{t("noStepsHint")}</p>
                    <Button onClick={onClose} className="font-bold">
                        {t("gotIt")}
                    </Button>
                </div>
            </motion.div>
        </div>
    )
}

// Current step is on another page — prompt user to go there to continue
function WrongPageScreen({
    pathPattern,
    onGoToPage,
    onClose,
}: {
    pathPattern: TutorialStep["pathPattern"]
    onGoToPage: () => void
    onClose: () => void
}) {
    const t = useTranslations("Tutorial")
    const label =
        pathPattern === "/workspace/dashboard"
            ? t("continueTutorialGoDashboard")
            : pathPattern === "/workspace/subjects"
              ? t("continueTutorialGoSubjects")
              : t("continueTutorialGoSubject")
    
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative w-full max-w-md"
            >
                <div className="bg-card border-4 border-border rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] p-8 text-center">
                    <p className="text-lg font-bold mb-4">{t("continueTutorialTitle")}</p>
                    <p className="text-sm text-muted-foreground mb-6">{t("continueTutorialDesc")}</p>
                    <div className="flex flex-col gap-3">
                        <Button onClick={onGoToPage} className="font-bold">
                            {label}
                        </Button>
                        <Button variant="ghost" onClick={onClose} className="font-bold text-muted-foreground">
                            {t("skipTutorial")}
                        </Button>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}

export function TutorialOverlay() {
    const {
        isOpen,
        setIsOpen,
        isPaused,
        currentStep,
        currentStepData,
        totalSteps,
        steps,
        nextStep,
        prevStep,
        skipTutorial,
        completeTutorial,
        pauseTutorial,
    } = useTutorial()
    
    const pathname = usePathname()
    const router = useRouter()
    const [showWelcome, setShowWelcome] = useState(true)
    const [showCompletion, setShowCompletion] = useState(false)
    
    // Check if we're on a public page
    const isPublicPage = pathname === "/" || pathname?.startsWith("/login") || pathname?.startsWith("/register")
    
    // Reset welcome screen when tutorial opens
    useEffect(() => {
        if (isOpen) {
            setShowWelcome(true)
            setShowCompletion(false)
        }
    }, [isOpen])
    
    // Don't render on public pages or when paused (waiting for user to interact with dialog)
    if (!isOpen || isPublicPage || isPaused) return null
    
    // Show welcome screen first
    if (showWelcome) {
        return (
            <AnimatePresence mode="wait">
                <WelcomeScreen
                    onStart={() => setShowWelcome(false)}
                    onSkip={skipTutorial}
                />
            </AnimatePresence>
        )
    }
    
    // Show completion screen
    if (showCompletion) {
        return (
            <AnimatePresence mode="wait">
                <CompletionScreen onClose={() => {
                    setShowCompletion(false)
                    completeTutorial()
                }} />
            </AnimatePresence>
        )
    }
    
    // Current step is on another page (global tutorial flow)
    const stepForCurrentIndex = steps[currentStep] ?? null
    if (!currentStepData && stepForCurrentIndex) {
        return (
            <AnimatePresence mode="wait">
                <WrongPageScreen
                    pathPattern={stepForCurrentIndex.pathPattern}
                    onGoToPage={() => router.push(getRedirectPath(stepForCurrentIndex.pathPattern))}
                    onClose={skipTutorial}
                />
            </AnimatePresence>
        )
    }
    
    // No steps at all (should not happen with global steps)
    if (totalSteps === 0 || !currentStepData) {
        return (
            <AnimatePresence mode="wait">
                <NoStepsScreen onClose={skipTutorial} />
            </AnimatePresence>
        )
    }
    
    // Handle completion
    const handleComplete = () => {
        setShowCompletion(true)
    }
    
    // Render interactive spotlight
    return (
        <AnimatePresence mode="wait">
            <TutorialSpotlight
                key={currentStepData.id}
                step={currentStepData}
                stepNumber={currentStep + 1}
                totalSteps={totalSteps}
                onNext={nextStep}
                onPrev={prevStep}
                onSkip={skipTutorial}
                onComplete={handleComplete}
                onPause={pauseTutorial}
            />
        </AnimatePresence>
    )
}
