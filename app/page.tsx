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
  Star,
  Layers,
  Clock // Added Clock import
} from "lucide-react"
import { useEffect, useRef, useState } from "react"

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

export default function HomePage() {
  const hero = useScrollAnimation(0.1)
  const features = useScrollAnimation(0.2)
  const showcase = useScrollAnimation(0.2)
  const benefits = useScrollAnimation(0.2)
  const cta = useScrollAnimation(0.2)

  return (
    <div className="min-h-screen bg-yellow-50 text-black relative overflow-hidden font-sans selection:bg-black selection:text-white">
      {/* Background Pattern */}
      <div className="fixed inset-0 z-0 opacity-10" style={{
        backgroundImage: 'radial-gradient(#000 1px, transparent 1px)',
        backgroundSize: '20px 20px'
      }}></div>

      {/* Decorative Geometric Shapes */}
      <div className="absolute top-20 right-[-50px] w-40 h-40 bg-pink-400 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rotate-12 z-0 hidden lg:block"></div>
      <div className="absolute top-[40%] left-[-50px] w-32 h-32 bg-blue-400 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] -rotate-12 z-0 hidden lg:block"></div>
      <div className="absolute bottom-[20%] right-[10%] w-24 h-24 bg-green-400 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rotate-45 z-0 hidden lg:block"></div>

      <div className="relative z-10">
        <Navbar />

        <main>
          {/* Hero Section */}
          <section className="relative min-h-screen flex items-center justify-center px-6 lg:px-8 pt-20 pb-40">
            <div
              ref={hero.ref}
              className={`max-w-7xl mx-auto text-center transition-all duration-700 ease-out ${hero.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
                }`}
            >
              {/* Badge */}
              <div className="inline-flex items-center gap-2 border-2 border-black bg-white px-4 py-2 text-sm font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-8 transform -rotate-1 hover:rotate-0 transition-transform">
                <Sparkles className="h-4 w-4 text-black" />
                <span className="uppercase tracking-wide">AI-Powered Study Assistant</span>
              </div>

              {/* Titre avec typographie XXL */}
              <h1 className="text-6xl md:text-8xl lg:text-9xl font-black leading-none tracking-tighter mb-8 uppercase text-shadow-neo">
                Transform
                <span className="block text-violet-600">PDFs Into</span>
                Knowledge
              </h1>

              {/* Sous-titre */}
              <p className="mt-6 text-xl md:text-2xl font-medium text-gray-800 max-w-3xl mx-auto leading-relaxed border-l-4 border-black pl-6 text-left md:text-center md:border-none md:pl-0">
                Drop any document. Get beautiful <span className="underline decoration-4 decoration-pink-400">study sheets</span>, AI-generated <span className="underline decoration-4 decoration-blue-400">quizzes</span>, and intelligent progress tracking — all in seconds.
              </p>

              {/* CTA Buttons */}
              <div className="mt-12 flex flex-col sm:flex-row gap-6 justify-center items-center">
                <Link href="/register">
                  <Button
                    size="lg"
                    className="h-16 px-10 rounded-xl text-xl font-black bg-black text-white border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,0.5)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:-translate-x-1 active:translate-x-0 active:translate-y-0 active:shadow-none transition-all"
                  >
                    Start Free Trial
                    <ArrowRight className="ml-3 h-6 w-6" />
                  </Button>
                </Link>
                <Link href="/new">
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-16 px-10 rounded-xl text-xl font-black bg-white text-black border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:-translate-x-1 active:translate-x-0 active:translate-y-0 active:shadow-none transition-all"
                  >
                    Watch Demo
                  </Button>
                </Link>
              </div>

              {/* Statistiques */}
              <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                {[
                  { value: "10x", label: "Faster Learning", color: "bg-pink-300" },
                  { value: "98%", label: "Better Retention", color: "bg-blue-300" },
                  { value: "3min", label: "Setup Time", color: "bg-green-300" },
                ].map((stat, index) => (
                  <div key={index} className={`p-6 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] ${stat.color} hover:-translate-y-1 hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] transition-all`}>
                    <div className="text-5xl font-black text-black">
                      {stat.value}
                    </div>
                    <div className="mt-2 text-sm font-bold uppercase tracking-wider">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Features Section */}
          <section id="flow" className="relative py-32 px-6 lg:px-8 border-t-4 border-black bg-white">
            <div
              ref={features.ref}
              className={`max-w-7xl mx-auto transition-all duration-700 ease-out ${features.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
                }`}
            >
              <div className="text-center mb-20">
                <h2 className="text-5xl md:text-7xl font-black mb-6 uppercase text-black">
                  What You Get
                </h2>
                <div className="h-2 w-32 bg-black mx-auto mb-6"></div>
                <p className="text-xl font-bold text-gray-600 max-w-3xl mx-auto">
                  Powered by cutting-edge AI to transform how you learn.
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-8">
                {[
                  {
                    icon: FileText,
                    title: "Instant Processing",
                    description: "Upload any PDF and get structured notes in seconds. OCR, extraction, everything automatic.",
                    color: "bg-orange-300"
                  },
                  {
                    icon: Brain,
                    title: "AI Quizzes",
                    description: "Smart questions generated from your content to maximize retention and understanding.",
                    color: "bg-violet-300"
                  },
                  {
                    icon: Zap,
                    title: "Progress Tracking",
                    description: "Know exactly what to review and when. Intelligent reminders keep you on track.",
                    color: "bg-yellow-300"
                  },
                ].map((feature, index) => (
                  <div key={index} className="group relative">
                    <div className={`h-full border-4 border-black bg-white p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 transition-all duration-200`}>
                      <div className={`inline-flex p-4 border-2 border-black ${feature.color} shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-6`}>
                        <feature.icon className="h-8 w-8 text-black" />
                      </div>
                      <h3 className="text-2xl font-black text-black mb-4 uppercase">{feature.title}</h3>
                      <p className="text-gray-700 font-medium leading-relaxed border-t-2 border-black pt-4">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Showcase Section */}
          <section id="audience" className="relative py-32 px-6 lg:px-8 bg-blue-50 border-t-4 border-black">
            <div
              ref={showcase.ref}
              className={`max-w-7xl mx-auto transition-all duration-700 ease-out ${showcase.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
                }`}
            >
              <div className="grid lg:grid-cols-2 gap-16 items-center">
                <div className="space-y-8">
                  <div className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-widest bg-black text-white px-3 py-1">
                    <Shield className="h-4 w-4" />
                    <span>Smart Tech</span>
                  </div>
                  <h2 className="text-5xl md:text-6xl font-black leading-tight uppercase">
                    Beautiful Quality,<br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-violet-600" style={{ textShadow: '4px 4px 0px rgba(0,0,0,0.1)' }}>
                      Smart Results
                    </span>
                  </h2>
                  <p className="text-xl font-medium text-gray-800 leading-relaxed">
                    Every detail crafted for clarity. From automatic chapter detection to contextual quizzes.
                  </p>
                  <div className="space-y-4">
                    {[
                      "Automatic organization",
                      "Context-aware quizzes",
                      "Smart scheduling",
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-4 group">
                        <div className="flex-shrink-0 w-8 h-8 bg-green-400 border-2 border-black flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                          <Check className="h-5 w-5 text-black stroke-[3]" />
                        </div>
                        <span className="text-black text-xl font-bold">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card Showcase */}
                <div className="relative">
                  <div className="relative rounded-xl border-4 border-black bg-white p-6 md:p-10 shadow-[16px_16px_0px_0px_rgba(0,0,0,1)]">
                    <div className="absolute top-0 right-0 -mt-6 -mr-6 w-24 h-24 bg-yellow-400 rounded-full border-4 border-black flex items-center justify-center font-black text-2xl rotate-12 z-20 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                      QUIZ
                    </div>
                    <div className="space-y-6">
                      <div className="flex items-center justify-between border-b-2 border-black pb-4">
                        <span className="text-sm font-black uppercase tracking-wider text-gray-500">
                          Question 1/15
                        </span>
                        <BookOpen className="h-6 w-6 text-black" />
                      </div>
                      <h3 className="text-2xl font-bold text-black leading-relaxed">
                        What is the main role of the hypothalamus?
                      </h3>
                      <div className="space-y-3">
                        {[
                          { text: "Produces growth hormones", correct: false, color: "bg-white" },
                          { text: "Coordinates hormonal responses", correct: true, color: "bg-green-100" },
                          { text: "Stores insulin", correct: false, color: "bg-white" },
                          { text: "Filters blood toxins", correct: false, color: "bg-white" },
                        ].map((option, i) => (
                          <div
                            key={i}
                            className={`rounded-lg border-2 border-black px-6 py-4 text-lg font-bold transition-all cursor-pointer shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-x-0 active:translate-y-0 active:shadow-none ${option.correct
                              ? "bg-green-300"
                              : "bg-white hover:bg-gray-50"
                              }`}
                          >
                            {option.correct && "✓ "}{option.text}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Benefits Grid */}
          <section id="value" className="relative py-32 px-6 lg:px-8 bg-white border-t-4 border-black">
            <div
              ref={benefits.ref}
              className={`max-w-7xl mx-auto transition-all duration-700 ease-out ${benefits.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
                }`}
            >
              <h2 className="text-5xl md:text-7xl font-black text-center mb-20 text-black uppercase">
                Why Nothly?
              </h2>

              <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                {[
                  { title: "Blazing Fast", value: "< 10s", desc: "PDF to study materials", icon: Zap, color: "bg-red-400" },
                  { title: "AI Accuracy", value: "98%", desc: "Content precision", icon: Star, color: "bg-blue-400" },
                  { title: "Time Saved", value: "15h", desc: "Per week on average", icon: Clock, color: "bg-yellow-400" },
                ].map((item, index) => (
                  <div
                    key={index}
                    className="group relative rounded-none border-4 border-black bg-white p-10 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-2 transition-all duration-300"
                  >
                    <div className={`absolute top-0 right-0 -mt-6 -mr-6 w-16 h-16 ${item.color} border-4 border-black flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`}>
                      <item.icon className="h-8 w-8 text-black" />
                    </div>
                    <div className="text-center space-y-3">
                      <div className="text-sm font-black text-gray-500 uppercase tracking-widest border-b-2 border-dashed border-gray-300 pb-2">
                        {item.title}
                      </div>

                      <div className="text-6xl md:text-7xl font-black text-black">
                        {item.value}
                      </div>

                      <div className="text-lg text-black font-bold">
                        {item.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* CTA Final */}
          <section className="relative py-40 px-6 lg:px-8 bg-violet-600 border-t-4 border-black">
            <div className="absolute inset-0 opacity-10" style={{
              backgroundImage: 'repeating-linear-gradient(45deg, #000 0, #000 1px, transparent 0, transparent 50%)',
              backgroundSize: '20px 20px'
            }}></div>

            <div
              ref={cta.ref}
              className={`max-w-6xl mx-auto text-center relative z-10 transition-all duration-700 ease-out ${cta.isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
                }`}
            >
              <div className="inline-flex items-center gap-2 border-2 border-black bg-white px-6 py-3 text-sm font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] mb-12 uppercase rotate-2">
                <Sparkles className="h-4 w-4 text-black" />
                <span className="text-black">Start your journey</span>
              </div>

              <h2 className="text-6xl md:text-8xl font-black leading-none tracking-tight mb-8 text-white text-shadow-neo-white">
                READY TO<br />
                <span className="text-yellow-300">TRANSFORM</span><br />
                YOUR LEARNING?
              </h2>

              <p className="mt-10 text-2xl text-white font-bold max-w-3xl mx-auto leading-relaxed">
                Join thousands of students mastering their subjects faster.
              </p>

              <div className="mt-16">
                <Link href="/register">
                  <Button
                    size="lg"
                    className="h-20 px-16 text-2xl font-black bg-white text-black border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:bg-yellow-300 transition-all duration-300"
                  >
                    GET STARTED FREE
                    <ArrowRight className="ml-4 h-8 w-8" />
                  </Button>
                </Link>
                <p className="mt-6 text-sm font-bold text-white/80 uppercase tracking-wider">No credit card required • 14-day free trial</p>
              </div>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="relative border-t-4 border-black py-16 px-6 lg:px-8 bg-black text-white">
          <div className="max-w-7xl mx-auto text-center">
            <div className="text-2xl font-black uppercase mb-4 tracking-wider">Nothly</div>
            <p className="text-gray-400 font-medium">
              © 2025 Nothly — Transform your learning, one PDF at a time.
            </p>
          </div>
        </footer>
      </div>
    </div>
  )
}
