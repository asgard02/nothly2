"use client"

import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import Sidebar from "@/components/Sidebar"
import ChatButton from "@/components/ChatButton"
import { User, Palette, CreditCard, Shield, Info } from "lucide-react"

interface SettingsLayoutProps {
  children: React.ReactNode
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  const pathname = usePathname()

  const menuItems = [
    {
      label: "Profil",
      href: "/settings/profile",
      icon: User,
    },
    {
      label: "Apparence",
      href: "/settings/appearance",
      icon: Palette,
    },
    {
      label: "Plan & Portefeuille",
      href: "/settings/plan",
      icon: CreditCard,
    },
    {
      label: "Sécurité",
      href: "/settings/security",
      icon: Shield,
    },
    {
      label: "À propos",
      href: "/settings/about",
      icon: Info,
    },
  ]

  const isActive = (href: string) => pathname === href

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />

      {/* Main container */}
      <div className="flex-1 ml-64 flex">
        {/* Settings sidebar */}
        <aside className="w-64 bg-card border-r border-border h-screen flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-border">
            <h2 className="text-xl font-bold text-foreground mb-1">Paramètres</h2>
            <p className="text-sm text-muted-foreground">Gérez votre compte</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {menuItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 ${
                    isActive(item.href)
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-sm">{item.label}</span>
                </Link>
              )
            })}
          </nav>

          {/* Footer */}
          <div className="p-6 border-t border-border">
            <p className="text-xs text-muted-foreground text-center">
              Notlhy © 2025
            </p>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto bg-background">
          {children}
        </main>
      </div>

      {/* Chatbot flottant global */}
      <ChatButton />
    </div>
  )
}

