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
        localStorage.removeItem("nothly_tutorial_v3_completed")
        setIsOpen(true)
    }

    // Initial check on mount
    // Initial check on mount + listen for storage changes
    useEffect(() => {
        const checkAndLaunch = () => {
            // Check session storage
            const isFreshLoginSession = sessionStorage.getItem("nothly_fresh_login")

            // Check URL params
            const searchParams = new URLSearchParams(window.location.search)
            const isFreshLoginParam = searchParams.get("fresh_login") === "true"

            const hasSeen = localStorage.getItem("nothly_tutorial_v3_completed")

            console.log("[TutorialProvider] Checking launch conditions:", {
                isFreshLoginSession,
                isFreshLoginParam,
                hasSeen
            })


            // DEBUG FORCE: We ignore hasSeen for now to prove it works
            // if ((isFreshLoginSession || isFreshLoginParam) && !hasSeen) {

            if (isFreshLoginSession || isFreshLoginParam) {
                console.log("[TutorialProvider] FORCING tutorial open (Ignoring hasSeen for debug)...")
                setTimeout(() => {
                    console.log("[TutorialProvider] OPENING NOW.")
                    setIsOpen(true)
                    sessionStorage.removeItem("nothly_fresh_login")

                    if (isFreshLoginParam) {
                        const newUrl = window.location.pathname + window.location.hash
                        window.history.replaceState({}, '', newUrl)
                    }
                }, 500)
            } else {
                console.log("[TutorialProvider] Not forcing open. Session:", isFreshLoginSession, "Param:", isFreshLoginParam)
            }
        }

        // Run immediately
        checkAndLaunch()

        // Also listen for a custom event we will dispatch from login page
        window.addEventListener("nothly-login-success", checkAndLaunch)

        return () => window.removeEventListener("nothly-login-success", checkAndLaunch)
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
