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
    useEffect(() => {
        const hasSeen = localStorage.getItem("nothly_tutorial_completed")
        if (!hasSeen) {
            // Small delay to ensure smooth entry
            const timer = setTimeout(() => setIsOpen(true), 1000)
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
