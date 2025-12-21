"use client"

import React, { createContext, useContext, useState, useEffect } from "react"

interface TutorialContextType {
    startTutorial: () => void
    isOpen: boolean
    setIsOpen: (isOpen: boolean) => void
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined)

export function TutorialProvider({ children }: { children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false)

    const startTutorial = () => {
        // Reset the completion flag so it shows up
        localStorage.removeItem("nothly_tutorial_completed")
        setIsOpen(true)
    }

    // Initial check on mount
    // Initial check on mount
    useEffect(() => {
        // Check session storage
        const isFreshLoginSession = sessionStorage.getItem("nothly_fresh_login")

        // Check URL params (for OAuth/Magic Link redirects)
        const searchParams = new URLSearchParams(window.location.search)
        const isFreshLoginParam = searchParams.get("fresh_login") === "true"

        const hasSeen = localStorage.getItem("nothly_tutorial_completed")

        if ((isFreshLoginSession || isFreshLoginParam) && !hasSeen) {
            // Small delay to ensure smooth entry
            const timer = setTimeout(() => setIsOpen(true), 1000)

            // Consume the flags
            sessionStorage.removeItem("nothly_fresh_login")

            // Clean up URL if needed
            if (isFreshLoginParam) {
                const newUrl = window.location.pathname + window.location.hash
                window.history.replaceState({}, '', newUrl)
            }

            return () => clearTimeout(timer)
        }
    }, [])

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
