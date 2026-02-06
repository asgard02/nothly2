"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import { Globe, CheckCircle } from "lucide-react"

interface LanguageSettings {
    language: string
    timezone: string
    dateFormat: string
    timeFormat: "12h" | "24h"
}

export default function LanguagePage() {
    const router = useRouter()
    const pathname = usePathname()
    const currentLocale = useLocale()
    const t = useTranslations("Settings.Language")

    const [settings, setSettings] = useState<LanguageSettings>({
        language: currentLocale || "en",
        timezone: "Europe/Paris",
        dateFormat: "DD/MM/YYYY",
        timeFormat: "24h",
    })
    const [saved, setSaved] = useState(false)

    useEffect(() => {
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
                setSettings(prev => ({
                    ...prev,
                    language: currentLocale || "en",
                }))
            }
        } else {
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

        if (languageChanged) {
            document.cookie = `NEXT_LOCALE=${newSettings.language}; path=/; max-age=31536000; SameSite=Lax`
            setSaved(true)
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

            {/* Langue */}
            <div className="bg-card border-2 border-border rounded-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.15)] p-6 mb-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center border-2 border-border">
                        <Globe className="h-5 w-5 text-primary" />
                    </div>
                    <h2 className="text-lg font-black uppercase text-foreground">
                        {t("interfaceLanguage")}
                    </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {languages.map((lang) => (
                        <button
                            key={lang.code}
                            onClick={() => saveSettings({ ...settings, language: lang.code })}
                            className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 font-bold ${settings.language === lang.code
                                ? "border-primary bg-primary/10 shadow-[4px_4px_0px_0px_#8B5CF6] -translate-y-1"
                                : "border-border hover:border-primary/50 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.15)] hover:-translate-y-1"
                                }`}
                        >
                            <span className="text-2xl">{lang.flag}</span>
                            <span className={`font-bold uppercase tracking-wide ${settings.language === lang.code
                                ? "text-primary"
                                : "text-foreground"
                                }`}>
                                {lang.name}
                            </span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}
