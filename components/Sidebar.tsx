"use client"

import { useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Logo from "@/components/Logo"
import { Settings, LogOut, CreditCard, HardDrive, Sparkles } from "lucide-react"
import { createClient } from "@/lib/supabase-client"
import { useTranslations } from "next-intl"
import SettingsModal from "@/components/SettingsModal"

export default function Sidebar() {
  const t = useTranslations("Sidebar")
  const router = useRouter()
  const pathname = usePathname()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  const handleLogout = async () => {
    try {
      await fetch("/auth/signout", { method: "POST", credentials: "include", cache: "no-store" })
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error)
    } finally {
      router.push("/login")
      router.refresh()
    }
  }

  const menuItems = [{ icon: HardDrive, label: t("library"), path: "/stack" }]

  const isActive = (path: string) => pathname === path

  return (
    <>
      <aside className="w-64 bg-background border-r border-border h-screen flex flex-col justify-between p-6 fixed left-0 top-0">
        <div>
          {/* Logo */}
          <div className="mb-8">
            <Logo size={28} showText={true} href="/dashboard" className="mb-1" />
          </div>

          {/* Menu principal */}
          <nav className="flex flex-col gap-1">
            {/* Bouton Recueil de notes */}
            {menuItems.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.path}
                  onClick={() => router.push(item.path)}
                  className={`flex items-center gap-3 px-4 py-2 rounded-md transition-all ${isActive(item.path)
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted"
                    }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-sm">{item.label}</span>
                </button>
              )
            })}

            {/* Espace réservé pour futures collections (flashcards, decks, etc.) */}
            <button
              onClick={() => router.push("/flashcards")}
              className={`mt-4 flex items-center gap-3 rounded-md px-4 py-2 text-left transition ${isActive("/flashcards")
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted"
                }`}
            >
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-medium">{t("collectionsBadge")}</span>
            </button>
          </nav>
        </div>

        {/* Actions du bas */}
        <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-border">
          {/* Bouton Tarifs */}
          <button
            onClick={() => router.push("/dashboard/pricing")}
            className={`flex items-center gap-3 px-4 py-2 rounded-md transition-all ${isActive("/dashboard/pricing") || isActive("/pricing") || isActive("/settings/plan")
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:bg-muted"
              }`}
          >
            <CreditCard className="h-5 w-5" />
            <span className="text-sm">{t("pricing")}</span>
          </button>

          {/* Bouton Paramètres - Ouvre le modal */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-3 px-4 py-2 rounded-md text-muted-foreground hover:bg-muted transition-all"
          >
            <Settings className="h-5 w-5" />
            <span className="text-sm">{t("settings")}</span>
          </button>

          {/* Bouton Déconnexion */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-2 rounded-md text-muted-foreground hover:bg-muted transition-all"
          >
            <LogOut className="h-5 w-5" />
            <span className="text-sm">{t("logout")}</span>
          </button>

          <p className="text-sm text-muted-foreground text-center mt-2">{t("footer")}</p>
        </div>
      </aside>

      {/* Settings Modal */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  )
}

