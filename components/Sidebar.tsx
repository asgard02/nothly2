"use client"

import { useRouter, usePathname } from "next/navigation"
import Logo from "@/components/Logo"
import { Home, Plus, Settings, LogOut, Clock, CreditCard, FileText, ChevronDown, ChevronRight } from "lucide-react"
import { useState } from "react"
import { createClient } from "@/lib/supabase-client"

export default function Sidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const [isRecentNotesOpen, setIsRecentNotesOpen] = useState(false)
  const [recentNotes, setRecentNotes] = useState<any[]>([])
  const [loadingNotes, setLoadingNotes] = useState(false)

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")  // Changé de "/login" à "/"
  }

  // Charger les notes récentes
  const loadRecentNotes = async () => {
    if (loadingNotes) return // Déjà en cours de chargement
    
    setLoadingNotes(true)
    try {
      const res = await fetch("/api/notes/recent")
      if (res.ok) {
        const data = await res.json()
        setRecentNotes(data)
      }
    } catch (error) {
      console.error("Erreur chargement notes récentes:", error)
    } finally {
      setLoadingNotes(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return "À l'instant"
    if (diffMins < 60) return `Il y a ${diffMins} min`
    if (diffMins < 1440) return `Il y a ${Math.floor(diffMins / 60)}h`
    const days = Math.floor(diffMins / 1440)
    return `Il y a ${days} jour${days > 1 ? 's' : ''}`
  }

  const menuItems = [
    { icon: Home, label: "Recueil de notes", path: "/dashboard" },
  ]

  const isActive = (path: string) => pathname === path

  const handleRecentNotesClick = () => {
    setIsRecentNotesOpen(!isRecentNotesOpen)
    // Charger seulement à la première ouverture
    if (!isRecentNotesOpen && recentNotes.length === 0) {
      loadRecentNotes()
    }
  }

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

          {/* Onglet déroulant : Notes récentes */}
          <div className="mt-1">
            <button
              onClick={handleRecentNotesClick}
              className="w-full flex items-center justify-between gap-3 px-4 py-2 rounded-md text-muted-foreground hover:bg-muted transition-all"
            >
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5" />
                <span className="text-sm">Notes récentes</span>
              </div>
              {isRecentNotesOpen ? (
                <ChevronDown className="h-4 w-4 transition-transform" />
              ) : (
                <ChevronRight className="h-4 w-4 transition-transform" />
              )}
            </button>

            {/* Liste déroulante des notes */}
            {isRecentNotesOpen && (
              <div className="mt-1 ml-12 space-y-1">
                {loadingNotes ? (
                  <p className="text-xs text-muted-foreground py-2">Chargement...</p>
                ) : recentNotes.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">Aucune note récente</p>
                ) : (
                  recentNotes.map((note) => (
                    <button
                      key={note.id}
                      onClick={() => router.push(`/note/${note.id}`)}
                      className="w-full text-left px-3 py-1.5 rounded-md hover:bg-muted transition-all text-sm text-muted-foreground hover:text-primary"
                    >
                      <p className="truncate font-medium">{note.title || "Sans titre"}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(note.updated_at)}
                      </p>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Bouton Nouvelle note */}
          <button
            onClick={() => router.push("/new")}
            className={`flex items-center gap-3 px-4 py-2 rounded-md transition-all ${
              isActive("/new")
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <Plus className="h-5 w-5" />
            <span className="text-sm">Nouvelle note</span>
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
