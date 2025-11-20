"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Sidebar from "@/components/Sidebar"
import { CheckCircle } from "lucide-react"

export default function DashboardPricingPage() {
  const router = useRouter()
  const [userPlan, setUserPlan] = useState("free")

  const plans = [
    {
      id: "free",
      name: "Free",
      price: "0€",
      tagline: "Pour découvrir Nothly",
      features: [
        "Jusqu'à 100 notes",
        "10 000 tokens IA offerts",
        "Synchronisation cloud",
        "Export Markdown",
        "Accès mobile & desktop",
        "Support communautaire",
      ],
    },
    {
      id: "gpt",
      name: "Plus",
      price: "9€",
      tagline: "1 000 000 tokens IA (non expirants)",
      popular: true,
      features: [
        "Tout de Free",
        "Chat IA personnalisé",
        "Résumé / traduction / génération de quiz",
        "Historique des conversations IA",
        "Pas d'abonnement, tu rachètes quand tu veux",
      ],
    },
    {
      id: "pro",
      name: "Pro",
      price: "29€/mois",
      tagline: "IA illimitée et support premium",
      features: [
        "Tout de Plus",
        "IA illimitée",
        "Support prioritaire",
        "Collaboration multi-notes",
        "Accès anticipé aux nouvelles features",
      ],
    },
  ]


  const handleUpgrade = (planId: string) => {
    if (planId === "gpt") {
      console.log("Achat de 1M tokens")
      // TODO: Rediriger vers Stripe
    } else if (planId === "pro") {
      router.push("/settings/plan")
    }
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />

      {/* Contenu principal */}
      <div className="flex-1 ml-64 overflow-y-auto">
        <div className="max-w-6xl mx-auto py-16 px-6 flex flex-col items-center gap-12">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-4xl font-semibold text-foreground mb-3">
              Choisissez votre plan
            </h1>
            <p className="text-muted-foreground text-center max-w-xl mx-auto">
              Des tarifs simples et transparents pour vos besoins IA
            </p>
          </div>

          {/* Grille de plans */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="relative bg-card border border-border rounded-2xl p-8 shadow-sm hover:shadow-md transition-all hover:-translate-y-1"
              >
                {/* Badge "Populaire" */}
                {plan.popular && (
                  <div className="absolute top-4 right-4 bg-primary/10 text-primary text-xs font-semibold px-2 py-0.5 rounded-full">
                    Populaire
                  </div>
                )}

                {/* Contenu */}
                <div>
                  {/* Nom du plan */}
                  <h3 className="text-lg font-semibold text-foreground">
                    {plan.name}
                  </h3>

                  {/* Tagline */}
                  <p className="text-sm text-muted-foreground mt-1">
                    {plan.tagline}
                  </p>

                  {/* Prix */}
                  <div className="mt-2">
                    <span className="text-3xl font-bold text-primary">
                      {plan.price}
                    </span>
                  </div>

                  {/* Fonctionnalités */}
                  <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Bouton CTA */}
                  <button
                    onClick={() => handleUpgrade(plan.id)}
                    className={`w-full py-2 rounded-lg font-medium mt-6 transition-all ${
                      plan.id === userPlan
                        ? "bg-muted text-muted-foreground cursor-default"
                        : "bg-primary text-primary-foreground hover:bg-primary/90"
                    }`}
                    disabled={plan.id === userPlan}
                  >
                    {plan.id === userPlan
                      ? "Plan actuel"
                      : plan.id === "gpt"
                      ? "Acheter des tokens"
                      : "Passer à Pro"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
