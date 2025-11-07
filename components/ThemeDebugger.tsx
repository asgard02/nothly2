"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

export function ThemeDebugger() {
  const { theme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <div className="fixed bottom-2 right-2 bg-card border border-border px-3 py-2 rounded-lg text-xs shadow-lg z-50">
      <div className="font-mono">
        <div className="text-foreground">theme: <span className="text-primary">{theme}</span></div>
        <div className="text-foreground">resolved: <span className="text-primary">{resolvedTheme}</span></div>
      </div>
    </div>
  )
}






