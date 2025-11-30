"use client"

import { useState, useEffect } from "react"
import {
  Shield,
  Key,
  LogOut,
  Smartphone,
  Monitor,
  MapPin,
  Clock,
  AlertTriangle,
  CheckCircle,
  Lock
} from "lucide-react"

interface Session {
  id: string
  device: string
  location: string
  lastActive: string
  current: boolean
}

import { useTranslations } from "next-intl"
import DeleteConfirmationDialog from "@/components/DeleteConfirmationDialog"

export default function SecuritySettingsPage() {
  const t = useTranslations("Settings.Security")
  const [loading, setLoading] = useState(false)
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [is2FAConfirmOpen, setIs2FAConfirmOpen] = useState(false)

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

      alert(t("resetSent"))
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
    // alert(t("2faDisabled")) // Optional
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

      {/* Authentification */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-6 mb-6 transition-colors">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <Lock className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">
            {t("authentication")}
          </h2>
        </div>

        <div className="space-y-4">
          {/* Mot de passe */}
          <div className="flex items-center justify-between py-3 border-b border-border">
            <div className="flex items-center gap-3">
              <Key className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground text-sm">{t("password")}</p>
                <p className="text-xs text-muted-foreground">{t("lastModified")}</p>
              </div>
            </div>
            <button
              onClick={handleResetPassword}
              disabled={loading}
              className="px-4 py-2 rounded-lg border border-border text-foreground hover:bg-muted transition-all duration-200 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t("sending") : t("change")}
            </button>
          </div>

          {/* 2FA */}
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground text-sm">{t("twoFactor")}</p>
                <p className="text-xs text-muted-foreground">
                  {twoFactorEnabled ? t("enabled") : t("recommended")}
                </p>
              </div>
            </div>
            <button
              onClick={handleToggle2FA}
              className={`relative w-12 h-6 rounded-full transition-all duration-200 ${twoFactorEnabled ? "bg-primary" : "bg-muted"
                }`}
            >
              <div
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-200 ${twoFactorEnabled ? "left-[26px]" : "left-0.5"
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
    </div >
  )
}

