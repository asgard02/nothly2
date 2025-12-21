"use client"

import { useState, useEffect } from "react"
import { X, ChevronRight, User, Palette, CreditCard, Shield, Bell, Globe, Database } from "lucide-react"

interface SettingsModalProps {
    isOpen: boolean
    onClose: () => void
}

type SettingSection = "profile" | "appearance" | "plan" | "security" | "notifications" | "language" | "data"

import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
    const t = useTranslations("Settings.Menu")
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
            label: t("profile"),
            icon: User,
        },
        {
            id: "appearance" as SettingSection,
            label: t("appearance"),
            icon: Palette,
        },
        {
            id: "plan" as SettingSection,
            label: t("plan"),
            icon: CreditCard,
        },
        {
            id: "security" as SettingSection,
            label: t("security"),
            icon: Shield,
        },
        {
            id: "notifications" as SettingSection,
            label: t("notifications"),
            icon: Bell,
        },
        {
            id: "language" as SettingSection,
            label: t("language"),
            icon: Globe,
        },
        {
            id: "data" as SettingSection,
            label: t("data"),
            icon: Database,
        },
    ]

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 z-50 animate-in fade-in duration-150 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal Container */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                <div
                    className="w-full max-w-6xl h-[85vh] bg-white rounded-3xl border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex overflow-hidden pointer-events-auto animate-in zoom-in-95 duration-150"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Settings Sidebar */}
                    <aside className="w-80 bg-white border-r-2 border-black flex flex-col">
                        {/* Header */}
                        <div className="p-8 border-b-2 border-black flex items-center justify-between bg-[#FBCFE8]">
                            <h2 className="text-2xl font-black text-black uppercase tracking-tight">{t("title")}</h2>
                        </div>

                        {/* Navigation */}
                        <nav className="flex-1 p-4 overflow-y-auto">
                            <div className="space-y-3">
                                {menuItems.map((item) => {
                                    const Icon = item.icon
                                    const isActive = activeSection === item.id
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => loadComponent(item.id)}
                                            className={cn(
                                                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 border-2 font-bold uppercase tracking-wide",
                                                isActive
                                                    ? "bg-black text-white border-black shadow-[4px_4px_0px_0px_#8B5CF6] translate-x-1"
                                                    : "bg-white text-gray-500 border-transparent hover:border-black hover:bg-[#FDE68A] hover:text-black hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1"
                                            )}
                                        >
                                            <Icon className={cn("h-5 w-5 flex-shrink-0", isActive ? "text-[#FDE68A]" : "text-current")} strokeWidth={2.5} />
                                            <span className="flex-1 text-left">
                                                {item.label}
                                            </span>
                                            {isActive && (
                                                <ChevronRight className="h-5 w-5 text-white" strokeWidth={3} />
                                            )}
                                        </button>
                                    )
                                })}
                            </div>
                        </nav>

                        {/* Footer */}
                        <div className="p-6 border-t-2 border-black bg-gray-50">
                            <p className="text-xs font-bold text-gray-400 text-center uppercase">
                                Nothly © 2025
                            </p>
                        </div>
                    </aside>

                    {/* Main Content */}
                    <div className="flex-1 flex flex-col bg-[#FAFAFA]">
                        {/* Header with close button */}
                        <div className="p-8 border-b-2 border-black flex items-center justify-between bg-white">
                            <h1 className="text-4xl font-black text-black uppercase italic tracking-tight">
                                {menuItems.find(item => item.id === activeSection)?.label}
                            </h1>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-xl border-2 border-transparent hover:bg-black hover:text-white hover:border-black transition-all group"
                            >
                                <X className="h-8 w-8 text-black group-hover:text-white" strokeWidth={3} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-8" style={{ willChange: 'transform' }}>
                            {loading ? (
                                <div className="flex items-center justify-center h-full">
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="w-12 h-12 border-4 border-black border-t-[#FBBF24] rounded-full animate-spin"></div>
                                        <p className="font-black text-black uppercase animate-pulse">Loading...</p>
                                    </div>
                                </div>
                            ) : ActiveComponent ? (
                                <ActiveComponent />
                            ) : (
                                <div className="flex items-center justify-center h-full">
                                    <p className="text-gray-400 font-bold uppercase">Select a section</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}
