"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Navbar from "@/components/navbar"
import { ChevronDown, ChevronUp, CheckCircle } from "lucide-react"

type PlanButton = {
  label: string
  variant: "primary" | "secondary"
}

type Plan = {
  name: string
  price: string
  tagline: string
  features: string[]
  button: PlanButton
  popular: boolean
  period?: string
  description?: string
}

export default function PricingPage() {
  const router = useRouter()
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null)

  const plans: Plan[] = [
    {
      name: "Free",
      price: "0€",
      tagline: "Pour découvrir Nothly",
      features: [
        "Jusqu'à 100 notes",
        "10 000 tokens IA offerts",
        "Synchronisation cloud",
        "Export en Markdown",
        "Accès mobile & desktop",
        "Support communautaire",
      ],
      button: { label: "Commencer gratuitement", variant: "secondary" },
      popular: false,
      period: "à vie",
    },
    {
      name: "Plus",
      price: "9€",
      tagline: "1 000 000 tokens IA (non expirants)",
      features: [
        "Tout de Free",
        "Chat IA personnalisé",
        "Résumé / traduction / génération de quiz",
        "Historique des conversations IA",
        "Pas d'abonnement, tu rachètes quand tu veux",
      ],
      button: { label: "Acheter 1M tokens", variant: "primary" },
      popular: true,
      period: "achat unique",
    },
    {
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
      button: { label: "Passer à Pro", variant: "primary" },
      popular: false,
      period: "par mois",
    },
  ]

  const faqs = [
    {
      question: "Comment fonctionnent les tokens IA ?",
      answer:
        "Les tokens sont consommés à chaque interaction avec l'IA (amélioration de texte, résumé, traduction, génération de quiz). 1 token = environ 4 caractères. Le plan Free offre 10 000 tokens, le plan Plus offre 1 million de tokens non expirants.",
    },
    {
      question: "Quelle est la différence entre Plus et Pro ?",
      answer:
        "Le plan Plus (9€) est un achat unique de 1 million de tokens IA que vous utilisez à votre rythme, sans expiration. Le plan Pro (29€/mois) est un abonnement avec IA illimitée, support prioritaire et accès anticipé aux nouvelles fonctionnalités.",
    },
    {
      question: "Puis-je racheter des tokens Plus quand je veux ?",
      answer:
        "Oui ! Le plan Plus n'est pas un abonnement. Vous achetez 1 million de tokens quand vous en avez besoin, et ils ne expirent jamais. Vous pouvez racheter un pack à tout moment.",
    },
    {
      question: "Puis-je annuler mon abonnement Pro ?",
      answer:
        "Oui, vous pouvez annuler votre abonnement Pro à tout moment. Vous conserverez l'accès Pro jusqu'à la fin de votre période de facturation en cours.",
    },
    {
      question: "Mes données sont-elles sécurisées ?",
      answer:
        "Absolument. Toutes vos données sont chiffrées en transit et au repos. Nous utilisons Supabase pour le stockage sécurisé et les mêmes standards de sécurité que les banques.",
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Contenu principal */}
      <main className="min-h-screen bg-background text-foreground transition-colors">
        <section className="max-w-6xl mx-auto px-6 pt-28 md:pt-32 pb-16 space-y-24 transition-all duration-300">
          {/* Hero */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold">Des tarifs simples et transparents</h1>
            <p className="text-muted-foreground text-lg">
              Choisissez votre formule et utilisez Nothly comme vous le souhaitez
            </p>
          </div>

          {/* Tarifs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            {plans.map((plan, index) => (
              <div
                key={index}
                className={`relative flex flex-col justify-between bg-card border border-border rounded-xl p-8 space-y-4 min-h-[32rem] transition-colors ${
                  plan.popular ? "shadow-md" : ""
                }`}
              >
                {/* Badge "Populaire" */}
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full shadow">
                    Populaire
                  </span>
                )}

                <div className="space-y-4">
                  <h2 className="text-2xl font-semibold">{plan.name}</h2>
                  <p className="text-muted-foreground">{plan.tagline}</p>
                  <div className="flex items-baseline">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    {plan.period && (
                      <span className="text-sm text-muted-foreground ml-2">
                        {plan.period}
                      </span>
                    )}
                  </div>
                  {plan.description && (
                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                  )}

                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={() => {
                    if (plan.button.variant === "primary") {
                      // TODO: Rediriger vers Stripe/paiement
                      console.log(`Acheter ${plan.name}`)
                      router.push("/register")
                    } else {
                      router.push("/register")
                    }
                  }}
                  className={`w-full py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary/90`}
                >
                  {plan.button.label}
                </button>
              </div>
            ))}
          </div>

          {/* FAQ */}
          <section className="space-y-8">
            <h2 className="text-2xl font-semibold text-center">Questions fréquentes</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {faqs.map((faq, index) => (
                <div
                  key={index}
                  className="bg-card border border-border rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-lg"
                >
                  <button
                    onClick={() =>
                      setOpenFaqIndex(openFaqIndex === index ? null : index)
                    }
                    className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-muted transition-colors"
                  >
                    <span className="text-lg font-semibold text-foreground pr-4">
                      {faq.question}
                    </span>
                    {openFaqIndex === index ? (
                      <ChevronUp className="h-5 w-5 text-primary flex-shrink-0" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    )}
                  </button>

                  {openFaqIndex === index && (
                    <div className="px-6 pb-5 text-muted-foreground leading-relaxed border-t border-border pt-4">
                      {faq.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* CTA Final */}
          <section className="text-center space-y-6">
            <h2 className="text-3xl font-semibold">
              Prêt à transformer vos notes ?
            </h2>
            <p className="text-muted-foreground">
              Rejoignez des milliers d'utilisateurs qui optimisent leur apprentissage avec Nothly
            </p>
            <button
              onClick={() => router.push("/register")}
              className="px-8 py-3 rounded-lg bg-primary text-white hover:bg-primary/90 font-medium"
            >
              Commencer gratuitement
            </button>
          </section>
        </section>
      </main>
    </div>
  )
}

