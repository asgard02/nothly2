"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import Sidebar from "@/components/Sidebar"
import ChatButton from "@/components/ChatButton"
import MainContent from "@/components/MainContent"
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
import { useTranslations } from "next-intl"

interface SettingsLayoutProps {
  children: React.ReactNode
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  const t = useTranslations("Settings.Menu")
  const pathname = usePathname()

  const menuItems = [
    {
      href: "/settings/profile",
      label: t("profile"),
      icon: User,
    },
    {
      href: "/settings/appearance",
      label: t("appearance"),
      icon: Palette,
    },
    {
      href: "/settings/plan",
      label: t("plan"),
      icon: CreditCard,
    },
    {
      href: "/settings/security",
      label: t("security"),
      icon: Shield,
    },
    {
      href: "/settings/notifications",
      label: t("notifications"),
      icon: Bell,
    },
    {
      href: "/settings/language",
      label: t("language"),
      icon: Globe,
    },
    {
      href: "/settings/data",
      label: t("data"),
      icon: Database,
    },
  ]

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />

      {/* Main container */}
      <MainContent className="flex flex-1 h-full overflow-hidden">
        {/* Settings sidebar - style Gemini */}
        <aside className="w-72 bg-card border-r border-border h-full flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-border shrink-0">
            <h2 className="text-xl font-bold text-foreground mb-1">{t("title")}</h2>
            <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-3 overflow-y-auto">
            <div className="space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
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
                  </Link>
                )
              })}
            </div>
          </nav>

          {/* Footer */}
          <div className="p-6 border-t border-border shrink-0">
            <p className="text-xs text-muted-foreground text-center">
              Nothly © 2025
            </p>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto bg-background h-full p-6">
          {children}
        </main>
      </MainContent>

      {/* Chatbot flottant global */}
      <ChatButton />
    </div>
  )
}
