"use client"

import React, { createContext, useContext, useEffect, useState } from "react"

interface SidebarContextType {
  isOpen: boolean
  toggle: () => void
  close: () => void
  open: () => void
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem("sidebar-state")
    if (saved !== null) {
      setIsOpen(JSON.parse(saved))
    }
    setMounted(true)
  }, [])

  const toggle = () => {
    const newState = !isOpen
    setIsOpen(newState)
    localStorage.setItem("sidebar-state", JSON.stringify(newState))
  }

  const close = () => {
    setIsOpen(false)
    localStorage.setItem("sidebar-state", "false")
  }

  const open = () => {
    setIsOpen(true)
    localStorage.setItem("sidebar-state", "true")
  }

  // Prevent hydration mismatch by not rendering until mounted, 
  // or accept a flash of default state. 
  // Better user experience: default to true (desktop) 
  
  return (
    <SidebarContext.Provider value={{ isOpen, toggle, close, open }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const context = useContext(SidebarContext)
  if (context === undefined) {
    throw new Error("useSidebar must be used within a SidebarProvider")
  }
  return context
}

