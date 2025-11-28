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

export default function SecuritySettingsPage() {
  const t = useTranslations("Settings.Security")
  const [loading, setLoading] = useState(false)
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [sessions, setSessions] = useState<Session[]>([
    {
      id: "1",
      device: "MacBook Pro - Chrome",
      location: "Paris, France",
      lastActive: "Maintenant",
      current: true,
    },
    {
      id: "2",
      device: "iPhone 13 - Safari",
      location: "Paris, France",
      lastActive: "Il y a 2 heures",
      current: false,
    },
  ])

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

  const handleLogoutAll = async () => {
    if (
      !confirm(
        t("logoutAllConfirm")
      )
    ) {
      return
    }

    try {
      await fetch("/auth/signout", { method: "POST", credentials: "include", cache: "no-store" })
      alert(t("logoutAllSuccess"))
      window.location.href = "/login"
    } catch (error) {
      console.error("Erreur:", error)
      alert(t("logoutAllError"))
    }
  }

  const handleLogoutSession = (sessionId: string) => {
    if (confirm(t("logoutSessionConfirm"))) {
      setSessions(sessions.filter(s => s.id !== sessionId))
      alert(t("logoutSessionSuccess"))
    }
  }

  const handleToggle2FA = () => {
    if (!twoFactorEnabled) {
      alert(t("2faComingSoon"))
    } else {
      if (confirm(t("2faDisableConfirm"))) {
        setTwoFactorEnabled(false)
        alert(t("2faDisabled"))
      }
    }
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

      {/* Sessions actives */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-6 mb-6 transition-colors">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Monitor className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">
              {t("connectedDevices")}
            </h2>
          </div>
          <button
            onClick={handleLogoutAll}
            className="text-sm text-destructive hover:underline font-medium"
          >
            {t("logoutAll")}
          </button>
        </div>

        <div className="space-y-3">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="flex items-start gap-3 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
            >
              <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center flex-shrink-0">
                {session.device.includes("iPhone") ? (
                  <Smartphone className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <Monitor className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-foreground text-sm">
                    {session.device}
                  </p>
                  {session.current && (
                    <span className="px-2 py-0.5 bg-green-500/10 text-green-500 text-xs font-medium rounded-full">
                      {t("current")}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {session.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {session.lastActive}
                  </span>
                </div>
              </div>
              {!session.current && (
                <button
                  onClick={() => handleLogoutSession(session.id)}
                  className="text-sm text-destructive hover:underline font-medium"
                >
                  {t("logout")}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Historique de sécurité */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-6 mb-6 transition-colors">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <Clock className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">
            {t("recentActivity")}
          </h2>
        </div>

        <div className="space-y-3">
          {[
            { action: t("loginSuccess"), time: "Il y a 2 heures", status: "success" },
            { action: t("passwordChanged"), time: "Il y a 30 jours", status: "success" },
            { action: t("loginFailed"), time: "Il y a 45 jours", status: "warning" },
          ].map((activity, index) => (
            <div
              key={index}
              className="flex items-center gap-3 py-3 border-b border-border last:border-0"
            >
              <div className={`w-2 h-2 rounded-full ${activity.status === "success" ? "bg-green-500" : "bg-yellow-500"
                }`} />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{activity.action}</p>
                <p className="text-xs text-muted-foreground">{activity.time}</p>
              </div>
              {activity.status === "success" ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Bonnes pratiques */}
      <div className="bg-primary/10 border border-primary/20 rounded-xl p-6 mb-6 transition-colors">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Shield className="h-4 w-4" />
          {t("bestPractices")}
        </h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            {t("bp1")}
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            {t("bp2")}
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            {t("bp3")}
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            {t("bp4")}
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            {t("bp5")}
          </li>
        </ul>
      </div>

      {/* Zone dangereuse */}
      <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-6 transition-colors">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-destructive/20 rounded-lg flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">
            {t("dangerZone")}
          </h2>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          {t("dangerZoneDesc")}
        </p>

        <button
          onClick={handleLogoutAll}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg bg-destructive/20 border border-destructive text-destructive hover:bg-destructive/30 transition-all duration-200 font-medium"
        >
          <LogOut className="h-5 w-5" />
          {t("logoutAllDevices")}
        </button>
      </div>
    </div>
  )
}

