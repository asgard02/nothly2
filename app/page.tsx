"use client"

import Link from "next/link"
import Navbar from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Brain, FolderTree, Zap, Sparkles, ArrowRight } from "lucide-react"
import { useEffect } from "react"

export default function HomePage() {
  useEffect(() => {
    // Si on a une ancre dans l'URL, scroll vers la section
    const hash = window.location.hash
    if (hash === "#features") {
      setTimeout(() => {
        const featuresSection = document.getElementById("features")
        if (featuresSection) {
          const offset = 80
          const elementPosition = featuresSection.getBoundingClientRect().top
          const offsetPosition = elementPosition + window.pageYOffset - offset

          window.scrollTo({
            top: offsetPosition,
            behavior: "smooth"
          })
        }
      }, 100)
    }
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-32 pb-24 px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-foreground tracking-tight mb-6 leading-tight">
            Prenez des notes intelligentes avec l'IA.
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed font-light">
            Créez, organisez et améliorez vos idées sans effort grâce à Notlhy.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/register">
              <Button
                size="lg"
                className="bg-gradient-to-r from-nothly-blue to-nothly-violet text-white rounded-full px-8 py-6 text-base font-medium shadow-lg shadow-nothly-blue/20 hover:shadow-xl hover:shadow-nothly-violet/30 transition-all duration-200 hover:scale-105"
              >
                Commencer gratuitement
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-border hover:border-muted-foreground/50 text-foreground rounded-full px-8 py-6 text-base font-medium bg-background hover:bg-muted transition-all duration-200 hover:scale-105"
              >
                Voir les tarifs
              </Button>
            </Link>
          </div>
        </div>

        {/* Mockup / Visual */}
        <div className="max-w-5xl mx-auto mt-24 px-6">
          <div className="relative rounded-3xl border border-border bg-gradient-to-br from-muted/50 to-background p-8 md:p-12 shadow-2xl shadow-foreground/5 hover:shadow-foreground/10 transition-shadow duration-500">
            <div className="space-y-4">
              {/* Mockup note card */}
              <div className="bg-card rounded-2xl p-6 border border-border shadow-sm hover:shadow-md transition-shadow duration-300">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-xl font-semibold text-foreground">
                    Ma note de révision
                  </h3>
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Notlhy peut résumer automatiquement vos notes, les traduire
                  dans différentes langues, et même générer des quiz pour
                  optimiser votre apprentissage.
                </p>
                <div className="flex items-center gap-2 text-sm text-primary">
                  <span>✨ Amélioré par l'IA</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-6 lg:px-8 bg-background">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-12">
            {/* Feature 1 */}
            <div className="text-center group">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6 group-hover:bg-primary/20 transition-colors duration-200 group-hover:scale-110 transition-transform">
                <Brain className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">
                IA intégrée
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Résume, corrige et améliore vos notes automatiquement grâce à
                l'intelligence artificielle.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="text-center group">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-muted mb-6 group-hover:bg-muted/80 transition-colors duration-200 group-hover:scale-110 transition-transform">
                <FolderTree className="h-8 w-8 text-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">
                Organisation claire
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Catégories, tags et recherche instantanée pour retrouver
                rapidement vos notes.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="text-center group">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6 group-hover:bg-primary/20 transition-colors duration-200 group-hover:scale-110 transition-transform">
                <Zap className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">
                Synchronisation
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Cloud, auto-sauvegarde et multi-plateforme. Vos notes sont
                toujours à jour, partout.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Notlhy Section */}
      <section className="py-24 px-6 lg:px-8 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6 leading-tight tracking-tight">
                Pensé pour la simplicité et la puissance.
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed mb-8">
                Notlhy combine la simplicité d'une interface minimaliste avec la
                puissance de l'IA pour transformer votre façon de prendre des
                notes. Moins de frictions, plus d'efficacité.
              </p>
              <Link href="/register">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-nothly-blue to-nothly-violet text-white rounded-full px-8 py-6 text-base font-medium shadow-lg shadow-nothly-blue/20 hover:shadow-xl transition-all duration-200 hover:scale-105"
                >
                  Essayer gratuitement
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
            <div className="relative">
              <div className="bg-card rounded-3xl border border-border p-8 shadow-xl">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Brain className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="h-3 bg-muted rounded w-32 mb-2"></div>
                      <div className="h-2 bg-muted/50 rounded w-24"></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 bg-muted/50 rounded w-full"></div>
                    <div className="h-4 bg-muted/50 rounded w-5/6"></div>
                    <div className="h-4 bg-muted/50 rounded w-4/6"></div>
                  </div>
                  <div className="mt-6 p-4 bg-primary/10 rounded-xl border border-primary/20">
                    <div className="flex items-start gap-3">
                      <Sparkles className="h-5 w-5 text-primary mt-0.5" />
                      <div>
                        <div className="text-sm font-medium text-foreground mb-1">
                          Suggestion IA
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Cette note pourrait être améliorée...
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 px-6 lg:px-8 bg-background">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6 leading-tight tracking-tight">
            Prêt à repenser votre manière de prendre des notes ?
          </h2>
          <Link href="/register">
            <Button
              size="lg"
              className="bg-gradient-to-r from-nothly-blue to-nothly-violet text-white rounded-full px-10 py-7 text-base font-medium shadow-xl shadow-nothly-blue/20 hover:shadow-2xl hover:shadow-nothly-blue/30 transition-all duration-200 hover:scale-105"
            >
              Commencer gratuitement
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center text-sm text-muted-foreground">
            <p>© 2025 Notlhy — Propulsé par l'IA.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
