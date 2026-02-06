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
  ChevronRight
} from "lucide-react"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"

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
  ]

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />

      {/* Main container */}
      <MainContent className="flex flex-1 h-full overflow-hidden">
        {/* Settings sidebar - neo-brutalist */}
        <aside className="w-80 bg-card border-r-2 border-border h-full flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-8 border-b-2 border-border shrink-0 bg-secondary">
            <h2 className="text-2xl font-black text-secondary-foreground uppercase tracking-tight">{t("title")}</h2>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 overflow-y-auto">
            <div className="space-y-3">
              {menuItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 border-2 font-bold uppercase tracking-wide",
                      isActive
                        ? "bg-foreground text-background border-border shadow-[4px_4px_0px_0px_#8B5CF6] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] translate-x-1"
                        : "bg-card text-muted-foreground border-transparent hover:border-border hover:bg-accent hover:text-foreground hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:-translate-y-1"
                    )}
                  >
                    <Icon className={cn("h-5 w-5 flex-shrink-0", isActive ? "text-accent" : "text-current")} strokeWidth={2.5} />
                    <span className="flex-1 text-left text-sm">
                      {item.label}
                    </span>
                    {isActive && (
                      <ChevronRight className="h-5 w-5 text-background" strokeWidth={3} />
                    )}
                  </Link>
                )
              })}
            </div>
          </nav>

          {/* Footer */}
          <div className="p-6 border-t-2 border-border shrink-0 bg-muted">
            <p className="text-xs font-bold text-muted-foreground text-center uppercase">
              Nothly © 2025
            </p>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto bg-muted/30 h-full p-8">
          {children}
        </main>
      </MainContent>

      {/* Chatbot flottant global */}
      <ChatButton />
    </div>
  )
}
