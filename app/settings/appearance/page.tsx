"use client"

import { useState, useEffect } from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

export default function AppearanceSettingsPage() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [accentColor, setAccentColor] = useState("blue")
  const [fontSize, setFontSize] = useState("normal")

  // Évite les problèmes d'hydratation
  useEffect(() => {
    setMounted(true)
  }, [])

  // Charger les préférences (sauf le thème qui est géré par next-themes)
  useEffect(() => {
    const stored = localStorage.getItem("nothly_appearance")
    if (stored) {
      const settings = JSON.parse(stored)
      setAccentColor(settings.accentColor || "blue")
      setFontSize(settings.fontSize || "normal")
    }
  }, [])

  // Sauvegarder les préférences (sans le thème)
  const savePreferences = () => {
    const settings = {
      accentColor,
      fontSize,
    }
    localStorage.setItem("nothly_appearance", JSON.stringify(settings))
  }

  const handleDarkMode = (newTheme: "light" | "dark") => {
    setTheme(newTheme)
  }

  const handleAccentColor = (color: string) => {
    setAccentColor(color)
    savePreferences()
  }

  const handleFontSize = (size: string) => {
    setFontSize(size)
    savePreferences()
  }

  const colors = [
    { name: "Bleu", value: "blue", hex: "#3B82F6" },
    { name: "Violet", value: "purple", hex: "#A855F7" },
    { name: "Vert", value: "green", hex: "#10B981" },
    { name: "Gris", value: "gray", hex: "#6B7280" },
  ]

  return (
    <div className="max-w-3xl mx-auto p-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Apparence</h1>
        <p className="text-muted-foreground">
          Personnalisez l'apparence de Notlhy
        </p>
      </div>

      {/* Thème */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-6 mb-6 transition-colors">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Thème
        </h2>

        {!mounted ? (
          <div className="space-y-3">
            <div className="w-full h-20 bg-muted rounded-lg animate-pulse" />
            <div className="w-full h-20 bg-muted rounded-lg animate-pulse" />
          </div>
        ) : (
          <div className="space-y-3">
            <button
              onClick={() => handleDarkMode("light")}
              className={`w-full flex items-center gap-4 p-4 rounded-lg border transition-all duration-200 ${
                theme === "light"
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-muted-foreground/50"
              }`}
            >
              <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                <Sun className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-foreground">Clair</p>
                <p className="text-sm text-muted-foreground">Thème clair par défaut</p>
              </div>
            </button>

            <button
              onClick={() => handleDarkMode("dark")}
              className={`w-full flex items-center gap-4 p-4 rounded-lg border transition-all duration-200 ${
                theme === "dark"
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-muted-foreground/50"
              }`}
            >
              <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                <Moon className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-foreground">Sombre</p>
                <p className="text-sm text-muted-foreground">Thème sombre pour vos yeux</p>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Couleur principale */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-6 mb-6 transition-colors">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Couleur principale
        </h2>

        <div className="grid grid-cols-4 gap-3">
          {colors.map((color) => (
            <button
              key={color.value}
              onClick={() => handleAccentColor(color.value)}
              className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                accentColor === color.value
                  ? "border-foreground bg-muted"
                  : "border-border hover:border-muted-foreground/50"
              }`}
            >
              <div
                className="w-full h-16 rounded-lg mb-2"
                style={{ backgroundColor: color.hex }}
              />
              <p className="text-sm font-medium text-foreground">{color.name}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Taille du texte */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-6 transition-colors">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Taille du texte
        </h2>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Petit", value: "small", size: "text-sm" },
            { label: "Normal", value: "normal", size: "text-base" },
            { label: "Grand", value: "large", size: "text-lg" },
          ].map((item) => (
            <button
              key={item.value}
              onClick={() => handleFontSize(item.value)}
              className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                fontSize === item.value
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-muted-foreground/50"
              }`}
            >
              <p className={`font-medium text-foreground ${item.size}`}>
                {item.label}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

