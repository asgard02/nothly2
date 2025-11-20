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
    title: "PDF Upload",
    description: "Drop your document, we automatically detect chapters and sections.",
    icon: FileUp
  },
  {
    title: "Smart Analysis",
    description: "Text extraction, OCR when needed, clean content segmentation.",
    icon: Wrench
  },
  {
    title: "Generated Notes",
    description: "Clear hierarchical sheets: titles, definitions, key examples.",
    icon: Sparkles
  },
  {
    title: "Interactive Quizzes",
    description: "Multiple choice, true/false, and completion questions for instant memorization.",
    icon: BookCheck
  },
  {
    title: "Targeted Updates",
    description: "Import a new version, only modified sections are regenerated.",
    icon: RefreshCw
  }
]

const benefits = [
  {
    title: "Massive Time Savings",
    description:
      "No more manually filing each PDF. Nothly produces your ready-to-review study sheets.",
    metric: "x10",
    metricLabel: "Faster than manual filing"
  },
  {
    title: "Deep Understanding",
    description:
      "Summaries faithful to the original text and contextualized quizzes to anchor your knowledge.",
    metric: "92%",
    metricLabel: "Students report better understanding"
  },
  {
    title: "Personalized Tracking",
    description: "Statistics, reminders, and history to know what to review and when.",
    metric: "3 min",
    metricLabel: "To launch a targeted session"
  }
]

const audience = [
  {
    title: "Demanding Students",
    description: "Law, medicine, sciences... masses of PDFs transformed into digestible study sheets."
  },
  {
    title: "Professionals in Training",
    description: "Internal courses, MOOCs, procedures: stay up to date without retyping summaries."
  },
  {
    title: "Educational Creators",
    description: "Transform your content into ready-to-review modules for your audience."
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
              Save hours of filing every week
            </span>
            <h1 className="mt-8 text-5xl md:text-6xl lg:text-7xl font-bold leading-tight tracking-tight">
              Drop your PDF. Nothly gives you study sheets and quizzes ready to review.
            </h1>
            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              A study assistant that reads your documents, simplifies them without betraying meaning,
              and tracks your progress so you truly master the content.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <Button className="bg-gradient-to-r from-nothly-blue to-nothly-violet text-white px-8 py-6 rounded-full shadow-lg shadow-nothly-blue/20 hover:shadow-xl hover:shadow-nothly-blue/30 transition-all duration-200 hover:-translate-y-0.5">
                  Start for free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/new">
                <Button variant="outline" className="px-8 py-6 rounded-full border-2">
                  See the full flow
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
                      Instant Preview
                    </span>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-semibold leading-tight">
                    A structured study sheet as soon as your PDF is imported.
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">
                    Hierarchical titles, definitions, examples, and critical reminders.
                    Everything is automatically generated and stays synchronized with the latest version of the document.
                  </p>
                  <ul className="space-y-3 text-sm text-muted-foreground">
                    <li className="flex items-start gap-3">
                      <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
                      Section summaries faithful to the source content.
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
                      Quiz cards linked to each key concept.
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="mt-1 h-2 w-2 rounded-full bg-primary" />
                      Instant switch from reading mode to practice mode.
                    </li>
                  </ul>
                </div>
                <div className="relative">
                  {/* Quiz Preview - Style réel de l'application */}
                  <div className="rounded-2xl border-2 border-slate-200 bg-white p-8 shadow-lg">
                    <div className="mb-6">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">Question</p>
                      <h3 className="text-xl font-semibold text-slate-900 leading-relaxed">
                        What is the main role of the hypothalamus in hormonal regulation?
                      </h3>
                    </div>
                    <div className="mt-6 grid gap-3">
                      <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 text-left text-base font-medium">
                        Produces growth hormones
                      </div>
                      <div className="rounded-xl border-2 border-emerald-400 bg-emerald-50 px-5 py-4 text-left text-base font-medium text-emerald-700">
                        Coordinates hormonal responses
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 text-left text-base font-medium opacity-60">
                        Stores insulin
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 text-left text-base font-medium opacity-60">
                        Filters blood toxins
                      </div>
                    </div>
                    <div className="mt-5 rounded-xl border-2 border-emerald-200 bg-emerald-50 px-4 py-3">
                      <p className="text-sm font-medium text-emerald-700">
                        The logarithm function is defined only for positive real numbers.
                      </p>
                    </div>
                    <div className="mt-6 flex justify-end">
                      <button className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700">
                        Next
                      </button>
                    </div>
                  </div>
                  
                  {/* Stats card */}
                  <div className="absolute -bottom-8 -right-8 hidden md:block">
                    <div className="rounded-2xl border-2 border-slate-200 bg-white p-5 shadow-sm">
                      <p className="text-xs font-medium uppercase tracking-wide text-neutral-600">Progress</p>
                      <p className="mt-2 text-2xl font-bold text-neutral-900">4%</p>
                      <p className="text-xs text-neutral-600 mt-1">Question 1 / 13</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="flow" className="py-24 px-6 lg:px-8 bg-muted/20">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-center text-3xl md:text-4xl font-semibold leading-tight">
              The Nothly flow: from upload to review, frictionless.
            </h2>
            <p className="mt-4 text-center text-muted-foreground max-w-2xl mx-auto">
              Each step is automated but controllable. You track progress in real-time and get a ready-to-use study space.
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
                      <span className="text-xs text-muted-foreground font-medium">Step {index + 1}</span>
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

        <section id="value" className="py-24 px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <div className="grid gap-12 md:grid-cols-[1.1fr,0.9fr] items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-semibold leading-tight">
                  Why students and professionals choose Nothly?
                </h2>
                <p className="mt-4 text-muted-foreground leading-relaxed">
                  We focus on your understanding: reliable content, adapted quizzes, tracking that tells you exactly
                  what to review. Without distraction or jargon.
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
                  <span className="text-sm font-medium text-muted-foreground">Progress Tracking</span>
                </div>
                <div className="mt-8 space-y-6">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Mastered Chapters</p>
                    <div className="mt-2 h-12 rounded-2xl bg-muted/40 p-2">
                      <div
                        className="h-full rounded-2xl bg-gradient-to-r from-nothly-blue to-nothly-violet"
                        style={{ width: "78%" }}
                      />
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">Chapter 3 to review in 5 days</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-muted/30 p-6">
                    <p className="text-sm font-semibold text-foreground">Automatic Reminder</p>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                      "You haven't reviewed the Immunology section for 6 days. Launch a 5-question quiz?"
                    </p>
                    <div className="mt-4 flex items-center gap-3">
                      <Button size="sm" className="rounded-full px-5 py-2 text-sm">
                        Launch Quiz
                      </Button>
                      <Button size="sm" variant="ghost" className="text-muted-foreground">
                        Remind me tomorrow
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="audience" className="py-24 px-6 lg:px-8 bg-muted/20">
          <div className="max-w-5xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-semibold">
              Designed for those who learn fast and well.
            </h2>
            <p className="mt-4 text-muted-foreground max-w-3xl mx-auto">
              Nothly is not a general-purpose editor. It's your personal study assistant, focused on rapid assimilation.
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
              Smart updates included
            </span>
            <h2 className="mt-6 text-3xl md:text-4xl font-semibold leading-tight">
              Importing a new PDF version? Nothly detects what changed and updates only the impacted sections.
            </h2>
            <p className="mt-4 text-muted-foreground">
              Annotations, completed quizzes, and your review history are preserved. You pick up exactly where you left off.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <Button className="px-8 py-6 rounded-full bg-gradient-to-r from-nothly-blue to-nothly-violet text-white shadow-lg shadow-nothly-blue/20 hover:shadow-xl hover:-translate-y-0.5 transition-all">
                  Try it now
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-12 px-6 lg:px-8">
        <div className="max-w-6xl mx-auto text-center text-sm text-muted-foreground">
          © 2025 Nothly — Your understanding assistant.
        </div>
      </footer>
    </div>
  )
}
