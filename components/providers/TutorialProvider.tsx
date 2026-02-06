"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react"
import { usePathname, useRouter } from "next/navigation"

// Tutorial step definition
export interface TutorialStep {
    id: string
    targetSelector: string // data-tutorial attribute value
    titleKey: string // i18n key for title
    descriptionKey: string // i18n key for description
    position?: "top" | "bottom" | "left" | "right" | "auto"
    highlightPadding?: number
    /** When user clicks the target, navigate here before advancing (e.g. to show next steps on another page) */
    navigateTo?: string
    /** If true, don't preventDefault on click — let the native action happen (e.g. opening a dialog) */
    allowAction?: boolean
    /** Page on which this step is shown (path pattern) */
    pathPattern: "/workspace/dashboard" | "/workspace/subjects" | "/workspace/subjects/[id]"
}

function matchesPath(pathname: string, pathPattern: TutorialStep["pathPattern"]): boolean {
    if (pathPattern === "/workspace/dashboard") return pathname === "/workspace/dashboard"
    if (pathPattern === "/workspace/subjects") return pathname === "/workspace/subjects"
    if (pathPattern === "/workspace/subjects/[id]") {
        return pathname.startsWith("/workspace/subjects/") && pathname !== "/workspace/subjects"
    }
    return false
}

// Global ordered list of tutorial steps (all paths → ending with Raccourcis)
const GLOBAL_TUTORIAL_STEPS: TutorialStep[] = [
    {
        id: "dashboard-nav-subjects",
        pathPattern: "/workspace/dashboard",
        targetSelector: "nav-subjects",
        titleKey: "interactiveStepSubjectsTitle",
        descriptionKey: "interactiveStepSubjectsDesc",
        position: "right",
        navigateTo: "/workspace/subjects",
    },
    {
        id: "subjects-create-button",
        pathPattern: "/workspace/subjects",
        targetSelector: "create-subject-empty,create-subject-card",
        titleKey: "interactiveStepCreateSubjectTitle",
        descriptionKey: "interactiveStepCreateSubjectDesc",
        position: "bottom",
        allowAction: true,
    },
    {
        id: "subject-upload",
        pathPattern: "/workspace/subjects/[id]",
        targetSelector: "upload-button,upload-empty-state",
        titleKey: "interactiveStepUploadTitle",
        descriptionKey: "interactiveStepUploadDesc",
        position: "bottom",
        allowAction: true,
    },
    {
        id: "subject-tabs",
        pathPattern: "/workspace/subjects/[id]",
        targetSelector: "tabs-container",
        titleKey: "interactiveStepTabsTitle",
        descriptionKey: "interactiveStepTabsDesc",
        position: "bottom",
    },
    {
        id: "subject-actions",
        pathPattern: "/workspace/subjects/[id]",
        targetSelector: "action-buttons",
        titleKey: "interactiveStepActionsTitle",
        descriptionKey: "interactiveStepActionsDesc",
        position: "top",
    },
    {
        id: "subject-shortcuts",
        pathPattern: "/workspace/subjects/[id]",
        targetSelector: "action-buttons",
        titleKey: "interactiveStepShortcutsTitle",
        descriptionKey: "interactiveStepShortcutsDesc",
        position: "top",
    },
]

interface TutorialContextType {
    // Core state
    isOpen: boolean
    setIsOpen: (isOpen: boolean) => void
    isPaused: boolean // Paused while waiting for navigation (e.g. after opening a dialog)
    
    // Step management
    currentStep: number
    currentStepData: TutorialStep | null
    totalSteps: number
    steps: TutorialStep[]
    
    // Actions
    startTutorial: () => void
    nextStep: () => void
    prevStep: () => void
    skipTutorial: () => void
    completeTutorial: () => void
    pauseTutorial: () => void // Pause while user interacts with dialog
    resumeTutorial: () => void // Resume and advance to next step (after dialog closes)
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined)

export function TutorialProvider({ children }: { children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false)
    const [isPaused, setIsPaused] = useState(false)
    const [currentStep, setCurrentStep] = useState(0)
    const pathname = usePathname()
    const router = useRouter()

    // Global steps (single ordered list)
    const steps = GLOBAL_TUTORIAL_STEPS
    const totalSteps = steps.length
    // Only show current step if we're on the page it belongs to
    const currentStepData = useMemo(() => {
        const step = steps[currentStep]
        if (!step || !pathname) return null
        return matchesPath(pathname, step.pathPattern) ? step : null
    }, [steps, currentStep, pathname])

    const startTutorial = useCallback(() => {
        // Reset the completion flag so it shows up
        localStorage.removeItem("nothly_tutorial_v6_completed")
        setCurrentStep(0)
        setIsOpen(true)
        // Redirect to dashboard so we always start from step 0 (all paths → raccourcis)
        if (pathname !== "/workspace/dashboard") {
            router.push("/workspace/dashboard")
        }
    }, [pathname, router])

    const completeTutorial = useCallback(() => {
        localStorage.setItem("nothly_tutorial_v6_completed", "true")
        setIsOpen(false)
        setCurrentStep(0)
        setIsPaused(false)
    }, [])

    const skipTutorial = useCallback(() => {
        localStorage.setItem("nothly_tutorial_v6_completed", "true")
        setIsOpen(false)
        setCurrentStep(0)
    }, [])

    const nextStep = useCallback(() => {
        if (currentStep < totalSteps - 1) {
            setCurrentStep(prev => prev + 1)
        } else {
            completeTutorial()
        }
    }, [currentStep, totalSteps])

    const prevStep = useCallback(() => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1)
        }
    }, [currentStep])

    const pauseTutorial = useCallback(() => {
        setIsPaused(true)
    }, [])

    const resumeTutorial = useCallback(() => {
        setIsPaused(false)
        if (currentStep < totalSteps - 1) {
            setCurrentStep(prev => prev + 1)
        } else {
            completeTutorial()
        }
    }, [currentStep, totalSteps])

    // Initial check on mount + listen for storage changes + PATH CHANGE (for redirects)
    useEffect(() => {
        const checkAndLaunch = () => {
            // Check session storage
            const isFreshLoginSession = sessionStorage.getItem("nothly_fresh_login")

            // Check URL params
            const searchParams = new URLSearchParams(window.location.search)
            const isFreshLoginParam = searchParams.get("fresh_login") === "true"

            const hasSeen = localStorage.getItem("nothly_tutorial_v6_completed")

            // Logic: Show if it's a fresh login (session or param) AND they haven't seen it yet
            if ((isFreshLoginSession || isFreshLoginParam) && !hasSeen) {
                // Small delay to ensure hydration/layout stability
                setTimeout(() => {
                    setCurrentStep(0)
                    setIsOpen(true)

                    // Cleanup flags
                    sessionStorage.removeItem("nothly_fresh_login")
                    if (isFreshLoginParam) {
                        const newUrl = window.location.pathname + window.location.hash
                        window.history.replaceState({}, '', newUrl)
                    }
                }, 500)
            }
        }

        // Run immediately and on path change
        checkAndLaunch()

        // Also listen for a custom event we will dispatch from login page
        window.addEventListener("nothly-login-success", checkAndLaunch)

        return () => window.removeEventListener("nothly-login-success", checkAndLaunch)
    }, [pathname])

    return (
        <TutorialContext.Provider value={{
            isOpen,
            setIsOpen,
            isPaused,
            currentStep,
            currentStepData,
            totalSteps,
            steps,
            startTutorial,
            nextStep,
            prevStep,
            skipTutorial,
            completeTutorial,
            pauseTutorial,
            resumeTutorial,
        }}>
            {children}
        </TutorialContext.Provider>
    )
}

export function useTutorial() {
    const context = useContext(TutorialContext)
    if (context === undefined) {
        throw new Error("useTutorial must be used within a TutorialProvider")
    }
    return context
}
