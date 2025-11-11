"use client"

import Link from "next/link"
import Navbar from "@/components/navbar"
import { Button } from "@/components/ui/button"
import {
  ArrowRight,
  BookCheck,
  FileUp,
  LineChart,
  RefreshCw,
  Sparkles,
  Timer,
  Wrench
} from "lucide-react"

const flowSteps = [
  {
    title: "Upload du PDF",
    description: "Dépose ton document, on détecte automatiquement chapitres et sections.",
    icon: FileUp
  },
  {
    title: "Analyse intelligente",
    description: "Extraction du texte, OCR si besoin, segmentation propre du contenu.",
    icon: Wrench
  },
  {
    title: "Notes générées",
    description: "Fiches hiérarchiques claires : titres, définitions, exemples clés.",
    icon: Sparkles
  },
  {
    title: "Quiz interactifs",
    description: "QCM, vrai/faux et complétion pour mémoriser immédiatement.",
    icon: BookCheck
  },
  {
    title: "Mises à jour ciblées",
    description: "Importe une nouvelle version, seules les sections modifiées sont régénérées.",
    icon: RefreshCw
  }
]

const benefits = [
  {
    title: "Gain de temps massif",
    description:
      "Plus besoin de ficher manuellement chaque PDF. Nothly produit tes fiches prêtes à réviser.",
    metric: "x10",
    metricLabel: "Plus rapide qu'un fichage manuel"
  },
  {
    title: "Compréhension profonde",
    description:
      "Des résumés fidèles au texte d'origine et des quiz contextualisés pour ancrer tes connaissances.",
    metric: "92%",
    metricLabel: "Des étudiants déclarent mieux comprendre"
  },
  {
    title: "Suivi personnalisé",
    description: "Statistiques, rappels et historique pour savoir quoi réviser et quand.",
    metric: "3 min",
    metricLabel: "Pour relancer une session ciblée"
  }
]

const audience = [
  {
    title: "Étudiants exigeants",
    description: "Droit, médecine, sciences... des masses de PDF transformées en fiches digestes."
  },
  {
    title: "Professionnels en formation",
    description: "Cours internes, MOOC, procédures : reste à jour sans retaper des résumés."
  },
  {
    title: "Créateurs pédagogiques",
    description: "Transforme ton contenu en modules prêts à réviser pour ton audience."
  }
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main>
        <section className="pt-32 pb-16 px-6 lg:px-8">
          <div className="max-w-5xl mx-auto text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-muted-foreground">
              <Timer className="h-4 w-4" />
              Gagne des heures de fichage chaque semaine
            </span>
            <h1 className="mt-8 text-5xl md:text-6xl lg:text-7xl font-bold leading-tight tracking-tight">
              Pose ton PDF. Nothly te rend des fiches et des quiz prêts à réviser.
            </h1>
            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Un assistant d'étude qui lit tes documents, les simplifie sans trahir le sens,
              et suit ta progression pour que tu maîtrises vraiment.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <Button className="bg-gradient-to-r from-nothly-blue to-nothly-violet text-white px-8 py-6 rounded-full shadow-lg shadow-nothly-blue/20 hover:shadow-xl hover:shadow-nothly-blue/30 transition-all duration-200 hover:-translate-y-0.5">
                  Commencer gratuitement
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/new">
                <Button variant="outline" className="px-8 py-6 rounded-full border-2">
                  Voir le flux complet
                </Button>
              </Link>
            </div>
          </div>
          <div className="mt-20 max-w-5xl mx-auto">
            <div className="rounded-3xl border border-border bg-gradient-to-br from-muted/40 via-background to-background p-8 md:p-12 shadow-xl shadow-foreground/5">
              <div className="grid gap-6 md:grid-cols-[1.2fr,0.8fr] items-center">
                <div className="space-y-6 text-left">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-primary/10 p-3 text-primary">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <span className="text-sm uppercase tracking-wider text-primary font-medium">
                      Aperçu instantané
                    </span>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-semibold leading-tight">
                    Une fiche de révision structurée dès que ton PDF est importé.
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">
                    Titres hiérarchiques, définitions, exemples et rappels critiques.
                    Tout est généré automatiquement et reste synchronisé avec la dernière version du document.
                  </p>
                  <ul className="space-y-3 text-sm text-muted-foreground">
                    <li className="flex items-start gap-3">
                      <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
                      Résumés par section fidèles au contenu source.
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
                      Cartes de quiz liées à chaque notion clé.
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
                      Passage instantané du mode lecture au mode entraînement.
                    </li>
                  </ul>
                </div>
                <div className="relative">
                  <div className="rounded-2xl border border-border bg-card p-6 shadow-lg">
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Chapitre 3 · Physiologie</p>
                        <h3 className="mt-2 text-xl font-semibold">La régulation hormonale</h3>
                      </div>
                      <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                        <p>
                          Les hormones sont sécrétées par les glandes endocrines et assurent la communication
                          à distance entre organes. Nothly simplifie la cascade d'actions sans perdre la précision.
                        </p>
                        <div className="rounded-xl border border-primary/20 bg-primary/10 p-4 text-primary">
                          Définition clé : l'axe hypothalamo-hypophysaire coordonne la réponse hormonale.
                        </div>
                      </div>
                      <div className="rounded-xl border border-border bg-muted/40 p-4">
                        <p className="text-sm font-semibold text-foreground">Quiz lié</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Quel est le rôle principal de l'hypothalamus dans la régulation hormonale ?
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="absolute -bottom-8 -right-8 hidden md:block">
                    <div className="rounded-2xl border border-border bg-background/90 backdrop-blur p-4 shadow-md">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">Score progression</p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">82%</p>
                      <p className="text-xs text-muted-foreground">Maîtrise du chapitre</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="flux" className="py-24 px-6 lg:px-8 bg-muted/20">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-center text-3xl md:text-4xl font-semibold leading-tight">
              Le flux Nothly : de l'upload à la révision, sans friction.
            </h2>
            <p className="mt-4 text-center text-muted-foreground max-w-2xl mx-auto">
              Chaque étape est automatisée mais contrôlable. Tu suis l'avancement en temps réel et tu récupères un espace d'étude prêt à l'emploi.
            </p>
            <div className="mt-12 grid gap-6 md:grid-cols-5">
              {flowSteps.map((step, index) => {
                const Icon = step.icon
                return (
                  <div
                    key={step.title}
                    className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 text-left shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div className="rounded-full bg-primary/10 p-3 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="text-xs text-muted-foreground font-medium">Étape {index + 1}</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{step.title}</h3>
                      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <section id="valeur" className="py-24 px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="grid gap-12 md:grid-cols-[1.1fr,0.9fr] items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-semibold leading-tight">
                  Pourquoi les étudiants et pros choisissent Nothly ?
                </h2>
                <p className="mt-4 text-muted-foreground leading-relaxed">
                  On se concentre sur ta compréhension : des contenus fiables, des quiz adaptés, un suivi qui t'indique exactement
                  quoi réviser. Sans distraction ni jargon.
                </p>
                <div className="mt-10 grid gap-6 md:grid-cols-3">
                  {benefits.map((benefit) => (
                    <div key={benefit.title} className="rounded-2xl border border-border bg-muted/30 p-5">
                      <p className="text-3xl font-semibold text-primary">{benefit.metric}</p>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground">{benefit.metricLabel}</p>
                      <h3 className="mt-4 text-lg font-semibold text-foreground">{benefit.title}</h3>
                      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{benefit.description}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-3xl border border-border bg-background p-8 shadow-lg">
                <div className="flex items-center gap-3">
                  <LineChart className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium text-muted-foreground">Suivi de progression</span>
                </div>
                <div className="mt-8 space-y-6">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Chapitres maîtrisés</p>
                    <div className="mt-2 h-12 rounded-2xl bg-muted/40 p-2">
                      <div
                        className="h-full rounded-2xl bg-gradient-to-r from-nothly-blue to-nothly-violet"
                        style={{ width: "78%" }}
                      />
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">Chapitre 3 à revoir dans 5 jours</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-muted/30 p-6">
                    <p className="text-sm font-semibold text-foreground">Rappel automatique</p>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                      “Tu n'as pas révisé la section Immunologie depuis 6 jours. Relance un quiz de 5 questions ?”
                    </p>
                    <div className="mt-4 flex items-center gap-3">
                      <Button size="sm" className="rounded-full px-5 py-2 text-sm">
                        Lancer le quiz
                      </Button>
                      <Button size="sm" variant="ghost" className="text-muted-foreground">
                        Me rappeler demain
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="cibles" className="py-24 px-6 lg:px-8 bg-muted/20">
          <div className="max-w-5xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-semibold">
              Conçu pour celles et ceux qui apprennent vite et bien.
            </h2>
            <p className="mt-4 text-muted-foreground max-w-3xl mx-auto">
              Nothly n'est pas un éditeur généraliste. C'est ton assistant d'étude personnel, focus sur l'assimilation rapide.
            </p>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {audience.map((item) => (
                <div key={item.title} className="rounded-2xl border border-border bg-card p-6 text-left shadow-sm">
                  <h3 className="text-lg font-semibold text-foreground">{item.title}</h3>
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-28 px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              Mise à jour intelligente incluse
            </span>
            <h2 className="mt-6 text-3xl md:text-4xl font-semibold leading-tight">
              Tu importes une nouvelle version du PDF ? Nothly détecte ce qui a changé et met uniquement à jour les sections impactées.
            </h2>
            <p className="mt-4 text-muted-foreground">
              Les annotations, les quiz réussis et ton historique de révision sont conservés. Tu reprends exactement là où tu t'étais arrêté.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <Button className="px-8 py-6 rounded-full bg-gradient-to-r from-nothly-blue to-nothly-violet text-white shadow-lg shadow-nothly-blue/20 hover:shadow-xl hover:-translate-y-0.5 transition-all">
                  Essayer maintenant
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button variant="outline" className="px-8 py-6 rounded-full border-2">
                  Consulter les offres
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-12 px-6 lg:px-8">
        <div className="max-w-6xl mx-auto text-center text-sm text-muted-foreground">
          © 2025 Nothly — Ton assistant de compréhension.
        </div>
      </footer>
    </div>
  )
}
