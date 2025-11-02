"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Évite les problèmes d'hydratation
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <button
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      className="rounded-lg p-2 text-sm bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors"
      aria-label="Basculer le thème"
    >
      {theme === "light" ? "🌙 Mode sombre" : "☀️ Mode clair"}
    </button>
  )
}

