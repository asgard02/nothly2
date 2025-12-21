"use client"

import { useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Logo from "@/components/Logo"
import { Settings, LogOut, PanelLeftClose, PanelLeft, Calendar, LayoutDashboard, Grid, Brain, Star, HelpCircle } from "lucide-react"
import { useTranslations } from "next-intl"
import SettingsModal from "@/components/SettingsModal"
import { useSidebar } from "@/components/providers/SidebarProvider"
import { useTutorial } from "@/components/providers/TutorialProvider"
import { cn } from "@/lib/utils"

export default function Sidebar() {
  const t = useTranslations("Sidebar")
  const router = useRouter()
  const pathname = usePathname()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const { isOpen, toggle } = useSidebar()
  const { startTutorial } = useTutorial()

  const handleLogout = async () => {
    try {
      const { createClient } = await import("@/lib/supabase-client")
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push("/")
    } catch (error) {
      console.error("Logout failed:", error)
    }
  }

  const menuItems = [
    { icon: LayoutDashboard, label: t("dashboard"), path: "/workspace/dashboard", color: "shadow-[4px_4px_0px_0px_#8B5CF6]" },
    { icon: Grid, label: t("subjects"), path: "/workspace/subjects", color: "shadow-[4px_4px_0px_0px_#F472B6]" },
    { icon: Brain, label: t("quiz"), path: "/workspace/quiz", color: "shadow-[4px_4px_0px_0px_#FBBF24]" },
    { icon: Star, label: t("favorites"), path: "/workspace/favorites", color: "shadow-[4px_4px_0px_0px_#BAE6FD]" },
    { icon: Calendar, label: t("calendar"), path: "/calendar", color: "shadow-[4px_4px_0px_0px_#BBF7D0]" }
  ]

  const isActive = (path: string) => pathname === path

  return (
    <>
      <aside
        className={cn(
          "fixed left-4 top-4 bottom-4 z-50 flex flex-col transition-all duration-300 ease-in-out",
          isOpen ? "w-72" : "w-20"
        )}
      >
        <div className="flex flex-col h-full bg-white border-2 border-black rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
          {/* Header */}
          <div className={cn("flex items-center p-6", isOpen ? "justify-between" : "justify-center")}>
            {isOpen ? (
              <span className="text-3xl font-black italic tracking-tighter">nothly.</span>
            ) : (
              <span className="text-3xl font-black italic tracking-tighter">n.</span>
            )}

            <button
              onClick={toggle}
              className="p-2 hover:bg-black hover:text-white border-2 border-transparent hover:border-black rounded-lg transition-colors"
            >
              {isOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeft className="h-5 w-5" />}
            </button>
          </div>

          {/* Menu principal */}
          <nav className="flex flex-col flex-1 px-4 gap-3 overflow-y-auto py-4">
            {menuItems.map((item) => {
              const Icon = item.icon
              const active = isActive(item.path)

              return (
                <button
                  key={item.path}
                  onClick={() => router.push(item.path)}
                  className={cn(
                    "group flex items-center w-full px-4 py-3 rounded-xl border-2 border-transparent transition-all duration-200",
                    isOpen ? "justify-start" : "justify-center px-0",
                    active
                      ? cn("bg-black text-white border-black font-bold translate-x-[-2px] translate-y-[-2px]", item.color)
                      : "hover:bg-gray-100 font-medium text-gray-600 hover:text-black hover:border-black hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-1px] hover:translate-y-[-1px]"
                  )}
                  title={!isOpen ? item.label : undefined}
                >
                  <Icon className={cn("h-6 w-6 flex-shrink-0", isOpen && "mr-3")} strokeWidth={2.5} />

                  {isOpen && (
                    <span className="text-sm uppercase tracking-wide">
                      {item.label}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>

          {/* Promo Widget (Only visible when open) */}
          {isOpen && (
            <div className="px-4 mb-4">
              <div className="bg-[#FCD34D] border-2 border-black rounded-xl p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden group hover:translate-x-[-2px] hover:translate-y-[-2px] transition-transform">
                {/* Decorations */}
                <div className="absolute -right-4 -top-4 w-12 h-12 bg-white rounded-full border-2 border-black"></div>
                <div className="absolute -left-2 -bottom-2 w-8 h-8 bg-[#F472B6] rounded-full border-2 border-black"></div>

                <div className="relative z-10">
                  <h4 className="font-black text-lg leading-tight mb-1">{t("proTitle")}</h4>
                  <p className="text-xs font-bold mb-3">{t("proDesc")}</p>
                  <button className="bg-black text-white text-xs font-bold px-3 py-2 rounded-lg w-full hover:bg-white hover:text-black border-2 border-transparent hover:border-black transition-colors">
                    {t("upgrade")}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Footer - Settings/User */}
          <div className="border-t-2 border-black p-4 bg-gray-50">
            <div className="flex flex-col gap-2">
              <button
                onClick={startTutorial}
                className={cn(
                  "flex items-center p-2 rounded-lg hover:bg-white hover:border-black border-2 border-transparent transition-all",
                  isOpen ? "justify-start gap-3" : "justify-center"
                )}
                title={t("restartTutorial")}
              >
                <HelpCircle className="h-5 w-5" strokeWidth={2.5} />
                {isOpen && <span className="font-bold text-sm">{t("tutorial")}</span>}
              </button>
              <button
                onClick={() => setIsSettingsOpen(true)}
                className={cn(
                  "flex items-center p-2 rounded-lg hover:bg-white hover:border-black border-2 border-transparent transition-all",
                  isOpen ? "justify-start gap-3" : "justify-center"
                )}
              >
                <Settings className="h-5 w-5" strokeWidth={2.5} />
                {isOpen && <span className="font-bold text-sm">{t("settings")}</span>}
              </button>

              <button
                onClick={handleLogout}
                className={cn(
                  "flex items-center p-2 rounded-lg hover:bg-red-100 text-red-600 hover:border-red-600 border-2 border-transparent transition-all",
                  isOpen ? "justify-start gap-3" : "justify-center"
                )}
              >
                <LogOut className="h-5 w-5" strokeWidth={2.5} />
                {isOpen && <span className="font-bold text-sm">{t("logout")}</span>}
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Settings Modal */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  )
}



