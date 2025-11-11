"use client"

import { useRouter, usePathname } from "next/navigation"
import Logo from "@/components/Logo"
import { Settings, LogOut, CreditCard, HardDrive, Sparkles } from "lucide-react"
import { createClient } from "@/lib/supabase-client"

export default function Sidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")  // Changé de "/login" à "/"
  }

  const menuItems = [{ icon: HardDrive, label: "Bibliothèque de supports", path: "/stack" }]

  const isActive = (path: string) => pathname === path

  return (
    <aside className="w-64 bg-background border-r border-border h-screen flex flex-col justify-between p-6 fixed left-0 top-0">
      <div>
        {/* Logo */}
        <div className="mb-8">
          <Logo size={28} showText={true} href="/dashboard" className="mb-1" />
          <p className="text-sm text-muted-foreground">Notes intelligentes avec IA</p>
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
                className={`flex items-center gap-3 px-4 py-2 rounded-md transition-all ${
                  isActive(item.path)
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
            className={`mt-4 flex items-center gap-3 rounded-md border border-dashed border-border/60 bg-muted/30 px-4 py-2 text-left text-sm transition ${
              isActive("/flashcards")
                ? "border-primary/50 bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:border-primary hover:bg-muted"
            }`}
          >
            <Sparkles className="h-4 w-4" />
            <div className="flex flex-col">
              <span>Collections (à venir)</span>
              <span className="text-xs text-muted-foreground">Flashcards & quiz regroupés prochainement</span>
            </div>
          </button>
        </nav>
      </div>

      {/* Actions du bas */}
      <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-border">
        {/* Bouton Tarifs */}
        <button
          onClick={() => router.push("/dashboard/pricing")}
          className={`flex items-center gap-3 px-4 py-2 rounded-md transition-all ${
            isActive("/dashboard/pricing") || isActive("/pricing") || isActive("/settings/plan")
              ? "bg-primary/10 text-primary font-medium"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <CreditCard className="h-5 w-5" />
          <span className="text-sm">Tarifs</span>
        </button>

        {/* Bouton Paramètres */}
        <button
          onClick={() => router.push("/settings")}
          className={`flex items-center gap-3 px-4 py-2 rounded-md transition-all ${
            pathname?.startsWith("/settings")
              ? "bg-primary/10 text-primary font-medium"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          <Settings className="h-5 w-5" />
          <span className="text-sm">Paramètres</span>
        </button>

        {/* Bouton Déconnexion */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-2 rounded-md text-muted-foreground hover:bg-muted transition-all"
        >
          <LogOut className="h-5 w-5" />
          <span className="text-sm">Déconnexion</span>
        </button>

        <p className="text-sm text-muted-foreground text-center mt-2">Notlhy © 2025</p>
      </div>
    </aside>
  )
}
