"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { LogOut, Trash2, Mail, User as UserIcon, Calendar, TrendingUp, FileText, Zap } from "lucide-react"

import { useTranslations } from "next-intl"

export default function ProfileSettingsPage() {
  const t = useTranslations("Settings.Profile")
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    notesCount: 0,
    flashcardsCount: 0,
    quizzesCount: 0,
    tokensUsed: 2500,
  })

  useEffect(() => {
    const loadUser = async () => {
      try {
        const { createClient } = await import("@/lib/supabase-client")
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)

        // Charger les stats
        if (user) {
          const notesRes = await fetch("/api/notes")
          const notes = await notesRes.json()
          setStats(prev => ({ ...prev, notesCount: notes.length || 0 }))
        }
      } catch (error) {
        console.error("Erreur chargement utilisateur:", error)
      } finally {
        setLoading(false)
      }
    }
    loadUser()
  }, [])

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

  const handleDeleteAccount = async () => {
    if (
      !confirm(
        t("deleteConfirm")
      )
    ) {
      return
    }

    try {
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

      alert(t("deleteSuccess"))
      handleLogout()
    } catch (error) {
      console.error("Erreur:", error)
      alert(t("deleteError"))
    }
  }

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase()
  }

  const getJoinDate = (createdAt: string) => {
    const date = new Date(createdAt)
    return date.toLocaleDateString("fr-FR", { year: "numeric", month: "long" })
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
        <h1 className="text-3xl font-bold text-foreground mb-2">{t("title")}</h1>
        <p className="text-muted-foreground">
          {t("description")}
        </p>
      </div>

      {/* Carte profil */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-6 mb-6 transition-colors">
        <div className="flex items-start gap-6 mb-6">
          {/* Avatar */}
          <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary/60 rounded-2xl flex items-center justify-center flex-shrink-0">
            <span className="text-2xl font-bold text-white">
              {user?.email ? getInitials(user.email) : "??"}
            </span>
          </div>

          {/* Infos */}
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-foreground mb-1">
              {user?.email?.split("@")[0] || "Utilisateur"}
            </h2>
            <p className="text-sm text-muted-foreground mb-3">
              {user?.email || "Non disponible"}
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>{t("memberSince", { date: user?.created_at ? getJoinDate(user.created_at) : "..." })}</span>
            </div>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-4 gap-3 pt-6 border-t border-border">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <FileText className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">{stats.notesCount}</p>
            <p className="text-xs text-muted-foreground">{t("notes")}</p>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <TrendingUp className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">{stats.flashcardsCount}</p>
            <p className="text-xs text-muted-foreground">{t("flashcards")}</p>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <UserIcon className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">{stats.quizzesCount}</p>
            <p className="text-xs text-muted-foreground">{t("quizzes")}</p>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <Zap className="h-5 w-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">{stats.tokensUsed}</p>
            <p className="text-xs text-muted-foreground">{t("tokens")}</p>
          </div>
        </div>
      </div>

      {/* Informations du compte */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-6 mb-6 transition-colors">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          {t("accountInfo")}
        </h2>

        <div className="space-y-4">
          {/* Email */}
          <div className="flex items-center justify-between py-3 border-b border-border">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">{t("email")}</p>
                <p className="text-xs text-muted-foreground">
                  {user?.email || "Non disponible"}
                </p>
              </div>
            </div>
            <span className="px-3 py-1 bg-green-500/10 text-green-500 text-xs font-medium rounded-full">
              {t("verified")}
            </span>
          </div>

          {/* ID utilisateur */}
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <UserIcon className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">{t("userId")}</p>
                <p className="text-xs text-muted-foreground font-mono">
                  {user?.id?.substring(0, 20)}...
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-6 mb-6 transition-colors">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          {t("actions")}
        </h2>

        <div className="space-y-3">
          {/* Déconnexion */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-border text-foreground hover:bg-muted transition-all duration-200 font-medium"
          >
            <LogOut className="h-5 w-5" />
            {t("logout")}
          </button>
        </div>
      </div>

      {/* Zone dangereuse */}
      <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-6 transition-colors">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Trash2 className="h-5 w-5 text-destructive" />
          {t("dangerZone")}
        </h2>

        <p className="text-sm text-muted-foreground mb-4">
          {t("dangerZoneDesc")}
        </p>

        <button
          onClick={handleDeleteAccount}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg bg-destructive/20 border border-destructive text-destructive hover:bg-destructive/30 transition-all duration-200 font-medium"
        >
          <Trash2 className="h-5 w-5" />
          {t("deleteAccount")}
        </button>
      </div>
    </div>
  )
}

