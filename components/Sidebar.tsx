"use client"

import { useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Logo from "@/components/Logo"
import { Settings, LogOut, HardDrive, PanelLeftClose, PanelLeft, BookOpen, Calendar } from "lucide-react"
import { createClient } from "@/lib/supabase-client"
import { useTranslations } from "next-intl"
import SettingsModal from "@/components/SettingsModal"
import { useSidebar } from "@/components/providers/SidebarProvider"

export default function Sidebar() {
  const t = useTranslations("Sidebar")
  const router = useRouter()
  const pathname = usePathname()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const { isOpen, toggle, close } = useSidebar()

  const handleLogout = async () => {
    try {
      await fetch("/auth/signout", { method: "POST", credentials: "include", cache: "no-store" })
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error)
    } finally {
      router.push("/")
      router.refresh()
    }
  }

  const menuItems = [
    { icon: HardDrive, label: t("library"), path: "/workspace" },
    { icon: Calendar, label: t("calendar"), path: "/calendar" }
  ]

  const isActive = (path: string) => pathname === path

  return (
    <>
      <aside
        className={`fixed left-0 top-0 z-50 h-screen flex flex-col bg-background/80 backdrop-blur-xl border-r border-border/40 transition-all duration-300 ease-in-out ${isOpen ? "w-64" : "w-20"
          }`}
      >
        <div className={`flex flex-col h-full ${isOpen ? "p-6" : "p-4"}`}>
          {/* Header avec Logo et Toggle */}
          <div className={`flex items-center ${isOpen ? "justify-between mb-8" : "flex-col gap-6 mb-6"}`}>
            {isOpen ? (
              <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap">
                <Logo size={28} showText={true} href="/dashboard" />
              </div>
            ) : (
              <Logo size={40} showText={false} href="/dashboard" />
            )}

            <button
              onClick={toggle}
              className="p-1.5 rounded-lg hover:bg-accent/50 text-muted-foreground hover:text-foreground transition-colors"
              title={isOpen ? t("collapseMenu") : t("expandMenu")}
            >
              {isOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeft className="h-5 w-5" />}
            </button>
          </div>

          {/* Menu principal */}
          <nav className="flex flex-col gap-1">
            {menuItems.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.path}
                  onClick={() => router.push(item.path)}
                  className={`relative flex items-center ${isOpen ? "gap-3 px-4" : "justify-center px-2"} py-3 rounded-xl transition-all duration-200 group overflow-hidden ${isActive(item.path)
                    ? "bg-primary/10 text-primary font-medium shadow-sm"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                    }`}
                  title={!isOpen ? item.label : undefined}
                >
                  {isActive(item.path) && (
                    <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full ${!isOpen && "left-0 h-4"}`} />
                  )}
                  <Icon className={`h-5 w-5 flex-shrink-0 ${isActive(item.path) ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`} />

                  <span className={`text-sm whitespace-nowrap transition-all duration-300 ${isOpen ? "opacity-100" : "w-0 opacity-0 hidden"}`}>
                    {item.label}
                  </span>
                </button>
              )
            })}
          </nav>

          {/* Actions du bas */}
          <div className={`flex flex-col gap-2 mt-auto pt-4 border-t border-border/40 ${isOpen ? "" : "items-center"}`}>
            {/* Bouton Paramètres */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className={`flex items-center ${isOpen ? "gap-3 px-4" : "justify-center px-2"} py-3 rounded-xl text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-all duration-200 group w-full`}
              title={!isOpen ? t("settings") : undefined}
            >
              <Settings className="h-5 w-5 flex-shrink-0 group-hover:rotate-45 transition-transform duration-500" />
              <span className={`text-sm whitespace-nowrap transition-all duration-300 ${isOpen ? "opacity-100" : "w-0 opacity-0 hidden"}`}>
                {t("settings")}
              </span>
            </button>

            {/* Bouton Déconnexion */}
            <button
              onClick={handleLogout}
              className={`flex items-center ${isOpen ? "gap-3 px-4" : "justify-center px-2"} py-3 rounded-xl text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-all duration-200 group w-full`}
              title={!isOpen ? t("logout") : undefined}
            >
              <LogOut className="h-5 w-5 flex-shrink-0" />
              <span className={`text-sm whitespace-nowrap transition-all duration-300 ${isOpen ? "opacity-100" : "w-0 opacity-0 hidden"}`}>
                {t("logout")}
              </span>
            </button>

            {isOpen && (
              <p className="text-xs text-muted-foreground/60 text-center mt-4 font-medium tracking-wide">{t("footer")}</p>
            )}
          </div>
        </div>
      </aside>

      {/* Settings Modal */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  )
}



