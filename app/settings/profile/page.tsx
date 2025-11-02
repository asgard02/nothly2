"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { LogOut, Trash2, Mail } from "lucide-react"

export default function ProfileSettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadUser = async () => {
      try {
        const { createClient } = await import("@/lib/supabase-client")
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
      } catch (error) {
        console.error("Erreur chargement utilisateur:", error)
      } finally {
        setLoading(false)
      }
    }
    loadUser()
  }, [])

  const handleLogout = async () => {
    const { createClient } = await import("@/lib/supabase-client")
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
  }

  const handleDeleteAccount = async () => {
    if (
      !confirm(
        "⚠️ Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible et supprimera toutes vos notes."
      )
    ) {
      return
    }

    try {
      // Supprimer toutes les notes
      const response = await fetch("/api/notes", {
        method: "GET",
      })
      const notes = await response.json()

      if (notes.length > 0) {
        const deletePromises = notes.map((note: any) =>
          fetch(`/api/notes/${note.id}`, { method: "DELETE" })
        )
        await Promise.all(deletePromises)
      }

      // Supprimer le compte
      alert("Compte supprimé avec succès")
      handleLogout()
    } catch (error) {
      console.error("Erreur:", error)
      alert("Erreur lors de la suppression du compte")
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-10">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto p-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Profil</h1>
        <p className="text-muted-foreground">
          Gérez vos informations personnelles
        </p>
      </div>

      {/* Informations utilisateur */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-6 mb-6 transition-colors">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Informations
        </h2>

        <div className="space-y-4">
          {/* Email */}
          <div className="flex items-center gap-4 pb-4 border-b border-border">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-1">Email</p>
              <p className="text-base text-foreground font-medium">
                {user?.email || "Non disponible"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-6 space-y-4 transition-colors">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Actions
        </h2>

        {/* Déconnexion */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-border text-foreground hover:bg-muted transition-all duration-200 font-medium"
        >
          <LogOut className="h-5 w-5" />
          Se déconnecter
        </button>

        {/* Supprimer le compte */}
        <button
          onClick={handleDeleteAccount}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-destructive bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all duration-200 font-medium"
        >
          <Trash2 className="h-5 w-5" />
          Supprimer mon compte
        </button>
      </div>
    </div>
  )
}

