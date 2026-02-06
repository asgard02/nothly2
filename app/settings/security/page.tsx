"use client"

import { useState } from "react"
import {
  Shield,
  Key,
  Lock,
  CheckCircle
} from "lucide-react"

import { useTranslations } from "next-intl"
import DeleteConfirmationDialog from "@/components/DeleteConfirmationDialog"

export default function SecuritySettingsPage() {
  const t = useTranslations("Settings.Security")
  const [loading, setLoading] = useState(false)
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [is2FAConfirmOpen, setIs2FAConfirmOpen] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleResetPassword = async () => {
    setLoading(true)
    try {
      const { createClient } = await import("@/lib/supabase-client")
      const supabase = createClient()

      const { data, error } = await supabase.auth.getUser()
      if (error) throw error

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        data.user.email!,
        {
          redirectTo: `${window.location.origin}/reset-password`,
        }
      )

      if (resetError) throw resetError

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (error) {
      console.error("Erreur:", error)
      alert(t("resetError"))
    } finally {
      setLoading(false)
    }
  }

  const handleToggle2FA = () => {
    if (!twoFactorEnabled) {
      alert(t("2faComingSoon"))
    } else {
      setIs2FAConfirmOpen(true)
    }
  }

  const confirmDisable2FA = () => {
    setTwoFactorEnabled(false)
    setIs2FAConfirmOpen(false)
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

      {/* Indicateur de sauvegarde */}
      {saved && (
        <div className="mb-6 bg-emerald-500/10 border-2 border-emerald-500/20 rounded-xl p-4 flex items-center gap-3 animate-in fade-in duration-200">
          <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
            {t("resetSent")}
          </p>
        </div>
      )}

      {/* Authentification */}
      <div className="bg-card border-2 border-border rounded-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.15)] p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center border-2 border-border">
            <Lock className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-lg font-black uppercase text-foreground">
            {t("authentication")}
          </h2>
        </div>

        <div className="space-y-4">
          {/* Mot de passe */}
          <div className="flex items-center justify-between py-3 border-b border-border">
            <div className="flex items-center gap-3">
              <Key className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-bold text-foreground text-sm">{t("password")}</p>
                <p className="text-xs text-muted-foreground font-medium">{t("lastModified")}</p>
              </div>
            </div>
            <button
              onClick={handleResetPassword}
              disabled={loading}
              className="px-4 py-2 rounded-xl border-2 border-border text-foreground hover:bg-muted transition-all duration-200 text-sm font-bold uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.15)] hover:-translate-y-1"
            >
              {loading ? t("sending") : t("change")}
            </button>
          </div>

          {/* 2FA */}
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-bold text-foreground text-sm">{t("twoFactor")}</p>
                <p className="text-xs text-muted-foreground font-medium">
                  {twoFactorEnabled ? t("enabled") : t("recommended")}
                </p>
              </div>
            </div>
            <button
              onClick={handleToggle2FA}
              className={`relative w-12 h-7 rounded-full transition-all duration-200 border-2 ${twoFactorEnabled
                ? "bg-primary border-primary"
                : "bg-muted border-border"
                }`}
            >
              <div
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-200 ${twoFactorEnabled ? "left-[22px]" : "left-0.5"
                  }`}
              />
            </button>
          </div>
        </div>
      </div>

      <DeleteConfirmationDialog
        isOpen={is2FAConfirmOpen}
        onClose={() => setIs2FAConfirmOpen(false)}
        onConfirm={confirmDisable2FA}
        title={t("twoFactor")}
        description={t("2faDisableConfirm")}
        isDeleting={false}
      />
    </div>
  )
}
