"use client"

import Link from "next/link"
import Navbar from "@/components/navbar"
import { Button } from "@/components/ui/button"
import {
  ArrowRight,
  BookOpen,
  FileText,
  Sparkles,
  Check,
  Brain,
  Zap,
  Shield,
  TrendingUp,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"

// Hook pour parallax amélioré
function useParallax() {
  const [offset, setOffset] = useState(0)
  useEffect(() => {
    const handleScroll = () => setOffset(window.pageYOffset)
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])
  return offset
}

// Hook pour les animations au scroll
function useScrollAnimation(threshold = 0.1) {
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true)
      },
      { threshold }
    )
    const currentRef = ref.current
    if (currentRef) observer.observe(currentRef)
    return () => {
      if (currentRef) observer.unobserve(currentRef)
    }
  }, [threshold])

  return { ref, isVisible }
}

// Composant Card 3D interactif
const Card3D = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => {
  const [rotation, setRotation] = useState({ x: 0, y: 0 })
  const cardRef = useRef<HTMLDivElement>(null)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    const rotateX = ((y - centerY) / centerY) * -10
    const rotateY = ((x - centerX) / centerX) * 10
    setRotation({ x: rotateX, y: rotateY })
  }

  const handleMouseLeave = () => setRotation({ x: 0, y: 0 })

  return (
    <div
      ref={cardRef}
      className={`group relative ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: `perspective(1000px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
        transition: "transform 0.1s ease-out",
      }}
    >
      {children}
    </div>
  )
}

export default function HomePage() {
  const parallaxOffset = useParallax()
  const hero = useScrollAnimation(0.1)
  const features = useScrollAnimation(0.2)
  const showcase = useScrollAnimation(0.2)
  const benefits = useScrollAnimation(0.2)
  const cta = useScrollAnimation(0.2)

  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }
    window.addEventListener("mousemove", handleMouseMove, { passive: true })
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-background text-foreground relative overflow-hidden">
      {/* Grille de fond subtile */}
      <div className="fixed inset-0 z-0" style={{
        backgroundImage: `
          linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px),
          linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)
        `,
        backgroundSize: '100px 100px',
        opacity: 0.3
      }} />

      {/* Gradient dynamique suivant la souris */}
      <div
        className="fixed inset-0 z-0 opacity-20 transition-opacity duration-700"
        style={{
          background: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, hsl(var(--primary) / 0.08), transparent 50%)`,
        }}
      />

      {/* Blobs animés subtils */}
      <div className="fixed inset-0 z-0 opacity-5">
        <div
          className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-gradient-to-br from-nothly-blue to-nothly-violet rounded-full blur-[120px] animate-blob"
          style={{ transform: `translate(${parallaxOffset * 0.1}px, ${parallaxOffset * 0.05}px)` }}
        />
        <div
          className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-gradient-to-br from-nothly-violet to-nothly-blue rounded-full blur-[100px] animate-blob animation-delay-2000"
          style={{ transform: `translate(-${parallaxOffset * 0.08}px, ${parallaxOffset * 0.12}px)` }}
        />
        <div
          className="absolute bottom-0 left-1/2 w-[400px] h-[400px] bg-gradient-to-br from-nothly-blue/50 to-nothly-violet/50 rounded-full blur-[90px] animate-blob animation-delay-4000"
          style={{ transform: `translate(-${parallaxOffset * 0.06}px, -${parallaxOffset * 0.08}px)` }}
        />
      </div>

      <div className="relative z-10">
        <Navbar />

        <main>
          {/* Hero Section Ultra Premium */}
          <section className="relative min-h-screen flex items-center justify-center px-6 lg:px-8 pt-20">
            <div
              ref={hero.ref}
              className={`max-w-7xl mx-auto text-center transition-all duration-1500 ease-out ${hero.isVisible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-20 scale-95"
                }`}
              style={{ transform: `translateY(${parallaxOffset * 0.2}px)` }}
            >
              {/* Badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm backdrop-blur-xl bg-background/50 hover:bg-background/80 hover:scale-105 transition-all duration-300 mb-12 shadow-lg">
                <Sparkles className="h-4 w-4 text-nothly-violet animate-pulse" />
                <span className="bg-gradient-to-r from-nothly-blue to-nothly-violet bg-clip-text text-transparent font-semibold">
                  AI-Powered Study Assistant
                </span>
              </div>

              {/* Titre avec typographie XXL */}
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-black leading-[1.1] tracking-tighter mb-8">
                <span className="block text-foreground">
                  Transform
                </span>
                <span className="block mt-2 bg-gradient-to-r from-nothly-blue via-nothly-violet to-nothly-blue bg-clip-text text-transparent animate-gradient">
                  PDFs into
                </span>
                <span className="block mt-2 text-foreground">
                  Knowledge
                </span>
              </h1>

              {/* Sous-titre avec effet */}
              <p className="mt-8 text-lg md:text-xl lg:text-2xl text-muted-foreground max-w-4xl mx-auto leading-relaxed font-light">
                Drop any document. Get beautiful study sheets, AI-generated quizzes,
                <br className="hidden md:block" />
                and intelligent progress tracking — all in seconds.
              </p>

              {/* CTA Buttons Premium */}
              <div className="mt-12 flex flex-col sm:flex-row gap-6 justify-center items-center">
                <Link href="/register">
                  <Button
                    size="lg"
                    className="group relative overflow-hidden bg-gradient-to-r from-nothly-blue to-nothly-violet text-white px-14 py-8 rounded-2xl text-xl font-bold shadow-lg shadow-nothly-blue/30 hover:shadow-xl hover:shadow-nothly-violet/40 transition-all duration-500 hover:scale-110"
                  >
                    <span className="relative z-10 flex items-center gap-3">
                      Start Free Trial
                      <ArrowRight className="h-6 w-6 group-hover:translate-x-2 transition-transform duration-300" />
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-nothly-violet to-nothly-blue opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  </Button>
                </Link>
                <Link href="/new">
                  <Button
                    size="lg"
                    variant="outline"
                    className="px-14 py-8 rounded-2xl text-xl font-bold border-2 border-border backdrop-blur-xl bg-background/50 hover:bg-background/80 transition-all duration-300 hover:scale-105"
                  >
                    Watch Demo
                  </Button>
                </Link>
              </div>

              {/* Statistiques impressionnantes */}
              <div className="mt-24 grid grid-cols-3 gap-8 max-w-4xl mx-auto">
                {[
                  { value: "10x", label: "Faster Learning" },
                  { value: "92%", label: "Better Retention" },
                  { value: "3min", label: "Setup Time" },
                ].map((stat, index) => (
                  <div key={index} className="text-center group hover:scale-110 transition-transform duration-300">
                    <div className="text-5xl md:text-6xl font-black bg-gradient-to-r from-nothly-blue to-nothly-violet bg-clip-text text-transparent">
                      {stat.value}
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground font-medium">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Features Section - Cards 3D */}
          <section className="relative py-32 px-6 lg:px-8">
            <div
              ref={features.ref}
              className={`max-w-7xl mx-auto transition-all duration-1500 ease-out ${features.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-20"
                }`}
            >
              <div className="text-center mb-20">
                <h2 className="text-5xl md:text-7xl font-black mb-6 text-foreground">
                  Everything you need
                </h2>
                <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                  Powered by cutting-edge AI to transform how you learn and retain information
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-8">
                {[
                  {
                    icon: FileText,
                    title: "Instant Processing",
                    description: "Upload any PDF and get structured notes in seconds. OCR, extraction, everything automatic.",
                    gradient: "from-nothly-blue to-nothly-violet",
                  },
                  {
                    icon: Brain,
                    title: "AI-Powered Quizzes",
                    description: "Smart questions generated from your content to maximize retention and understanding.",
                    gradient: "from-blue-600 to-purple-600",
                  },
                  {
                    icon: Zap,
                    title: "Progress Tracking",
                    description: "Know exactly what to review and when. Intelligent reminders keep you on track.",
                    gradient: "from-purple-600 to-pink-600",
                  },
                ].map((feature, index) => (
                  <Card3D key={index}>
                    <div className="relative h-full rounded-3xl border border-border/50 bg-card/80 backdrop-blur-xl p-8 shadow-xl hover:shadow-2xl transition-all duration-500 hover:border-border">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 rounded-3xl transition-opacity duration-500" />
                      <div className="relative space-y-6">
                        <div className={`inline-flex p-4 rounded-2xl bg-gradient-to-br ${feature.gradient} shadow-lg`}>
                          <feature.icon className="h-8 w-8 text-white" />
                        </div>
                        <h3 className="text-2xl font-bold text-foreground">{feature.title}</h3>
                        <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                      </div>
                    </div>
                  </Card3D>
                ))}
              </div>
            </div>
          </section>

          {/* Showcase Section - Grande démonstration visuelle */}
          <section className="relative py-32 px-6 lg:px-8">
            <div
              ref={showcase.ref}
              className={`max-w-7xl mx-auto transition-all duration-1500 ease-out ${showcase.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-20"
                }`}
            >
              <div className="grid lg:grid-cols-2 gap-16 items-center">
                <div className="space-y-8">
                  <div className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
                    <Shield className="h-4 w-4" />
                    <span>SMART TECHNOLOGY</span>
                  </div>
                  <h2 className="text-5xl md:text-7xl font-black leading-tight">
                    <span className="text-foreground">
                      Beautiful interfaces,
                    </span>
                    <span className="block mt-3 bg-gradient-to-r from-nothly-blue to-nothly-violet bg-clip-text text-transparent">
                      intelligent results
                    </span>
                  </h2>
                  <p className="text-xl text-muted-foreground leading-relaxed">
                    Every detail crafted for maximum clarity and efficiency. From automatic chapter detection to contextual quizzes.
                  </p>
                  <div className="space-y-4">
                    {[
                      "Automatic content organization",
                      "Context-aware quiz generation",
                      "Smart revision scheduling",
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-3 group">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-r from-nothly-blue to-nothly-violet flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Check className="h-4 w-4 text-white" />
                        </div>
                        <span className="text-foreground text-lg">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card showcase avec effet 3D */}
                <Card3D>
                  <div className="relative">
                    <div className="absolute -inset-8 bg-gradient-to-r from-nothly-blue to-nothly-violet rounded-[40px] blur-3xl opacity-30 group-hover:opacity-50 transition-opacity duration-700" />
                    <div className="relative rounded-[32px] border-2 border-border bg-card/90 backdrop-blur-2xl p-10 shadow-2xl">
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Question 1/15
                          </span>
                          <BookOpen className="h-6 w-6 text-primary" />
                        </div>
                        <h3 className="text-2xl font-bold text-foreground leading-relaxed">
                          What is the main role of the hypothalamus?
                        </h3>
                        <div className="space-y-3">
                          {[
                            { text: "Produces growth hormones", correct: false },
                            { text: "Coordinates hormonal responses", correct: true },
                            { text: "Stores insulin", correct: false },
                            { text: "Filters blood toxins", correct: false },
                          ].map((option, i) => (
                            <div
                              key={i}
                              className={`rounded-2xl border-2 px-6 py-4 text-base font-medium transition-all cursor-pointer ${option.correct
                                ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400 scale-[1.02] shadow-lg shadow-emerald-500/20"
                                : "border-border/50 bg-muted/20 text-muted-foreground hover:border-border hover:bg-muted/30"
                                }`}
                            >
                              {option.correct && "✓ "}{option.text}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card3D>
              </div>
            </div>
          </section>


          {/* Benefits Grid - Simple & Clean */}
          <section className="relative py-32 px-6 lg:px-8 bg-muted/30">
            <div
              ref={benefits.ref}
              className={`max-w-7xl mx-auto transition-all duration-1500 ease-out ${benefits.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-20"
                }`}
            >
              <h2 className="text-5xl md:text-7xl font-black text-center mb-20 text-foreground">
                Why choose Nothly?
              </h2>

              <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                {[
                  { title: "Blazing Fast", value: "< 10s", desc: "PDF to study materials" },
                  { title: "AI Accuracy", value: "98%", desc: "Content precision" },
                  { title: "Time Saved", value: "15h/week", desc: "On average" },
                ].map((item, index) => (
                  <div
                    key={index}
                    className="group relative rounded-3xl border border-border bg-card/90 backdrop-blur-xl p-10 hover:border-primary/50 hover:scale-105 transition-all duration-500 shadow-lg hover:shadow-xl"
                  >
                    <div className="text-center space-y-3">
                      <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        {item.title}
                      </div>

                      <div className="text-5xl md:text-6xl font-black text-foreground">
                        {item.value}
                      </div>

                      <div className="text-sm text-muted-foreground font-medium">
                        {item.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* CTA Final Spectaculaire */}
          <section className="relative py-40 px-6 lg:px-8">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-950/20 to-transparent" />

            <div
              ref={cta.ref}
              className={`max-w-6xl mx-auto text-center relative z-10 transition-all duration-1500 ease-out ${cta.isVisible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-20 scale-95"
                }`}
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-border px-6 py-3 text-sm backdrop-blur-2xl bg-muted/20 mb-12">
                <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                <span className="text-primary font-semibold">Start your journey today</span>
              </div>

              <h2 className="text-6xl md:text-8xl font-black leading-tight tracking-tight mb-8">
                <span className="block text-foreground">
                  Ready to transform
                </span>
                <span className="block mt-3 bg-gradient-to-r from-nothly-blue to-nothly-violet bg-clip-text text-transparent animate-gradient">
                  your learning?
                </span>
              </h2>

              <p className="mt-10 text-2xl text-foreground max-w-3xl mx-auto leading-relaxed font-light">
                Join thousands of students mastering their subjects faster and more effectively
              </p>

              <div className="mt-16">
                <Link href="/register">
                  <Button
                    size="lg"
                    className="group relative overflow-hidden bg-gradient-to-r from-nothly-blue to-nothly-violet text-white px-16 py-10 rounded-2xl text-2xl font-black shadow-[0_30px_90px_-20px_rgba(59,130,246,0.6)] hover:shadow-[0_30px_120px_-20px_rgba(139,92,246,0.8)] transition-all duration-500 hover:scale-110"
                  >
                    <span className="relative z-10 flex items-center gap-4">
                      Get Started Free
                      <ArrowRight className="h-7 w-7 group-hover:translate-x-3 transition-transform duration-300" />
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-nothly-violet to-nothly-blue opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  </Button>
                </Link>
                <p className="mt-6 text-sm text-muted-foreground/60">No credit card required • 14-day free trial</p>
              </div>
            </div>
          </section>
        </main>

        {/* Footer Premium */}
        <footer className="relative border-t border-border/50 py-16 px-6 lg:px-8 backdrop-blur-2xl bg-muted/20">
          <div className="max-w-7xl mx-auto text-center">
            <p className="text-muted-foreground font-medium">
              © 2025 Nothly — Transform your learning, one PDF at a time.
            </p>
          </div>
        </footer>
      </div>
    </div>
  )
}
