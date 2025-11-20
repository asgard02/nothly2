"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useLocale } from "next-intl"
import { Globe, Clock, CheckCircle } from "lucide-react"

interface LanguageSettings {
    language: string
    timezone: string
    dateFormat: string
    timeFormat: "12h" | "24h"
}

export default function LanguagePage() {
    const router = useRouter()
    const pathname = usePathname()
    const currentLocale = useLocale() // Récupérer la locale actuelle depuis next-intl
    
    const [settings, setSettings] = useState<LanguageSettings>({
        language: currentLocale || "en", // Utiliser la locale actuelle
        timezone: "Europe/Paris",
        dateFormat: "DD/MM/YYYY",
        timeFormat: "24h",
    })
    const [saved, setSaved] = useState(false)

    useEffect(() => {
        // Charger depuis localStorage si disponible, sinon utiliser la locale actuelle
        const stored = localStorage.getItem("nothly_language")
        if (stored) {
            try {
                const parsed = JSON.parse(stored)
                setSettings(prev => ({
                    ...prev,
                    language: parsed.language || currentLocale || "en",
                    timezone: parsed.timezone || prev.timezone,
                    dateFormat: parsed.dateFormat || prev.dateFormat,
                    timeFormat: parsed.timeFormat || prev.timeFormat,
                }))
            } catch {
                // Si erreur de parsing, utiliser la locale actuelle
                setSettings(prev => ({
                    ...prev,
                    language: currentLocale || "en",
                }))
            }
        } else {
            // Si pas de localStorage, utiliser la locale actuelle
            setSettings(prev => ({
                ...prev,
                language: currentLocale || "en",
            }))
        }
    }, [currentLocale])

    const saveSettings = (newSettings: LanguageSettings) => {
        const languageChanged = newSettings.language !== settings.language

        setSettings(newSettings)
        localStorage.setItem("nothly_language", JSON.stringify(newSettings))

        // Si la langue a changé, mettre à jour le cookie et recharger
        if (languageChanged) {
            // Définir le cookie pour next-intl (même nom que dans i18n/request.ts)
            document.cookie = `NEXT_LOCALE=${newSettings.language}; path=/; max-age=31536000; SameSite=Lax`
            setSaved(true)
            // Petit délai pour montrer le message de sauvegarde puis recharger
            setTimeout(() => {
                window.location.reload()
            }, 500)
        } else {
            setSaved(true)
            setTimeout(() => setSaved(false), 2000)
        }
    }

    const languages = [
        { code: "en", name: "English", flag: "🇬🇧" },
        { code: "fr", name: "Français", flag: "🇫🇷" },
    ]

    const timezones = [
        { value: "Europe/Paris", label: "Paris (GMT+1)" },
        { value: "Europe/London", label: "Londres (GMT+0)" },
        { value: "America/New_York", label: "New York (GMT-5)" },
        { value: "America/Los_Angeles", label: "Los Angeles (GMT-8)" },
        { value: "Asia/Tokyo", label: "Tokyo (GMT+9)" },
        { value: "Australia/Sydney", label: "Sydney (GMT+11)" },
    ]

    const dateFormats = [
        { value: "DD/MM/YYYY", label: "31/12/2025" },
        { value: "MM/DD/YYYY", label: "12/31/2025" },
        { value: "YYYY-MM-DD", label: "2025-12-31" },
    ]

    return (
        <div className="max-w-3xl mx-auto p-10">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-foreground mb-2">Langue & Région</h1>
                <p className="text-muted-foreground">
                    Personnalisez la langue et les formats régionaux
                </p>
            </div>

            {/* Indicateur de sauvegarde */}
            {saved && (
                <div className="mb-6 bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex items-center gap-3 animate-in fade-in duration-200">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <p className="text-sm font-medium text-green-500">
                        Paramètres enregistrés
                    </p>
                </div>
            )}

            {/* Langue */}
            <div className="bg-card rounded-xl border border-border shadow-sm p-6 mb-6 transition-colors">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Globe className="h-5 w-5 text-primary" />
                    </div>
                    <h2 className="text-lg font-semibold text-foreground">
                        Langue de l'interface
                    </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {languages.map((lang) => (
                        <button
                            key={lang.code}
                            onClick={() => saveSettings({ ...settings, language: lang.code })}
                            className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all duration-200 ${settings.language === lang.code
                                ? "border-primary bg-primary/10"
                                : "border-border hover:border-muted-foreground/50"
                                }`}
                        >
                            <span className="text-2xl">{lang.flag}</span>
                            <span className={`font-medium ${settings.language === lang.code
                                ? "text-primary"
                                : "text-foreground"
                                }`}>
                                {lang.name}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Fuseau horaire */}
            <div className="bg-card rounded-xl border border-border shadow-sm p-6 mb-6 transition-colors">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <h2 className="text-lg font-semibold text-foreground">
                        Fuseau horaire
                    </h2>
                </div>

                <select
                    value={settings.timezone}
                    onChange={(e) => saveSettings({ ...settings, timezone: e.target.value })}
                    className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                >
                    {timezones.map((tz) => (
                        <option key={tz.value} value={tz.value}>
                            {tz.label}
                        </option>
                    ))}
                </select>
            </div>

            {/* Format de date */}
            <div className="bg-card rounded-xl border border-border shadow-sm p-6 mb-6 transition-colors">
                <h2 className="text-lg font-semibold text-foreground mb-4">
                    Format de date
                </h2>

                <div className="grid grid-cols-3 gap-3">
                    {dateFormats.map((format) => (
                        <button
                            key={format.value}
                            onClick={() => saveSettings({ ...settings, dateFormat: format.value })}
                            className={`p-4 rounded-lg border-2 transition-all duration-200 ${settings.dateFormat === format.value
                                ? "border-primary bg-primary/10"
                                : "border-border hover:border-muted-foreground/50"
                                }`}
                        >
                            <p className={`text-sm font-medium ${settings.dateFormat === format.value
                                ? "text-primary"
                                : "text-foreground"
                                }`}>
                                {format.label}
                            </p>
                        </button>
                    ))}
                </div>
            </div>

            {/* Format d'heure */}
            <div className="bg-card rounded-xl border border-border shadow-sm p-6 transition-colors">
                <h2 className="text-lg font-semibold text-foreground mb-4">
                    Format d'heure
                </h2>

                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => saveSettings({ ...settings, timeFormat: "12h" })}
                        className={`p-4 rounded-lg border-2 transition-all duration-200 ${settings.timeFormat === "12h"
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-muted-foreground/50"
                            }`}
                    >
                        <p className={`text-sm font-medium ${settings.timeFormat === "12h"
                            ? "text-primary"
                            : "text-foreground"
                            }`}>
                            12 heures (3:30 PM)
                        </p>
                    </button>
                    <button
                        onClick={() => saveSettings({ ...settings, timeFormat: "24h" })}
                        className={`p-4 rounded-lg border-2 transition-all duration-200 ${settings.timeFormat === "24h"
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-muted-foreground/50"
                            }`}
                    >
                        <p className={`text-sm font-medium ${settings.timeFormat === "24h"
                            ? "text-primary"
                            : "text-foreground"
                            }`}>
                            24 heures (15:30)
                        </p>
                    </button>
                </div>
            </div>
        </div>
    )
}
