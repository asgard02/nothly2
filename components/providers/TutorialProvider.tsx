"use client"

import React, { createContext, useContext, useState, useEffect } from "react"

interface TutorialContextType {
    startTutorial: () => void
    isOpen: boolean
    setIsOpen: (isOpen: boolean) => void
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined)

import { usePathname } from "next/navigation"

export function TutorialProvider({ children }: { children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false)
    const pathname = usePathname()

    const startTutorial = () => {
        // Reset the completion flag so it shows up
        localStorage.removeItem("nothly_tutorial_v5_completed")
        setIsOpen(true)
    }

    // Initial check on mount + listen for storage changes + PATH CHANGE (for redirects)
    useEffect(() => {
        const checkAndLaunch = () => {
            // Check session storage
            const isFreshLoginSession = sessionStorage.getItem("nothly_fresh_login")

            // Check URL params
            const searchParams = new URLSearchParams(window.location.search)
            const isFreshLoginParam = searchParams.get("fresh_login") === "true"

            const hasSeen = localStorage.getItem("nothly_tutorial_v5_completed")

            console.log("[TutorialProvider] Checking launch conditions:", {
                isFreshLoginSession,
                isFreshLoginParam,
                hasSeen,
                pathname
            })

            // Logic: Show if it's a fresh login (session or param) AND they haven't seen it yet
            if ((isFreshLoginSession || isFreshLoginParam) && !hasSeen) {
                console.log("[TutorialProvider] Launching tutorial...")

                // Small delay to ensure hydration/layout stability
                setTimeout(() => {
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
        <TutorialContext.Provider value={{ startTutorial, isOpen, setIsOpen }}>
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
