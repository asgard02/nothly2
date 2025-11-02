"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { CreditCard, Sparkles, TrendingUp, CheckCircle, Zap } from "lucide-react"

export default function PlanSettingsPage() {
  const router = useRouter()
  const [userPlan, setUserPlan] = useState("free")
  const [tokensUsed, setTokensUsed] = useState(2500)
  const [tokensLimit, setTokensLimit] = useState(10000)

  const getPlanDetails = () => {
    switch (userPlan) {
      case "free":
        return {
          name: "Free",
          tokensLimit: 10000,
          features: [
            "Jusqu'à 100 notes",
            "Synchronisation cloud",
            "Export Markdown",
            "Support communautaire",
          ],
        }
      case "gpt":
        return {
          name: "Plus",
          tokensLimit: 1000000,
          features: [
            "1 million de tokens",
            "Tout de Free",
            "Chat IA personnalisé",
            "Génération de quiz",
          ],
        }
      case "pro":
        return {
          name: "Pro",
          tokensLimit: 999999999,
          features: [
            "IA illimitée",
            "Tout inclus",
            "Support prioritaire",
            "Accès anticipé",
          ],
        }
      default:
        return {
          name: "Free",
          tokensLimit: 10000,
          features: [],
        }
    }
  }

  const plan = getPlanDetails()

  return (
    <div className="max-w-4xl mx-auto p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Plan & Portefeuille</h1>
        <p className="text-muted-foreground">
          Gérez votre abonnement et vos tokens IA
        </p>
      </div>

      {/* Bandeau Pro */}
      {userPlan !== "pro" && (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-4 mb-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Zap className="h-5 w-5" />
            <div>
              <p className="font-semibold">Passez à Pro pour débloquer l'IA illimitée !</p>
              <p className="text-sm text-blue-100">Profitez de toutes les fonctionnalités avancées</p>
            </div>
          </div>
          <button
            onClick={() => router.push("/pricing")}
            className="px-4 py-2 bg-background text-primary rounded-lg font-medium hover:bg-primary/10 transition-colors"
          >
            Mettre à niveau
          </button>
        </div>
      )}

      {/* Badge Pro */}
      {userPlan === "pro" && (
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 mb-6 flex items-center gap-3 transition-colors">
          <CheckCircle className="h-5 w-5 text-primary" />
          <div>
            <p className="font-semibold text-foreground">✅ Abonnement actif</p>
            <p className="text-sm text-muted-foreground">Vous bénéficiez de toutes les fonctionnalités Pro</p>
          </div>
        </div>
      )}

      {/* Plan actuel */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-8 mb-6 transition-colors">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <CreditCard className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">
            Plan actuel
          </h2>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <div className="px-4 py-2 bg-primary/10 text-primary rounded-lg font-semibold">
            {plan.name}
          </div>
          {userPlan === "pro" && (
            <div className="px-3 py-1 bg-primary/20 text-primary rounded-full text-xs font-semibold">
              Illimité
            </div>
          )}
        </div>

        <button
          onClick={() => router.push("/pricing")}
          className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all duration-200"
        >
          {userPlan === "free" ? "Mettre à niveau" : "Gérer l'abonnement"}
        </button>
      </div>

      {/* IA & Tokens */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-8 mb-6 transition-colors">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">
            Tokens IA
          </h2>
        </div>

        {userPlan !== "pro" ? (
          <>
            {/* Barre de progression */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-muted-foreground">Tokens restants</span>
                <span className="text-sm font-bold text-foreground">
                  {tokensUsed.toLocaleString()} / {tokensLimit.toLocaleString()}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 h-3 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min((tokensUsed / tokensLimit) * 100, 100)}%`,
                  }}
                />
              </div>
            </div>

            <button
              onClick={() => router.push("/pricing")}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all duration-200"
            >
              Acheter des tokens
            </button>

            {/* Mini historique */}
            <div className="mt-6 pt-6 border-t border-border">
              <h3 className="text-sm font-semibold text-foreground mb-3">Historique récent</h3>
              <div className="space-y-2">
                {[
                  { date: "Aujourd'hui", usage: "250 tokens", action: "Résumé de texte" },
                  { date: "Hier", usage: "180 tokens", action: "Correction grammaticale" },
                  { date: "Il y a 2 jours", usage: "320 tokens", action: "Génération quiz" },
                ].map((entry, index) => (
                  <div key={index} className="flex items-center justify-between text-sm py-2">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-primary rounded-full" />
                      <span className="text-muted-foreground">{entry.action}</span>
                    </div>
                    <span className="text-muted-foreground font-medium">{entry.usage}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <TrendingUp className="h-16 w-16 text-primary mx-auto mb-4" />
            <p className="text-xl font-bold text-foreground mb-2">
              IA illimitée
            </p>
            <p className="text-sm text-muted-foreground">
              Vous utilisez le plan Pro avec accès illimité à l'IA
            </p>
          </div>
        )}

        <p className="text-xs text-muted-foreground mt-6">
          Les tokens permettent d'utiliser les outils IA (résumé, correction,
          chat, génération de quiz)
        </p>
      </div>

      {/* Changer de plan */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-8 transition-colors">
        <h2 className="text-lg font-semibold text-foreground mb-6">
          Changer de plan
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Plan Free */}
          <div className={`p-6 rounded-xl border-2 ${
            userPlan === "free" 
              ? "border-primary bg-primary/10" 
              : "border-border hover:border-muted-foreground/50"
          } transition-all duration-200`}>
            <h3 className="text-lg font-bold text-foreground mb-2">Free</h3>
            <div className="text-3xl font-bold text-foreground mb-4">
              0€<span className="text-sm text-muted-foreground">/mois</span>
            </div>
            <ul className="space-y-2 mb-6">
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                Jusqu'à 100 notes
              </li>
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                10 000 tokens IA
              </li>
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                Export Markdown
              </li>
            </ul>
            <button
              onClick={() => router.push("/pricing")}
              className={`w-full px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                userPlan === "free"
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-muted hover:bg-muted/80 text-foreground"
              }`}
              disabled={userPlan === "free"}
            >
              {userPlan === "free" ? "Plan actuel" : "Sélectionner Free"}
            </button>
          </div>

          {/* Plan Pro */}
          <div className={`p-6 rounded-xl border-2 relative ${
            userPlan === "pro" 
              ? "border-primary bg-primary/10" 
              : "border-border hover:border-muted-foreground/50"
          } transition-all duration-200`}>
            {userPlan !== "pro" && (
              <div className="absolute top-4 right-4 bg-primary text-primary-foreground text-xs font-semibold px-2 py-1 rounded-lg">
                Populaire
              </div>
            )}
            <h3 className="text-lg font-bold text-foreground mb-2">Pro</h3>
            <div className="text-3xl font-bold text-foreground mb-4">
              29€<span className="text-sm text-muted-foreground">/mois</span>
            </div>
            <ul className="space-y-2 mb-6">
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                IA illimitée
              </li>
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                Support prioritaire
              </li>
              <li className="flex items-start gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                Accès anticipé
              </li>
            </ul>
            <button
              onClick={() => router.push("/pricing")}
              className={`w-full px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                userPlan === "pro"
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-primary hover:bg-primary/90 text-primary-foreground"
              }`}
              disabled={userPlan === "pro"}
            >
              {userPlan === "pro" ? "Plan actuel" : "Passer à Pro"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

