"use client"

import { useState, useEffect } from "react"
import { Moon, Sun, Zap, Layout, Circle, Eye, CheckCircle } from "lucide-react"
import { useTheme } from "next-themes"

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
        <h1 className="text-3xl font-bold text-foreground mb-2">{t("title")}</h1>
        <p className="text-muted-foreground">
          {t("description")}
        </p>
      </div>

      {/* Indicateur de sauvegarde */}
      {saved && (
        <div className="mb-6 bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex items-center gap-3 animate-in fade-in duration-200">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <p className="text-sm font-medium text-green-500">
            {t("saved")}
          </p>
        </div>
      )}

      {/* Thème */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-6 mb-6 transition-colors">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <Moon className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">
            {t("theme")}
          </h2>
        </div>

        {!mounted ? (
          <div className="space-y-3">
            <div className="w-full h-20 bg-muted rounded-lg animate-pulse" />
            <div className="w-full h-20 bg-muted rounded-lg animate-pulse" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setTheme("light")}
              className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-all duration-200 ${theme === "light"
                ? "border-primary bg-primary/10"
                : "border-border hover:border-muted-foreground/50"
                }`}
            >
              <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                <Sun className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 text-left">
                <p className={`font-medium ${theme === "light" ? "text-primary" : "text-foreground"}`}>
                  {t("light")}
                </p>
                <p className="text-xs text-muted-foreground">{t("lightDesc")}</p>
              </div>
            </button>

            <button
              onClick={() => setTheme("dark")}
              className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-all duration-200 ${theme === "dark"
                ? "border-primary bg-primary/10"
                : "border-border hover:border-muted-foreground/50"
                }`}
            >
              <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                <Moon className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 text-left">
                <p className={`font-medium ${theme === "dark" ? "text-primary" : "text-foreground"}`}>
                  {t("dark")}
                </p>
                <p className="text-xs text-muted-foreground">{t("darkDesc")}</p>
              </div>
            </button>
          </div>
        )}
      </div>


    </div>
  )
}

