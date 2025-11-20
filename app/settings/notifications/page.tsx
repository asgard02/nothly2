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

export default function NotificationsPage() {
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

    const notificationGroups = [
        {
            title: "Notifications essentielles",
            icon: Bell,
            items: [
                {
                    key: "emailNotifications" as keyof NotificationSettings,
                    label: "Notifications par email",
                    description: "Recevez des emails pour les événements importants",
                },
                {
                    key: "pushNotifications" as keyof NotificationSettings,
                    label: "Notifications push",
                    description: "Notifications dans le navigateur",
                },
            ],
        },
        {
            title: "Intelligence artificielle",
            icon: Sparkles,
            items: [
                {
                    key: "aiSuggestions" as keyof NotificationSettings,
                    label: "Suggestions IA",
                    description: "Recevez des suggestions pour améliorer vos notes",
                },
            ],
        },
        {
            title: "Récapitulatifs",
            icon: MessageSquare,
            items: [
                {
                    key: "weeklyDigest" as keyof NotificationSettings,
                    label: "Récapitulatif hebdomadaire",
                    description: "Un résumé de votre activité chaque semaine",
                },
            ],
        },
        {
            title: "Mises à jour",
            icon: Mail,
            items: [
                {
                    key: "newFeatures" as keyof NotificationSettings,
                    label: "Nouvelles fonctionnalités",
                    description: "Soyez informé des nouvelles fonctionnalités",
                },
                {
                    key: "marketingEmails" as keyof NotificationSettings,
                    label: "Emails marketing",
                    description: "Offres spéciales et actualités",
                },
            ],
        },
    ]

    return (
        <div className="max-w-3xl mx-auto p-10">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-foreground mb-2">Notifications</h1>
                <p className="text-muted-foreground">
                    Gérez vos préférences de notifications
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

            {/* Groupes de notifications */}
            <div className="space-y-6">
                {notificationGroups.map((group) => {
                    const Icon = group.icon
                    return (
                        <div
                            key={group.title}
                            className="bg-card rounded-xl border border-border shadow-sm p-6 transition-colors"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                                    <Icon className="h-5 w-5 text-primary" />
                                </div>
                                <h2 className="text-lg font-semibold text-foreground">
                                    {group.title}
                                </h2>
                            </div>

                            <div className="space-y-4">
                                {group.items.map((item) => (
                                    <div
                                        key={item.key}
                                        className="flex items-center justify-between py-3 border-b border-border last:border-0"
                                    >
                                        <div className="flex-1">
                                            <p className="font-medium text-foreground text-sm">
                                                {item.label}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {item.description}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleToggle(item.key)}
                                            className={`relative w-12 h-6 rounded-full transition-all duration-200 ${settings[item.key]
                                                    ? "bg-primary"
                                                    : "bg-muted"
                                                }`}
                                        >
                                            <div
                                                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-200 ${settings[item.key]
                                                        ? "left-[26px]"
                                                        : "left-0.5"
                                                    }`}
                                            />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Info */}
            <div className="mt-6 bg-primary/10 border border-primary/20 rounded-xl p-6 transition-colors">
                <h3 className="text-sm font-semibold text-foreground mb-2">
                    💡 À savoir
                </h3>
                <p className="text-sm text-muted-foreground">
                    Vous pouvez modifier ces préférences à tout moment. Les notifications
                    essentielles liées à la sécurité de votre compte seront toujours envoyées.
                </p>
            </div>
        </div>
    )
}
