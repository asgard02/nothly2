"use client"

import { useState, useEffect } from "react"
import { Bell, Mail, MessageSquare, Sparkles, CheckCircle } from "lucide-react"

interface NotificationSettings {
    emailNotifications: boolean
    pushNotifications: boolean
    aiSuggestions: boolean
    weeklyDigest: boolean
    newFeatures: boolean
    marketingEmails: boolean
}

import { useTranslations } from "next-intl"

export default function NotificationsPage() {
    const t = useTranslations("Settings.Notifications")
    const [settings, setSettings] = useState<NotificationSettings>({
        emailNotifications: true,
        pushNotifications: true,
        aiSuggestions: true,
        weeklyDigest: false,
        newFeatures: true,
        marketingEmails: false,
    })
    const [saved, setSaved] = useState(false)

    useEffect(() => {
        // Charger les préférences
        const stored = localStorage.getItem("nothly_notifications")
        if (stored) {
            setSettings(JSON.parse(stored))
        }
    }, [])

    const handleToggle = (key: keyof NotificationSettings) => {
        const newSettings = {
            ...settings,
            [key]: !settings[key],
        }
        setSettings(newSettings)
        localStorage.setItem("nothly_notifications", JSON.stringify(newSettings))

        // Animation de sauvegarde
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
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


        </div>
    )
}
