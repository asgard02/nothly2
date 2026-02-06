"use client"

import { useState } from "react"
import { CreditCard, Sparkles, CheckCircle } from "lucide-react"

import { useTranslations } from "next-intl"

export default function PlanSettingsPage() {
  const t = useTranslations("Settings.Plan")

  return (
    <div className="max-w-3xl mx-auto p-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black uppercase text-foreground mb-2">{t("title")}</h1>
        <p className="text-muted-foreground font-medium">
          {t("description")}
        </p>
      </div>

      {/* Plan actuel */}
      <div className="bg-card border-2 border-border rounded-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.15)] p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center border-2 border-border">
            <CreditCard className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-lg font-black uppercase text-foreground">
            {t("currentPlan")}
          </h2>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl font-black text-foreground uppercase">
                {t("betaPublic")}
              </span>
              <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-black uppercase tracking-wider border-2 border-primary/30">
                {t("free")}
              </span>
            </div>
            <p className="text-sm text-muted-foreground font-medium">
              {t("betaDesc")}
            </p>
          </div>
        </div>

        {/* Fonctionnalités */}
        <div className="pt-6 border-t-2 border-border">
          <p className="text-sm font-black uppercase text-foreground mb-3">{t("included")}</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <span>{t("unlimitedNotes")}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <span>{t("unlimitedAI")}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <span>{t("unlimitedQuiz")}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <span>{t("prioritySupport")}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bandeau Beta */}
      <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-2 border-purple-500/30 rounded-xl p-6 shadow-[4px_4px_0px_0px_rgba(139,92,246,0.3)]">
        <div className="flex items-center gap-3 mb-3">
          <Sparkles className="h-6 w-6 text-purple-500" />
          <h3 className="text-lg font-black text-foreground uppercase">{t("betaTitle")}</h3>
        </div>
        <p className="text-sm text-muted-foreground font-medium">
          {t("betaMessage")}
        </p>
      </div>
    </div>
  )
}
