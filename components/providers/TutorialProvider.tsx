"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from "react"
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
    const hasCheckedOnboarding = useRef(false)
    const isOpenRef = useRef(false)

    // Keep ref in sync with state
    useEffect(() => { isOpenRef.current = isOpen }, [isOpen])

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
        // Reset the local completion flag so it shows up
        localStorage.removeItem("nothly_tutorial_v6_completed")
        setCurrentStep(0)
        setIsOpen(true)
        // Redirect to dashboard so we always start from step 0 (all paths → raccourcis)
        if (pathname !== "/workspace/dashboard") {
            router.push("/workspace/dashboard")
        }
    }, [pathname, router])

    // Mark onboarding as completed in the database
    const markOnboardingCompleted = useCallback(async () => {
        localStorage.setItem("nothly_tutorial_v6_completed", "true")
        try {
            await fetch("/api/onboarding", { method: "POST" })
        } catch (err) {
            console.error("[Tutorial] Failed to mark onboarding completed:", err)
        }
    }, [])

    const completeTutorial = useCallback(() => {
        markOnboardingCompleted()
        setIsOpen(false)
        setCurrentStep(0)
        setIsPaused(false)
    }, [markOnboardingCompleted])

    const skipTutorial = useCallback(() => {
        markOnboardingCompleted()
        setIsOpen(false)
        setCurrentStep(0)
    }, [markOnboardingCompleted])

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
        // Only advance if the tutorial is actually open
        if (!isOpenRef.current) return
        setIsPaused(false)
        setCurrentStep(prev => {
            if (prev < totalSteps - 1) {
                return prev + 1
            }
            return prev
        })
    }, [totalSteps])

    // Check onboarding status from the database on first load in workspace
    useEffect(() => {
        // Only check on workspace/calendar/settings pages (authenticated area)
        const isAuthenticatedPage = pathname?.startsWith("/workspace") || pathname?.startsWith("/calendar") || pathname?.startsWith("/settings")
        if (!isAuthenticatedPage) return
        if (hasCheckedOnboarding.current) return

        const checkOnboardingStatus = async () => {
            try {
                const res = await fetch("/api/onboarding")
                if (!res.ok) return

                const data = await res.json()
                hasCheckedOnboarding.current = true

                if (data.has_completed_onboarding) {
                    // User already completed onboarding — sync localStorage
                    localStorage.setItem("nothly_tutorial_v6_completed", "true")
                    return
                }

                // User has NOT completed onboarding → show tutorial
                // Clear any stale localStorage from a previous account on same browser
                localStorage.removeItem("nothly_tutorial_v6_completed")

                // Small delay to ensure hydration/layout stability
                setTimeout(() => {
                    setCurrentStep(0)
                    setIsOpen(true)

                    // If not on dashboard, redirect there to start tutorial from step 0
                    if (pathname !== "/workspace/dashboard") {
                        router.push("/workspace/dashboard")
                    }
                }, 800)
            } catch (err) {
                console.error("[Tutorial] Failed to check onboarding status:", err)
            }
        }

        // Small delay to allow the page to settle after login redirect
        const timer = setTimeout(checkOnboardingStatus, 300)
        return () => clearTimeout(timer)
    }, [pathname, router])

    // Also listen for legacy "nothly-login-success" event (backward compat for current session)
    useEffect(() => {
        const handleLoginSuccess = () => {
            // Reset the ref so we re-check onboarding status
            hasCheckedOnboarding.current = false
        }

        window.addEventListener("nothly-login-success", handleLoginSuccess)
        return () => window.removeEventListener("nothly-login-success", handleLoginSuccess)
    }, [])

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
