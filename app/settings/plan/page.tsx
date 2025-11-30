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
                Bêta Publique
              </span>
              <span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider border border-primary/20">
                Gratuit
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Accès illimité pendant la période de lancement.
            </p>
          </div>
        </div>

        {/* Fonctionnalités */}
        <div className="pt-6 border-t border-border">
          <p className="text-sm font-medium text-foreground mb-3">{t("included")}</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Notes illimitées</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Génération IA illimitée</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Quiz & Flashcards illimités</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Support prioritaire</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bandeau Beta */}
      <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-3">
          <Sparkles className="h-6 w-6 text-purple-500" />
          <h3 className="text-lg font-bold text-foreground">Profitez de la Bêta !</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Nous sommes en phase de lancement. Toutes les fonctionnalités Premium sont gratuites pour vous permettre de tester l'application à fond. N'hésitez pas à nous faire vos retours !
        </p>
      </div>
    </div>
  )
}
