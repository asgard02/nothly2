"use client"

import { useState, useEffect } from "react"
import { X, ArrowRight, ArrowLeft, Check, Sparkles, LayoutDashboard, Plus, FileText, Upload, MessageSquare, Brain, Grid, ListChecks, BookOpen } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useTranslations } from "next-intl"
import { useTutorial } from "@/components/providers/TutorialProvider"

// Visual Component for Micro-UIs
const TutorialVisual = ({ step, t }: { step: number, t: any }) => {

    // Sidebar Component to match user screenshot precisely
    const Sidebar = ({ active = false }) => (
        <div className="w-16 h-full border-r-2 border-black bg-white flex flex-col items-center py-4 gap-4 z-20 shrink-0">
            <div className="font-black italic text-2xl mb-2">n.</div>

            {/* Dashboard Icon (4 squares) */}
            <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center transition-colors border-2 border-transparent",
                "text-gray-400"
            )}>
                <div className="grid grid-cols-2 gap-0.5">
                    <div className="w-2.5 h-2.5 border-2 border-current rounded-[2px]" />
                    <div className="w-2.5 h-2.5 border-2 border-current rounded-[2px]" />
                    <div className="w-2.5 h-2.5 border-2 border-current rounded-[2px]" />
                    <div className="w-2.5 h-2.5 border-2 border-current rounded-[2px]" />
                </div>
            </div>

            {/* Subjects Icon (9 squares) - Active for Step 1, 2, 3 */}
            <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center transition-colors border-2",
                step >= 1 ? "bg-black text-white border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)]" : "text-gray-400 border-transparent"
            )}>
                <div className="grid grid-cols-3 gap-0.5">
                    {[...Array(9)].map((_, i) => (
                        <div key={i} className={cn("w-1.5 h-1.5 rounded-[1px]", step >= 1 ? "bg-white" : "bg-current")} />
                    ))}
                </div>
            </div>

            {/* Quiz Icon */}
            <div className="w-10 h-10 rounded-xl text-gray-400 flex items-center justify-center border-2 border-transparent">
                <Brain className="w-6 h-6" strokeWidth={2.5} />
            </div>
        </div>
    )

    // Base Frame for the "Mini App"
    const MiniAppFrame = ({ children }: { children: React.ReactNode }) => (
        <div className="w-full h-64 bg-[#FDF6E3] border-2 border-black rounded-3xl relative overflow-hidden flex shadow-sm">
            <Sidebar />

            {/* Mini Content */}
            <div className="flex-1 relative flex flex-col min-w-0 bg-[#FAFAFA]">
                {children}
            </div>
        </div>
    )

    // Arrow Pointer
    const Pointer = ({ text, className, side = "top" }: { text: string, className?: string, side?: "top" | "bottom" | "left" | "right" }) => (
        <motion.div
            initial={{ opacity: 0, [side === "top" ? "y" : "y"]: 10 }}
            animate={{ opacity: 1, [side === "top" ? "y" : "y"]: 0 }}
            transition={{ delay: 0.5 }}
            className={cn("absolute z-40 flex flex-col items-center pointer-events-none", className)}
        >
            {side === "bottom" && <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[8px] border-b-black mb-1"></div>}

            <div className="bg-black text-white text-xs font-bold px-3 py-1.5 rounded shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] whitespace-nowrap border-2 border-white">
                {text}
            </div>

            {side === "top" && <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-black mt-1"></div>}
        </motion.div>
    )

    switch (step) {
        case 0: // Welcome
            return (
                <div className="w-full h-64 flex items-center justify-center relative overflow-hidden bg-[#BAE6FD] border-2 border-black rounded-3xl">
                    <motion.div
                        animate={{ rotate: [0, 5, -5, 0] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        className="relative z-10 flex flex-col items-center"
                    >
                        <div className="w-24 h-24 bg-white border-4 border-black rounded-full flex items-center justify-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] mb-4">
                            <span className="text-5xl font-black italic tracking-tighter">n.</span>
                        </div>
                        <div className="bg-white border-2 border-black px-4 py-1.5 rounded-full shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-[#FBBF24]" fill="currentColor" />
                                <span className="font-bold text-sm uppercase">Nothly App</span>
                            </div>
                        </div>
                    </motion.div>

                    {/* Background Pattern */}
                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(#000 1px, transparent 1px)", backgroundSize: "16px 16px" }}></div>
                </div>
            )

        case 1: // Create Subject (Dashboard specific)
            return (
                <div className="w-full h-full flex items-center justify-center px-4 py-4 relative">
                    <MiniAppFrame>
                        {/* Header */}
                        <div className="h-14 border-b-2 border-black bg-white w-full flex items-center px-6 justify-between shrink-0">
                            <div className="h-4 w-32 bg-black/10 rounded-full" />
                            <div className="h-8 w-8 rounded-full bg-[#fcd34d] border-2 border-black" />
                        </div>

                        {/* Content Area */}
                        <div className="p-6">
                            {/* Dashboard Banner */}
                            <div className="h-20 bg-white border-2 border-black rounded-xl w-full mb-6 relative overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center px-4">
                                <div className="space-y-2">
                                    <div className="h-3 w-40 bg-black rounded-full" />
                                    <div className="h-2 w-24 bg-black/20 rounded-full" />
                                </div>
                                <div className="absolute right-0 top-0 w-24 h-full bg-gradient-to-l from-purple-100 to-transparent"></div>
                            </div>

                            {/* Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                {/* Create New Subject Button */}
                                <motion.div
                                    animate={{ scale: [1, 1.02, 1] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                    className="aspect-[4/3] rounded-2xl border-2 border-dashed border-black/30 flex flex-col items-center justify-center gap-2 bg-white/50 hover:bg-white hover:border-black transition-colors"
                                >
                                    <div className="w-8 h-8 rounded-full bg-[#BBF7D0] border-2 border-black flex items-center justify-center">
                                        <Plus className="w-4 h-4 text-black" strokeWidth={3} />
                                    </div>
                                    <div className="h-2 w-16 bg-black/20 rounded-full" />
                                </motion.div>

                                {/* Existing Subject */}
                                <div className="aspect-[4/3] rounded-2xl border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-3 relative overflow-hidden">
                                    <div className="absolute -right-4 -top-4 w-12 h-12 bg-[#FBCFE8] rounded-full border-2 border-black"></div>
                                    <div className="mt-8 space-y-2">
                                        <div className="h-3 w-20 bg-black rounded-full" />
                                        <div className="h-2 w-10 bg-black/20 rounded-full" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Pointer text={t("pointerCreateSubject")} className="bottom-12 left-[28%] -translate-x-1/2" side="bottom" />
                    </MiniAppFrame>
                </div>
            )

        case 2: // Import PDF (Subject View)
            return (
                <div className="w-full h-full flex items-center justify-center px-4 py-4 relative">
                    <MiniAppFrame>
                        {/* Subject Header with Tabs */}
                        <div className="border-b-2 border-black bg-white w-full">
                            <div className="h-14 flex items-center px-6 justify-between">
                                <div className="h-5 w-40 bg-black rounded-full" />
                                <div className="h-8 w-24 bg-[#8B5CF6] rounded-xl border-2 border-black" />
                            </div>
                            {/* Tabs */}
                            <div className="flex px-6 gap-2 pb-3">
                                <div className="px-3 py-1 bg-[#BAE6FD] border-2 border-black rounded-lg text-[10px] font-black shadow-[2px_2px_0px_0px_black] -translate-y-1">PDF</div>
                                <div className="px-3 py-1 bg-transparent border-2 border-transparent rounded-lg text-[10px] font-bold text-gray-400">FLASHCARDS</div>
                                <div className="px-3 py-1 bg-transparent border-2 border-transparent rounded-lg text-[10px] font-bold text-gray-400">QUIZ</div>
                            </div>
                        </div>

                        {/* Drop Zone */}
                        <div className="flex-1 p-6">
                            <div className="w-full h-full border-2 border-dashed border-black rounded-2xl bg-[#F0FDF4] flex flex-col items-center justify-center gap-3 relative">

                                <motion.div
                                    initial={{ y: -60, opacity: 0, rotate: -10 }}
                                    animate={{ y: 0, opacity: 1, rotate: 0 }}
                                    transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 2 }}
                                    className="absolute z-10"
                                >
                                    <div className="w-12 h-14 bg-white border-2 border-black rounded-lg flex items-center justify-center shadow-[4px_4px_0px_0px_black]">
                                        <FileText className="w-6 h-6 text-black" />
                                    </div>
                                </motion.div>

                                <div className="mt-16 text-center space-y-2">
                                    <div className="h-2 w-32 bg-black/20 rounded-full mx-auto" />
                                    <div className="h-2 w-20 bg-black/10 rounded-full mx-auto" />
                                </div>
                            </div>
                        </div>

                        <Pointer text={t("pointerDropPdf")} className="bottom-10 left-1/2 -translate-x-1/2 translate-y-full" side="bottom" />
                    </MiniAppFrame>
                </div>
            )

        case 3: // Chat & Quiz (Action Buttons)
            return (
                <div className="w-full h-full flex items-center justify-center px-4 py-4 relative">
                    <MiniAppFrame>
                        {/* Subject Header */}
                        <div className="border-b-2 border-black bg-white w-full h-14 flex items-center px-6 justify-between">
                            <div className="h-5 w-32 bg-black rounded-full" />
                            <div className="flex gap-2">
                                <div className="w-8 h-8 rounded-lg bg-gray-100 border-2 border-transparent" />
                            </div>
                        </div>

                        {/* Documents Grid Background */}
                        <div className="flex-1 p-6 relative">
                            <div className="grid grid-cols-1 gap-4 opacity-30 blur-[1px]">
                                <div className="h-20 bg-white border-2 border-black rounded-xl p-3 flex gap-3">
                                    <div className="w-12 h-12 bg-gray-100 rounded-lg border-2 border-black" />
                                    <div className="space-y-2 flex-1 pt-2">
                                        <div className="h-2 w-full bg-black rounded-full" />
                                        <div className="h-2 w-2/3 bg-black/30 rounded-full" />
                                    </div>
                                </div>
                                <div className="h-20 bg-white border-2 border-black rounded-xl p-3 flex gap-3">
                                    <div className="w-12 h-12 bg-gray-100 rounded-lg border-2 border-black" />
                                </div>
                            </div>

                            {/* Action Buttons Overlay - The Key Feature */}
                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                className="absolute bottom-6 left-0 right-0 flex justify-center items-center z-10 px-4"
                            >
                                <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm p-2 rounded-2xl">
                                    {/* Flashcards Button */}
                                    <div className="px-3 py-2 bg-white border-2 border-black rounded-xl shadow-[3px_3px_0px_0px_black] flex items-center gap-2">
                                        <Brain className="w-3 h-3" />
                                        <div className="w-8 h-1 bg-black rounded-full" />
                                    </div>

                                    {/* Quiz Button */}
                                    <div className="px-3 py-2 bg-white border-2 border-black rounded-xl shadow-[3px_3px_0px_0px_black] flex items-center gap-2">
                                        <ListChecks className="w-3 h-3" />
                                        <div className="w-8 h-1 bg-black rounded-full" />
                                    </div>

                                    <div className="w-px h-6 bg-black/20 mx-1" />

                                    {/* Chat Button */}
                                    <div className="p-2 bg-black text-white rounded-xl border-2 border-black shadow-[3px_3px_0px_0px_black]">
                                        <MessageSquare className="w-4 h-4" />
                                    </div>
                                </div>
                            </motion.div>
                        </div>

                        <Pointer text={t("pointerQuickActions")} className="bottom-20 left-1/2 -translate-x-1/2" side="bottom" />
                    </MiniAppFrame>
                </div>
            )

        default:
            return null
    }
}

import { usePathname } from "next/navigation"

export function TutorialOverlay() {
    const { isOpen, setIsOpen } = useTutorial()
    const [currentStep, setCurrentStep] = useState(0)
    const t = useTranslations("Tutorial")
    const pathname = usePathname()

    const isPublicPage = pathname === "/" || pathname?.startsWith("/login") || pathname?.startsWith("/register")

    if (!isOpen || isPublicPage) return null

    const STEPS = [
        {
            title: t("welcomeTitle"),
            description: t("welcomeDesc"),
            color: "bg-[#BAE6FD]",
            textColor: "text-black"
        },
        {
            title: t("step1Title"),
            description: t("step1Desc"),
            color: "bg-[#FBCFE8]",
            textColor: "text-black"
        },
        {
            title: t("step2Title"),
            description: t("step2Desc"),
            color: "bg-[#BBF7D0]",
            textColor: "text-black"
        },
        {
            title: t("step3Title"),
            description: t("step3Desc"),
            color: "bg-[#FDE68A]",
            textColor: "text-black"
        }
    ]

    const handleNext = () => {
        if (currentStep < STEPS.length - 1) {
            setCurrentStep(currentStep + 1)
        } else {
            handleComplete()
        }
    }

    const handlePrev = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1)
        }
    }

    const handleComplete = () => {
        localStorage.setItem("nothly_tutorial_v3_completed", "true")
        setIsOpen(false)
    }

    if (!isOpen) return null

    const step = STEPS[currentStep]

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentStep}
                    initial={{ scale: 0.95, opacity: 0, y: 10 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: -10 }}
                    transition={{ type: "spring", stiffness: 350, damping: 25 }}
                    className={cn(
                        "relative w-full max-w-xl rounded-[2rem] border-4 border-black shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] bg-white overflow-hidden",
                    )}
                >
                    {/* Header Strip */}
                    <div className={cn("h-6 border-b-4 border-black w-full", step.color)} />

                    <div className="p-8">
                        {/* Close Button */}
                        <button
                            onClick={handleComplete}
                            className="absolute top-6 right-6 p-2 bg-white border-2 border-black rounded-full hover:bg-gray-100 transition-colors z-20 shadow-[2px_2px_0px_0px_black]"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        {/* Title Section */}
                        <div className="mb-6 pr-8">
                            <h2 className="text-3xl font-black uppercase tracking-tight mb-2">
                                {step.title}
                            </h2>
                            <p className="text-base font-bold text-gray-500">
                                {t("stepCount", { current: currentStep + 1, total: STEPS.length })}
                            </p>
                        </div>

                        {/* Visual Area */}
                        <div className="mb-8">
                            <TutorialVisual step={currentStep} t={t} />
                        </div>

                        {/* Content */}
                        <p className="text-lg font-bold text-black/80 leading-relaxed mb-8">
                            {step.description}
                        </p>

                        {/* Footer / Controls */}
                        <div className="flex items-center justify-between gap-4 pt-4 border-t-2 border-black/10">
                            <Button
                                onClick={handlePrev}
                                variant="ghost"
                                className={cn(
                                    "text-black font-bold border-2 border-transparent hover:border-black hover:bg-transparent rounded-xl",
                                    currentStep === 0 && "invisible"
                                )}
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" strokeWidth={3} />
                                {t("back")}
                            </Button>

                            <div className="flex gap-2">
                                {STEPS.map((_, idx) => (
                                    <div
                                        key={idx}
                                        className={cn(
                                            "w-3 h-3 rounded-full border-2 border-black transition-all",
                                            idx === currentStep ? cn("scale-125", step.color) : "bg-gray-200 border-transparent"
                                        )}
                                    />
                                ))}
                            </div>

                            <Button
                                onClick={handleNext}
                                className={cn(
                                    "text-black font-black border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] transition-all px-6 py-5 rounded-xl text-md",
                                    step.color
                                )}
                            >
                                {currentStep === STEPS.length - 1 ? (
                                    <>
                                        {t("finish")} <Check className="w-5 h-5 ml-2" strokeWidth={3} />
                                    </>
                                ) : (
                                    <>
                                        {t("next")} <ArrowRight className="w-5 h-5 ml-2" strokeWidth={3} />
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>
    )
}
