"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { CreditCard, Sparkles, Crown, Zap, CheckCircle } from "lucide-react"

import { useTranslations } from "next-intl"

export default function PlanSettingsPage() {
  const t = useTranslations("Settings.Plan")
  const router = useRouter()
  const [userPlan, setUserPlan] = useState("free")
  const [tokensUsed, setTokensUsed] = useState(2500)
  const [tokensLimit, setTokensLimit] = useState(10000)

  return (
    <div className="max-w-3xl mx-auto p-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">{t("title")}</h1>
        <p className="text-muted-foreground">
          {t("description")}
        </p>
      </div>

      {/* Plan actuel */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-6 mb-6 transition-colors">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <CreditCard className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">
            {t("currentPlan")}
          </h2>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl font-bold text-foreground">
                {userPlan === "free" ? t("free") : t("pro")}
              </span>
              {userPlan === "pro" && (
                <Crown className="h-5 w-5 text-yellow-500" />
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {userPlan === "free"
                ? t("freeDesc")
                : t("proDesc")}
            </p>
          </div>
          <button
            onClick={() => router.push("/pricing")}
            className="px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition-all duration-200"
          >
            {userPlan === "free" ? t("upgrade") : t("manage")}
          </button>
        </div>

        {/* Fonctionnalités */}
        <div className="pt-6 border-t border-border">
          <p className="text-sm font-medium text-foreground mb-3">{t("included")}</p>
          <div className="grid grid-cols-2 gap-2">
            {userPlan === "free" ? (
              <>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>{t("notesLimit")}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>{t("tokensLimit")}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>{t("markdownExport")}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>{t("cloudSync")}</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>{t("unlimitedNotes")}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>{t("unlimitedAI")}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>{t("prioritySupport")}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>{t("earlyAccess")}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Crédits IA */}
      {userPlan !== "pro" && (
        <div className="bg-card rounded-xl border border-border shadow-sm p-6 mb-6 transition-colors">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">
              {t("aiCredits")}
            </h2>
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-muted-foreground">{t("usage")}</span>
              <span className="text-sm font-bold text-foreground">
                {tokensUsed.toLocaleString()} / {tokensLimit.toLocaleString()}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-3">
              <div
                className="bg-gradient-to-r from-primary to-primary/60 h-3 rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min((tokensUsed / tokensLimit) * 100, 100)}%`,
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {t("remaining", { percent: ((tokensLimit - tokensUsed) / tokensLimit * 100).toFixed(0) })}
            </p>
          </div>

          <button
            onClick={() => router.push("/pricing")}
            className="w-full px-4 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition-all duration-200"
          >
            {t("getMore")}
          </button>
        </div>
      )}

      {/* Bandeau upgrade */}
      {userPlan === "free" && (
        <div className="bg-gradient-to-r from-primary to-primary/60 rounded-xl p-6 text-white">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Zap className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold mb-2">{t("upgradeBannerTitle")}</h3>
              <p className="text-sm text-white/90 mb-4">
                {t("upgradeBannerDesc")}
              </p>
              <button
                onClick={() => router.push("/pricing")}
                className="px-6 py-2 bg-white text-primary rounded-lg font-medium hover:bg-white/90 transition-all duration-200"
              >
                {t("viewPlans")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Badge Pro */}
      {userPlan === "pro" && (
        <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <Crown className="h-6 w-6 text-yellow-500" />
            <h3 className="text-lg font-bold text-foreground">{t("proMember")}</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            {t("proMemberDesc")}
          </p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>{t("activeSubscription")}</span>
          </div>
        </div>
      )}
    </div>
  )
}
