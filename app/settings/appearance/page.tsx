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

export default function AppearanceSettingsPage() {
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
        <h1 className="text-3xl font-bold text-foreground mb-2">Apparence</h1>
        <p className="text-muted-foreground">
          Personnalisez l'apparence de Nothly
        </p>
      </div>

      {/* Indicateur de sauvegarde */}
      {saved && (
        <div className="mb-6 bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex items-center gap-3 animate-in fade-in duration-200">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <p className="text-sm font-medium text-green-500">
            Préférences enregistrées
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
            Thème
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
                  Clair
                </p>
                <p className="text-xs text-muted-foreground">Thème lumineux</p>
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
                  Sombre
                </p>
                <p className="text-xs text-muted-foreground">Repose vos yeux</p>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Animations */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-6 mb-6 transition-colors">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <Zap className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">
            Animations
          </h2>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-foreground">Activer les animations</p>
            <p className="text-sm text-muted-foreground">
              Transitions et effets visuels fluides
            </p>
          </div>
          <button
            onClick={handleToggleAnimations}
            className={`relative w-12 h-6 rounded-full transition-all duration-200 ${settings.animations ? "bg-primary" : "bg-muted"
              }`}
          >
            <div
              className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-200 ${settings.animations ? "left-[26px]" : "left-0.5"
                }`}
            />
          </button>
        </div>
      </div>

      {/* Densité */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-6 mb-6 transition-colors">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <Layout className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">
            Densité de l'interface
          </h2>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { value: "compact" as const, label: "Compact", desc: "Plus d'infos" },
            { value: "comfortable" as const, label: "Confortable", desc: "Équilibré" },
            { value: "spacious" as const, label: "Spacieux", desc: "Plus d'espace" },
          ].map((item) => (
            <button
              key={item.value}
              onClick={() => saveSettings({ ...settings, density: item.value })}
              className={`p-4 rounded-lg border-2 transition-all duration-200 ${settings.density === item.value
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-muted-foreground/50"
                }`}
            >
              <p className={`font-medium text-sm ${settings.density === item.value ? "text-primary" : "text-foreground"
                }`}>
                {item.label}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Bordures arrondies */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-6 mb-6 transition-colors">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <Circle className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">
            Bordures arrondies
          </h2>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {[
            { value: "none" as const, label: "Aucune", radius: "0px" },
            { value: "small" as const, label: "Petite", radius: "4px" },
            { value: "medium" as const, label: "Moyenne", radius: "8px" },
            { value: "large" as const, label: "Grande", radius: "16px" },
          ].map((item) => (
            <button
              key={item.value}
              onClick={() => saveSettings({ ...settings, borderRadius: item.value })}
              className={`p-4 rounded-lg border-2 transition-all duration-200 ${settings.borderRadius === item.value
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-muted-foreground/50"
                }`}
            >
              <div
                className="w-full h-12 bg-primary/20 mb-2"
                style={{ borderRadius: item.radius }}
              />
              <p className={`text-xs font-medium ${settings.borderRadius === item.value ? "text-primary" : "text-foreground"
                }`}>
                {item.label}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Contraste */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-6 transition-colors">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <Eye className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">
            Contraste
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { value: "normal" as const, label: "Normal", desc: "Contraste standard" },
            { value: "high" as const, label: "Élevé", desc: "Meilleure lisibilité" },
          ].map((item) => (
            <button
              key={item.value}
              onClick={() => saveSettings({ ...settings, contrast: item.value })}
              className={`p-4 rounded-lg border-2 transition-all duration-200 ${settings.contrast === item.value
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-muted-foreground/50"
                }`}
            >
              <p className={`font-medium text-sm ${settings.contrast === item.value ? "text-primary" : "text-foreground"
                }`}>
                {item.label}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

