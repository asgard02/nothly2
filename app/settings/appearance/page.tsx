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
      <div className="bg-slate-900/50 rounded-xl border border-white/5 shadow-2xl p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-indigo-500/10 rounded-lg flex items-center justify-center border border-indigo-500/20">
            <Moon className="h-5 w-5 text-indigo-400" />
          </div>
          <h2 className="text-lg font-semibold text-white">
            {t("theme")}
          </h2>
        </div>

        <div className="p-4 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center gap-4">
          <div className="p-2 rounded-full bg-indigo-500/20">
            <CheckCircle className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <p className="font-medium text-white">
              Antigravity Dark Mode
            </p>
            <p className="text-sm text-slate-400">
              The unified dark theme is active by default.
            </p>
          </div>
        </div>
      </div>


    </div>
  )
}

