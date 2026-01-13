"use client"

import { useState, useEffect } from "react"
import { Moon, Sun, Zap, Layout, Circle, Eye, CheckCircle } from "lucide-react"
import { useTheme } from "next-themes"
import ThemeToggle from "@/components/ThemeToggle"

interface AppearanceSettings {
  animations: boolean
  density: "comfortable" | "compact" | "spacious"
  borderRadius: "none" | "small" | "medium" | "large"
  contrast: "normal" | "high"
}

import { useTranslations } from "next-intl"

export default function AppearanceSettingsPage() {
  const t = useTranslations("Settings.Appearance")
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [settings, setSettings] = useState<AppearanceSettings>({
    animations: true,
    density: "comfortable",
    borderRadius: "medium",
    contrast: "normal",
  })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const stored = localStorage.getItem("nothly_appearance")
    if (stored) {
      setSettings(JSON.parse(stored))
    }
  }, [])

  const saveSettings = (newSettings: AppearanceSettings) => {
    setSettings(newSettings)
    localStorage.setItem("nothly_appearance", JSON.stringify(newSettings))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleToggleAnimations = () => {
    const newSettings = { ...settings, animations: !settings.animations }
    saveSettings(newSettings)
  }

  return (
    <div className="max-w-3xl mx-auto p-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black uppercase text-foreground mb-2">{t("title")}</h1>
        <p className="text-muted-foreground font-medium">
          {t("description")}
        </p>
      </div>

      {/* Indicateur de sauvegarde */}
      {saved && (
        <div className="mb-6 bg-emerald-500/10 border-2 border-emerald-500/20 rounded-xl p-4 flex items-center gap-3 animate-in fade-in duration-200">
          <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
            {t("saved")}
          </p>
        </div>
      )}

      {/* Thème */}
      <div className="bg-card border-2 border-border rounded-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center border-2 border-border">
            <Moon className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-lg font-black uppercase text-foreground">
            {t("theme")}
          </h2>
        </div>

        <div className="p-4 rounded-lg bg-muted border-2 border-border flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-2 rounded-full bg-primary/20 border-2 border-border">
              <CheckCircle className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-black uppercase text-foreground">
                {mounted && theme === "dark" ? "Mode Sombre" : "Mode Clair"}
              </p>
              <p className="text-sm font-bold text-muted-foreground">
                {mounted && theme === "dark" 
                  ? "Le thème sombre est actif" 
                  : "Le thème clair est actif"}
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </div>


    </div>
  )
}

