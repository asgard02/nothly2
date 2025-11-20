"use client"

import { useState, useEffect } from "react"
import { X, ChevronRight, User, Palette, CreditCard, Shield, Bell, Globe, Database } from "lucide-react"

interface SettingsModalProps {
    isOpen: boolean
    onClose: () => void
}

type SettingSection = "profile" | "appearance" | "plan" | "security" | "notifications" | "language" | "data"

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
    const [activeSection, setActiveSection] = useState<SettingSection>("profile")
    const [ActiveComponent, setActiveComponent] = useState<any>(null)
    const [loading, setLoading] = useState(false)

    const loadComponent = async (section: SettingSection) => {
        setLoading(true)
        setActiveSection(section)

        try {
            let component
            switch (section) {
                case "profile":
                    component = (await import("@/app/settings/profile/page")).default
                    break
                case "appearance":
                    component = (await import("@/app/settings/appearance/page")).default
                    break
                case "plan":
                    component = (await import("@/app/settings/plan/page")).default
                    break
                case "security":
                    component = (await import("@/app/settings/security/page")).default
                    break
                case "notifications":
                    component = (await import("@/app/settings/notifications/page")).default
                    break
                case "language":
                    component = (await import("@/app/settings/language/page")).default
                    break
                case "data":
                    component = (await import("@/app/settings/data/page")).default
                    break
            }
            setActiveComponent(() => component)
        } catch (error) {
            console.error("Error loading component:", error)
        } finally {
            setLoading(false)
        }
    }

    // Load initial component when modal opens
    useEffect(() => {
        if (isOpen && !ActiveComponent) {
            loadComponent("profile")
        }
    }, [isOpen])

    if (!isOpen) return null

    const menuItems = [
        {
            id: "profile" as SettingSection,
            label: "Profil",
            icon: User,
        },
        {
            id: "appearance" as SettingSection,
            label: "Apparence",
            icon: Palette,
        },
        {
            id: "plan" as SettingSection,
            label: "Abonnement",
            icon: CreditCard,
        },
        {
            id: "security" as SettingSection,
            label: "Sécurité",
            icon: Shield,
        },
        {
            id: "notifications" as SettingSection,
            label: "Notifications",
            icon: Bell,
        },
        {
            id: "language" as SettingSection,
            label: "Langue & Région",
            icon: Globe,
        },
        {
            id: "data" as SettingSection,
            label: "Données",
            icon: Database,
        },
    ]

    return (
        <>
            {/* Backdrop - sans blur pour de meilleures performances */}
            <div
                className="fixed inset-0 bg-black/70 z-50 animate-in fade-in duration-150"
                onClick={onClose}
            />

            {/* Modal Container */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                <div
                    className="w-full max-w-5xl h-[85vh] bg-background rounded-2xl shadow-2xl flex overflow-hidden pointer-events-auto animate-in zoom-in-95 duration-150"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Settings Sidebar */}
                    <aside className="w-72 bg-card border-r border-border flex flex-col">
                        {/* Header */}
                        <div className="p-6 border-b border-border flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-foreground">Paramètres</h2>
                                <p className="text-sm text-muted-foreground">Gérez votre compte</p>
                            </div>
                        </div>

                        {/* Navigation */}
                        <nav className="flex-1 p-3 overflow-y-auto">
                            <div className="space-y-1">
                                {menuItems.map((item) => {
                                    const Icon = item.icon
                                    const isActive = activeSection === item.id
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => loadComponent(item.id)}
                                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${isActive
                                                ? "bg-primary/10 text-primary"
                                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                                }`}
                                        >
                                            <Icon className={`h-5 w-5 flex-shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"
                                                }`} />
                                            <span className={`flex-1 text-left text-sm font-medium ${isActive ? "text-primary" : "text-foreground"
                                                }`}>
                                                {item.label}
                                            </span>
                                            {isActive && (
                                                <ChevronRight className="h-4 w-4 text-primary" />
                                            )}
                                        </button>
                                    )
                                })}
                            </div>
                        </nav>

                        {/* Footer */}
                        <div className="p-6 border-t border-border">
                            <p className="text-xs text-muted-foreground text-center">
                                Nothly © 2025
                            </p>
                        </div>
                    </aside>

                    {/* Main Content */}
                    <div className="flex-1 flex flex-col">
                        {/* Header with close button */}
                        <div className="p-6 border-b border-border flex items-center justify-between bg-background">
                            <h1 className="text-2xl font-bold text-foreground">
                                {menuItems.find(item => item.id === activeSection)?.label}
                            </h1>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-lg hover:bg-muted transition-colors"
                            >
                                <X className="h-5 w-5 text-muted-foreground" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto bg-background" style={{ willChange: 'transform' }}>
                            {loading ? (
                                <div className="flex items-center justify-center h-full">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                </div>
                            ) : ActiveComponent ? (
                                <ActiveComponent />
                            ) : (
                                <div className="flex items-center justify-center h-full">
                                    <p className="text-muted-foreground">Chargement...</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}
