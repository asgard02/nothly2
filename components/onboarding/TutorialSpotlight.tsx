"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { X, ArrowRight, ArrowLeft, MousePointer2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useTranslations } from "next-intl"
import type { TutorialStep } from "@/components/providers/TutorialProvider"

interface TutorialSpotlightProps {
    step: TutorialStep
    stepNumber: number
    totalSteps: number
    onNext: () => void
    onPrev: () => void
    onSkip: () => void
    onComplete: () => void
    onPause: () => void
}

interface TargetRect {
    x: number
    y: number
    width: number
    height: number
}

// Calculate optimal tooltip position based on available space
function calculateTooltipPosition(
    targetRect: TargetRect,
    preferredPosition: "top" | "bottom" | "left" | "right" | "auto" = "auto"
): { position: "top" | "bottom" | "left" | "right"; style: React.CSSProperties } {
    const padding = 16
    const tooltipWidth = 320
    const tooltipHeight = 200 // Approximate height
    
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    
    const spaceAbove = targetRect.y
    const spaceBelow = viewportHeight - (targetRect.y + targetRect.height)
    const spaceLeft = targetRect.x
    const spaceRight = viewportWidth - (targetRect.x + targetRect.width)
    
    let position: "top" | "bottom" | "left" | "right" = preferredPosition === "auto" ? "bottom" : preferredPosition
    
    // Auto-calculate best position
    if (preferredPosition === "auto") {
        const spaces = [
            { pos: "bottom" as const, space: spaceBelow },
            { pos: "top" as const, space: spaceAbove },
            { pos: "right" as const, space: spaceRight },
            { pos: "left" as const, space: spaceLeft },
        ]
        
        // Find position with most space that fits the tooltip
        for (const { pos, space } of spaces.sort((a, b) => b.space - a.space)) {
            if (
                (pos === "top" || pos === "bottom") && space >= tooltipHeight + padding ||
                (pos === "left" || pos === "right") && space >= tooltipWidth + padding
            ) {
                position = pos
                break
            }
        }
    }
    
    // Calculate style based on position
    let style: React.CSSProperties = {}
    
    switch (position) {
        case "top":
            style = {
                bottom: viewportHeight - targetRect.y + padding,
                left: Math.max(padding, Math.min(
                    targetRect.x + targetRect.width / 2 - tooltipWidth / 2,
                    viewportWidth - tooltipWidth - padding
                )),
            }
            break
        case "bottom":
            style = {
                top: targetRect.y + targetRect.height + padding,
                left: Math.max(padding, Math.min(
                    targetRect.x + targetRect.width / 2 - tooltipWidth / 2,
                    viewportWidth - tooltipWidth - padding
                )),
            }
            break
        case "left":
            style = {
                right: viewportWidth - targetRect.x + padding,
                top: Math.max(padding, Math.min(
                    targetRect.y + targetRect.height / 2 - tooltipHeight / 2,
                    viewportHeight - tooltipHeight - padding
                )),
            }
            break
        case "right":
            style = {
                left: targetRect.x + targetRect.width + padding,
                top: Math.max(padding, Math.min(
                    targetRect.y + targetRect.height / 2 - tooltipHeight / 2,
                    viewportHeight - tooltipHeight - padding
                )),
            }
            break
    }
    
    return { position, style }
}

export function TutorialSpotlight({
    step,
    stepNumber,
    totalSteps,
    onNext,
    onPrev,
    onSkip,
    onComplete,
    onPause,
}: TutorialSpotlightProps) {
    const t = useTranslations("Tutorial")
    const router = useRouter()
    const [targetRect, setTargetRect] = useState<TargetRect | null>(null)
    const [tooltipPosition, setTooltipPosition] = useState<ReturnType<typeof calculateTooltipPosition> | null>(null)
    const [giveUpFinding, setGiveUpFinding] = useState(false)
    
    const highlightPadding = step.highlightPadding ?? 8
    const isLastStep = stepNumber === totalSteps
    
    // Find target element and update position
    const updateTargetPosition = useCallback(() => {
        // Support multiple selectors (comma-separated)
        const selectors = step.targetSelector.split(",").map(s => s.trim())
        
        let element: Element | null = null
        for (const selector of selectors) {
            element = document.querySelector(`[data-tutorial="${selector}"]`)
            if (element) break
        }
        
        if (element) {
            const rect = element.getBoundingClientRect()
            const newRect = {
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height,
            }
            setTargetRect(newRect)
            setTooltipPosition(calculateTooltipPosition(newRect, step.position))
        } else {
            // Element not found - maybe skip this step or show a fallback
            setTargetRect(null)
            setTooltipPosition(null)
        }
    }, [step.targetSelector, step.position])
    
    // Reset "give up" when step changes so we retry for the new target
    useEffect(() => {
        setGiveUpFinding(false)
    }, [step.id])
    
    // Initial position calculation, retries (for async content like subjects list), and updates
    useEffect(() => {
        let cancelled = false
        const tryFind = () => {
            if (cancelled) return
            updateTargetPosition()
        }
        // Initial try after a short delay
        const initialTimer = setTimeout(tryFind, 150)
        // Retry every 400ms for ~3s so we find elements that appear after loading (e.g. "Create your first subject")
        const retryInterval = setInterval(tryFind, 400)
        const giveUpTimer = setTimeout(() => {
            if (cancelled) return
            setGiveUpFinding(true)
        }, 3200)
        
        window.addEventListener("scroll", updateTargetPosition, true)
        window.addEventListener("resize", updateTargetPosition)
        const observer = new MutationObserver(updateTargetPosition)
        observer.observe(document.body, { childList: true, subtree: true })
        
        return () => {
            cancelled = true
            clearTimeout(initialTimer)
            clearTimeout(giveUpTimer)
            clearInterval(retryInterval)
            window.removeEventListener("scroll", updateTargetPosition, true)
            window.removeEventListener("resize", updateTargetPosition)
            observer.disconnect()
        }
    }, [updateTargetPosition, step.id])
    
    // Handle click on the target element
    useEffect(() => {
        const selectors = step.targetSelector.split(",").map(s => s.trim())
        const navigateTo = "navigateTo" in step ? (step as { navigateTo?: string }).navigateTo : undefined
        const allowAction = "allowAction" in step ? (step as { allowAction?: boolean }).allowAction : false
        
        const handleClick = (e: Event) => {
            // If allowAction is true, let the native action happen (e.g. opening a dialog, creating a subject)
            if (allowAction) {
                // If this is the last step, complete the tutorial after the action
                if (isLastStep) {
                    // Small delay to let the action happen first, then show completion
                    setTimeout(() => {
                        onComplete()
                    }, 100)
                } else {
                    onPause() // Hide the tutorial overlay while user interacts with dialog
                }
                return // Let the native action happen
            }
            
            e.preventDefault()
            e.stopPropagation()
            
            // Navigate to another page and advance to next step (global tutorial flow)
            if (navigateTo) {
                router.push(navigateTo)
                onNext()
                return
            }
            
            if (isLastStep) {
                onComplete()
            } else {
                onNext()
            }
        }
        
        const elements: Element[] = []
        for (const selector of selectors) {
            const el = document.querySelector(`[data-tutorial="${selector}"]`)
            if (el) {
                elements.push(el)
                el.addEventListener("click", handleClick, true)
            }
        }
        
        return () => {
            elements.forEach(el => {
                el.removeEventListener("click", handleClick, true)
            })
        }
    }, [step, step.targetSelector, isLastStep, onNext, onComplete, router])
    
    // Show "element not found" only after we've given up retrying (so async content has time to render)
    if (!targetRect && giveUpFinding) {
        return (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
                <div className="bg-card border-4 border-border rounded-2xl p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.15)] max-w-md text-center">
                    <p className="text-lg font-bold mb-4">{t("elementNotFound")}</p>
                    <div className="flex gap-3 justify-center">
                        <Button variant="outline" onClick={onSkip}>
                            {t("skip")}
                        </Button>
                        {stepNumber > 1 && (
                            <Button variant="outline" onClick={onPrev}>
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                {t("back")}
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        )
    }
    
    // Still looking for the target (e.g. page loading) — show loading so user isn't stuck on a blank overlay
    if (!targetRect) {
        return (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
                <div className="bg-card border-4 border-border rounded-2xl p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.15)] max-w-md text-center">
                    <div className="flex flex-col items-center gap-4">
                        <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                        <p className="text-sm font-bold text-muted-foreground">{t("findingElement")}</p>
                        <Button variant="ghost" onClick={onSkip} className="text-muted-foreground">
                            {t("skip")}
                        </Button>
                    </div>
                </div>
            </div>
        )
    }
    
    return (
        <div className="fixed inset-0 z-[9999] pointer-events-none">
            {/* SVG Overlay with spotlight cutout - pointer-events-none so clicks pass through to the highlighted element */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
                <defs>
                    <mask id="tutorial-spotlight-mask">
                        {/* White = visible (dark overlay) */}
                        <rect fill="white" width="100%" height="100%" />
                        {/* Black = transparent (spotlight hole) */}
                        <rect
                            fill="black"
                            x={targetRect.x - highlightPadding}
                            y={targetRect.y - highlightPadding}
                            width={targetRect.width + highlightPadding * 2}
                            height={targetRect.height + highlightPadding * 2}
                            rx="12"
                            ry="12"
                        />
                    </mask>
                </defs>
                <rect
                    fill="rgba(0,0,0,0.75)"
                    mask="url(#tutorial-spotlight-mask)"
                    width="100%"
                    height="100%"
                />
            </svg>
            
            {/* Highlight border around target */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute pointer-events-none"
                style={{
                    left: targetRect.x - highlightPadding,
                    top: targetRect.y - highlightPadding,
                    width: targetRect.width + highlightPadding * 2,
                    height: targetRect.height + highlightPadding * 2,
                }}
            >
                <div className="w-full h-full rounded-xl border-4 border-primary animate-pulse" />
            </motion.div>
            
            {/* Click indicator */}
            <motion.div
                initial={{ opacity: 0, x: 20, y: 20 }}
                animate={{
                    opacity: [0, 1, 1, 1],
                    x: [20, 0, 0, -5],
                    y: [20, 0, 0, -5],
                    scale: [1, 1, 1, 0.9],
                }}
                transition={{
                    duration: 2,
                    times: [0, 0.3, 0.7, 1],
                    repeat: Infinity,
                    repeatDelay: 0.5,
                }}
                className="absolute pointer-events-none"
                style={{
                    left: targetRect.x + targetRect.width / 2,
                    top: targetRect.y + targetRect.height / 2,
                }}
            >
                <MousePointer2 
                    className="w-10 h-10 text-primary fill-background drop-shadow-lg" 
                    strokeWidth={2} 
                />
            </motion.div>
            
            {/* Tooltip */}
            {tooltipPosition && (
                <motion.div
                    initial={{ opacity: 0, y: tooltipPosition.position === "top" ? 10 : tooltipPosition.position === "bottom" ? -10 : 0, x: tooltipPosition.position === "left" ? 10 : tooltipPosition.position === "right" ? -10 : 0 }}
                    animate={{ opacity: 1, y: 0, x: 0 }}
                    className="absolute pointer-events-auto w-80"
                    style={tooltipPosition.style}
                >
                    <div className="bg-card border-4 border-border rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.15)] overflow-hidden">
                        {/* Color accent bar */}
                        <div className="h-2 bg-gradient-to-r from-primary via-accent to-secondary" />
                        
                        <div className="p-6">
                            {/* Close button */}
                            <button
                                onClick={onSkip}
                                className="absolute top-4 right-4 p-2 hover:bg-muted rounded-lg transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                            
                            {/* Step indicator */}
                            <p className="text-xs font-bold text-muted-foreground uppercase mb-2">
                                {t("stepCount", { current: stepNumber, total: totalSteps })}
                            </p>
                            
                            {/* Title */}
                            <h3 className="text-xl font-black uppercase mb-2 pr-8">
                                {t(step.titleKey)}
                            </h3>
                            
                            {/* Description */}
                            <p className="text-sm font-medium text-muted-foreground mb-6 leading-relaxed">
                                {t(step.descriptionKey)}
                            </p>
                            
                            {/* Click instruction */}
                            <div className="flex items-center gap-2 text-sm font-bold text-primary mb-4">
                                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
                                    <MousePointer2 className="w-3 h-3" />
                                </div>
                                {t("clickToContinue")}
                            </div>
                            
                            {/* Navigation */}
                            <div className="flex items-center justify-between pt-4 border-t-2 border-border/10">
                                <Button
                                    variant="ghost"
                                    onClick={onPrev}
                                    disabled={stepNumber === 1}
                                    className={cn(
                                        "font-bold",
                                        stepNumber === 1 && "invisible"
                                    )}
                                >
                                    <ArrowLeft className="w-4 h-4 mr-2" />
                                    {t("back")}
                                </Button>
                                
                                {/* Step dots */}
                                <div className="flex gap-1.5">
                                    {Array.from({ length: totalSteps }).map((_, i) => (
                                        <div
                                            key={i}
                                            className={cn(
                                                "w-2 h-2 rounded-full transition-all",
                                                i + 1 === stepNumber
                                                    ? "bg-primary scale-125"
                                                    : i + 1 < stepNumber
                                                    ? "bg-primary/50"
                                                    : "bg-muted"
                                            )}
                                        />
                                    ))}
                                </div>
                                
                                <Button
                                    variant="ghost"
                                    onClick={onSkip}
                                    className="font-bold text-muted-foreground"
                                >
                                    {t("skip")}
                                </Button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    )
}
