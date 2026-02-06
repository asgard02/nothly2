"use client"

import { Brain, Github, Globe } from "lucide-react"
import { useTranslations } from "next-intl"

export default function AboutSettingsPage() {
  const t = useTranslations("Settings.About")

  return (
    <div className="max-w-3xl mx-auto p-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-black uppercase text-foreground mb-2">{t("title")}</h1>
        <p className="text-muted-foreground font-medium">
          {t("description")}
        </p>
      </div>

      {/* Informations principales */}
      <div className="bg-card border-2 border-border rounded-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.15)] p-6 mb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl flex items-center justify-center border-2 border-border shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.15)]">
            <Brain className="h-8 w-8 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-foreground uppercase">Nothly</h2>
            <p className="text-sm text-muted-foreground font-bold">Version 1.0.0</p>
          </div>
        </div>

        <p className="text-muted-foreground leading-relaxed mb-6 font-medium">
          {t("appDescription")}
        </p>

        <div className="space-y-3">
          {/* Site web */}
          <a
            href="https://nothly.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 rounded-xl border-2 border-border hover:bg-muted transition-all duration-200 group hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.15)] hover:-translate-y-1"
          >
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center border-2 border-border group-hover:bg-primary/20 transition-colors">
              <Globe className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-foreground">{t("website")}</p>
              <p className="text-sm text-muted-foreground font-medium">{t("websiteDesc")}</p>
            </div>
          </a>

          {/* GitHub */}
          <a
            href="https://github.com/nothly"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 rounded-xl border-2 border-border hover:bg-muted transition-all duration-200 group hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.15)] hover:-translate-y-1"
          >
            <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center border-2 border-border group-hover:bg-muted/80 transition-colors">
              <Github className="h-5 w-5 text-foreground" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-foreground">GitHub</p>
              <p className="text-sm text-muted-foreground font-medium">{t("sourceCode")}</p>
            </div>
          </a>
        </div>
      </div>

      {/* Technologies */}
      <div className="bg-card border-2 border-border rounded-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.15)] p-6 mb-6">
        <h2 className="text-lg font-black uppercase text-foreground mb-4">
          {t("technologies")}
        </h2>

        <div className="grid grid-cols-2 gap-3">
          {[
            "Next.js 14",
            "React",
            "Supabase",
            "OpenAI",
            "TailwindCSS",
            "TypeScript",
          ].map((tech) => (
            <div
              key={tech}
              className="px-4 py-3 bg-muted rounded-xl text-center text-sm font-bold text-foreground border-2 border-border"
            >
              {tech}
            </div>
          ))}
        </div>
      </div>

      {/* Crédits */}
      <div className="bg-card border-2 border-border rounded-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.15)] p-6">
        <h2 className="text-lg font-black uppercase text-foreground mb-4">
          {t("credits")}
        </h2>

        <div className="space-y-3 text-sm text-muted-foreground font-medium">
          <p>
            <span className="font-bold text-foreground">{t("icons")} :</span> Lucide React
          </p>
          <p>
            <span className="font-bold text-foreground">{t("ai")} :</span> OpenAI GPT-4o-mini
          </p>
          <p>
            <span className="font-bold text-foreground">{t("infrastructure")} :</span> Supabase
          </p>
        </div>
      </div>
    </div>
  )
}
