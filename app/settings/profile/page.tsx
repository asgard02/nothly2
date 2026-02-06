"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { LogOut, Trash2, Mail, Calendar } from "lucide-react"

import { useTranslations } from "next-intl"
import { useLocale } from "next-intl"
import DeleteConfirmationDialog from "@/components/DeleteConfirmationDialog"

export default function ProfileSettingsPage() {
  const t = useTranslations("Settings.Profile")
  const locale = useLocale()
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

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
    try {
      await fetch("/auth/signout", { method: "POST", credentials: "include", cache: "no-store" })
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error)
    } finally {
      router.push("/")
      router.refresh()
    }
  }

  const handleDeleteAccount = () => {
    setIsDeleteDialogOpen(true)
  }

  const confirmDeleteAccount = async () => {
    setIsDeleting(true)
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

      handleLogout()
    } catch (error) {
      console.error("Erreur:", error)
      alert(t("deleteError"))
      setIsDeleting(false)
    }
  }

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase()
  }

  const getJoinDate = (createdAt: string) => {
    const date = new Date(createdAt)
    return date.toLocaleDateString(locale === "fr" ? "fr-FR" : "en-US", { year: "numeric", month: "long" })
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
        <h1 className="text-3xl font-black uppercase text-foreground mb-2">{t("title")}</h1>
        <p className="text-muted-foreground font-medium">
          {t("description")}
        </p>
      </div>

      {/* Carte profil */}
      <div className="bg-card border-2 border-border rounded-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.15)] p-6 mb-6">
        <div className="flex items-start gap-6 mb-6">
          {/* Avatar */}
          <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary/60 rounded-2xl flex items-center justify-center flex-shrink-0 border-2 border-border shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.15)]">
            <span className="text-2xl font-black text-white">
              {user?.email ? getInitials(user.email) : "??"}
            </span>
          </div>

          {/* Infos */}
          <div className="flex-1">
            <h2 className="text-2xl font-black text-foreground mb-1">
              {user?.email?.split("@")[0] || t("unknownUser")}
            </h2>
            <p className="text-sm text-muted-foreground font-medium mb-3">
              {user?.email || t("notAvailable")}
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-bold">
              <Calendar className="h-3 w-3" />
              <span>{t("memberSince", { date: user?.created_at ? getJoinDate(user.created_at) : "..." })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Informations du compte */}
      <div className="bg-card border-2 border-border rounded-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.15)] p-6 mb-6">
        <h2 className="text-lg font-black uppercase text-foreground mb-4">
          {t("accountInfo")}
        </h2>

        <div className="space-y-4">
          {/* Email */}
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center border-2 border-border">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">{t("email")}</p>
                <p className="text-xs text-muted-foreground font-medium">
                  {user?.email || t("notAvailable")}
                </p>
              </div>
            </div>
            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-black rounded-full border-2 border-emerald-500/30 uppercase">
              {t("verified")}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-card border-2 border-border rounded-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.15)] p-6 mb-6">
        <h2 className="text-lg font-black uppercase text-foreground mb-4">
          {t("actions")}
        </h2>

        <div className="space-y-3">
          {/* Déconnexion */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-border text-foreground hover:bg-muted transition-all duration-200 font-bold uppercase tracking-wide hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.15)] hover:-translate-y-1"
          >
            <LogOut className="h-5 w-5" strokeWidth={2.5} />
            {t("logout")}
          </button>
        </div>
      </div>

      {/* Zone dangereuse */}
      <div className="bg-destructive/10 border-2 border-destructive/30 rounded-xl p-6">
        <h2 className="text-lg font-black uppercase text-foreground mb-4 flex items-center gap-2">
          <Trash2 className="h-5 w-5 text-destructive" strokeWidth={2.5} />
          {t("dangerZone")}
        </h2>

        <p className="text-sm text-muted-foreground font-medium mb-4">
          {t("dangerZoneDesc")}
        </p>

        <button
          onClick={handleDeleteAccount}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-destructive/20 border-2 border-destructive text-destructive hover:bg-destructive/30 transition-all duration-200 font-bold uppercase tracking-wide"
        >
          <Trash2 className="h-5 w-5" strokeWidth={2.5} />
          {t("deleteAccount")}
        </button>
      </div>

      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={confirmDeleteAccount}
        title={t("deleteAccount")}
        description={t("deleteConfirm")}
        isDeleting={isDeleting}
      />
    </div>
  )
}
