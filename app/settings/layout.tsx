"use client"

import { useState } from "react"
import Sidebar from "@/components/Sidebar"
import ChatButton from "@/components/ChatButton"
import {
  User,
  Palette,
  CreditCard,
  Shield,
  Bell,
  Globe,
  Database,
  ChevronRight
} from "lucide-react"

// Import all settings components
import ProfileSettings from "./profile/page"
import AppearanceSettings from "./appearance/page"
import PlanSettings from "./plan/page"
import SecuritySettings from "./security/page"
import NotificationsSettings from "./notifications/page"
import LanguageSettings from "./language/page"
import DataSettings from "./data/page"

interface SettingsLayoutProps {
  children: React.ReactNode
}

type SettingSection = "profile" | "appearance" | "plan" | "security" | "notifications" | "language" | "data"

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  const [activeSection, setActiveSection] = useState<SettingSection>("profile")

  const menuItems = [
    {
      id: "profile" as SettingSection,
      label: "Profil",
      icon: User,
      description: "Informations personnelles",
      component: ProfileSettings
    },
    {
      id: "appearance" as SettingSection,
      label: "Apparence",
      icon: Palette,
      description: "Thèmes et personnalisation",
      component: AppearanceSettings
    },
    {
      id: "plan" as SettingSection,
      label: "Abonnement",
      icon: CreditCard,
      description: "Plan et facturation",
      component: PlanSettings
    },
    {
      id: "security" as SettingSection,
      label: "Sécurité",
      icon: Shield,
      description: "Mot de passe et sessions",
      component: SecuritySettings
    },
    {
      id: "notifications" as SettingSection,
      label: "Notifications",
      icon: Bell,
      description: "Préférences de notifications",
      component: NotificationsSettings
    },
    {
      id: "language" as SettingSection,
      label: "Langue & Région",
      icon: Globe,
      description: "Langue et fuseau horaire",
      component: LanguageSettings
    },
    {
      id: "data" as SettingSection,
      label: "Données",
      icon: Database,
      description: "Export et sauvegarde",
      component: DataSettings
    },
  ]

  const ActiveComponent = menuItems.find(item => item.id === activeSection)?.component || ProfileSettings

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />

      {/* Main container */}
      <div className="flex-1 ml-56 flex">
        {/* Settings sidebar - style Gemini */}
        <aside className="w-72 bg-card border-r border-border h-screen flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-border">
            <h2 className="text-xl font-bold text-foreground mb-1">Paramètres</h2>
            <p className="text-sm text-muted-foreground">Gérez votre compte</p>
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
                    onClick={() => setActiveSection(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group ${isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                  >
                    <Icon className={`h-5 w-5 flex-shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"
                      }`} />
                    <div className="flex-1 text-left">
                      <p className={`text-sm font-medium ${isActive ? "text-primary" : "text-foreground"
                        }`}>
                        {item.label}
                      </p>
                    </div>
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

        {/* Main content */}
        <main className="flex-1 overflow-y-auto bg-background">
          <ActiveComponent />
        </main>
      </div>

      {/* Chatbot flottant global */}
      <ChatButton />
    </div>
  )
}
