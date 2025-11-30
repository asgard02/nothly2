"use client"

import React, { useState, useEffect, useMemo } from "react"
import { Search, Plus, FolderOpen, Sparkles, ArrowRight, FileText, Layers, Trash2, GraduationCap } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { CreateSubjectDialog } from "./CreateSubjectDialog"
import { useSubjects, useDeleteSubject, type Subject } from "@/lib/hooks/useSubjects"
import DeleteSubjectDialog from "@/components/DeleteSubjectDialog"

import { useDebounce } from "@/lib/hooks/useDebounce"
import { useTranslations } from "next-intl"

interface LibraryViewProps {
  onSelectSubject?: (subject: Subject) => void
}

export function LibraryView({ onSelectSubject }: LibraryViewProps) {
  const t = useTranslations("Library")
  const [searchQuery, setSearchQuery] = useState("")
  const debouncedSearchQuery = useDebounce(searchQuery, 300) // Debounce de 300ms
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null)
  const { data: subjects = [], isLoading, error, refetch } = useSubjects()
  const deleteSubject = useDeleteSubject()

  // Log pour debug (seulement en dev)
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("[LibraryView] Sujets chargés:", subjects.length)
    }
  }, [subjects])

  // Filtrer avec la valeur debouncée pour éviter les re-renders fréquents
  const filteredSubjects = useMemo(() => {
    if (!debouncedSearchQuery.trim()) {
      return subjects
    }
    const query = debouncedSearchQuery.toLowerCase()
    return subjects.filter(subject =>
      subject.title.toLowerCase().includes(query)
    )
  }, [subjects, debouncedSearchQuery])

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">{t("loading")}</p>
        </div>
      </div>
    )
  }

  // Gérer l'erreur si la table n'existe pas
  if (error) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-destructive/10 mb-6">
            <Layers className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-2xl font-semibold mb-2">{t("sqlErrorTitle")}</h2>
          <p className="text-muted-foreground mb-4">
            {error instanceof Error ? error.message : t("sqlErrorMessage")}
          </p>
          <div className="bg-muted/50 rounded-xl p-4 text-left text-sm mb-6">
            <p className="font-medium mb-2">{t("sqlErrorHelp")}</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Ouvrez Supabase Dashboard → SQL Editor</li>
              <li>Ouvrez le fichier <code className="bg-background px-1 rounded">supabase-create-subjects-table.sql</code></li>
              <li>Copiez-collez le contenu dans l'éditeur SQL</li>
              <li>Exécutez la requête (Run ou Ctrl+Enter)</li>
            </ol>
          </div>
          <Button
            onClick={() => window.location.reload()}
            className="rounded-full"
          >
            {t("reloadPage")}
          </Button>
        </div>
      </div>
    )
  }

  const formatLastActive = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return t("today")
    if (diffDays === 1) return t("yesterday")
    if (diffDays < 7) return t("daysAgo", { days: diffDays })
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
  }

  return (
    <div className="h-full flex flex-col relative overflow-hidden bg-gradient-to-br from-background via-background to-muted/20">
      {/* Background avec dot grid subtil */}
      <div
        className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle, currentColor 1px, transparent 1px)`,
          backgroundSize: "32px 32px"
        }}
      />

      {/* Gradient décoratif */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

      {/* Header compact */}
      <div className="relative z-10 flex-shrink-0 px-6 pt-6 pb-4 border-b border-border/40 bg-background/60 backdrop-blur-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground mb-1">
              {t("title")}
            </h1>
            <p className="text-xs text-muted-foreground">
              {filteredSubjects.length} {filteredSubjects.length > 1 ? t("title").toLowerCase() : t("title").slice(0, -1).toLowerCase()}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Barre de recherche compacte */}
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder={t("searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm rounded-lg border border-border/60 bg-background/80 backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/60 transition-all placeholder:text-muted-foreground/60"
              />
            </div>

            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              size="sm"
              className="rounded-lg px-4 py-2"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t("newCollection")}
            </Button>
          </div>
        </div>
      </div>

      {/* Contenu - Grille moderne */}
      <div className="relative z-10 flex-1 overflow-y-auto p-6">
        {filteredSubjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full relative z-10">
            {/* Decorative background elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px]" />
            </div>

            <div className="relative z-10 flex flex-col items-center text-center max-w-3xl mx-auto p-12 rounded-3xl border border-border/50 bg-background/30 backdrop-blur-xl shadow-2xl animate-in fade-in zoom-in-95 duration-500">
              {/* Benefit-driven headline */}
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-br from-foreground via-foreground to-foreground/70 leading-tight py-2">
                {t("onboardingHeadline")}
              </h2>

              <p className="text-muted-foreground text-lg mb-12 leading-relaxed max-w-2xl">
                {t("onboardingSubtitle")}
              </p>

              {/* 3-Step Process Visualization */}
              <div className="flex items-center justify-center gap-6 mb-12 w-full">
                {/* Step 1: Import PDF */}
                <div className="flex flex-col items-center gap-3 flex-1 max-w-[140px]">
                  <div className="relative group">
                    <div className="absolute inset-0 bg-blue-500/20 rounded-2xl blur-lg group-hover:blur-xl transition-all duration-300" />
                    <div className="relative h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 shadow-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <FileText className="h-8 w-8 text-blue-500" />
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-foreground">{t("step1Label")}</span>
                </div>

                {/* Arrow */}
                <ArrowRight className="h-6 w-6 text-muted-foreground/40 flex-shrink-0" />

                {/* Step 2: AI Processing */}
                <div className="flex flex-col items-center gap-3 flex-1 max-w-[140px]">
                  <div className="relative group">
                    <div className="absolute inset-0 bg-purple-500/20 rounded-2xl blur-lg group-hover:blur-xl transition-all duration-300" />
                    <div className="relative h-16 w-16 rounded-2xl bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 shadow-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <Sparkles className="h-8 w-8 text-purple-500" />
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-foreground">{t("step2Label")}</span>
                </div>

                {/* Arrow */}
                <ArrowRight className="h-6 w-6 text-muted-foreground/40 flex-shrink-0" />

                {/* Step 3: Master it */}
                <div className="flex flex-col items-center gap-3 flex-1 max-w-[140px]">
                  <div className="relative group">
                    <div className="absolute inset-0 bg-emerald-500/20 rounded-2xl blur-lg group-hover:blur-xl transition-all duration-300" />
                    <div className="relative h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 shadow-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                      <GraduationCap className="h-8 w-8 text-emerald-500" />
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-foreground">{t("step3Label")}</span>
                </div>
              </div>

              {/* CTA Button */}
              <Button
                onClick={() => setIsCreateDialogOpen(true)}
                size="lg"
                className="h-14 px-10 rounded-full shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-300 hover:scale-105 text-base font-semibold"
              >
                <Plus className="h-5 w-5 mr-2" />
                {t("ctaStartSubject")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-w-[1600px] mx-auto">
            {filteredSubjects.map((subject, index) => (
              <SubjectCard
                key={subject.id}
                subject={subject}
                index={Math.min(index, 20)} // Limiter le delay d'animation pour éviter les lags
                onClick={() => onSelectSubject?.(subject)}
                onDelete={(e) => {
                  e.stopPropagation()
                  setSubjectToDelete(subject)
                }}
                formatLastActive={formatLastActive}
              />
            ))}
          </div>
        )}
      </div>

      {/* Dialog de création */}
      <CreateSubjectDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />

      {/* Dialog de suppression */}
      <DeleteSubjectDialog
        isOpen={!!subjectToDelete}
        onClose={() => setSubjectToDelete(null)}
        onConfirm={() => {
          if (subjectToDelete) {
            deleteSubject.mutate(subjectToDelete.id, {
              onSuccess: () => {
                setSubjectToDelete(null)
              },
              onError: (error) => {
                console.error("Erreur lors de la suppression:", error)
                alert(t("deleteError"))
              }
            })
          }
        }}
        subjectTitle={subjectToDelete?.title || ""}
        isDeleting={deleteSubject.isPending}
      />
    </div>
  )
}

// Composant SubjectCard
interface SubjectCardProps {
  subject: Subject
  index: number
  onClick: () => void
  onDelete: (e: React.MouseEvent) => void
  formatLastActive: (date: string) => string
}

// Memoize le composant pour éviter les re-renders inutiles
const SubjectCard = React.memo(function SubjectCard({ subject, index, onClick, onDelete, formatLastActive }: SubjectCardProps) {
  const t = useTranslations("Library")
  return (
    <div
      onClick={onClick}
      className="group cursor-pointer animate-in fade-in-0 slide-in-from-bottom-4 duration-300"
      style={{ animationDelay: `${Math.min(index * 30, 500)}ms` }}
    >
      <div
        className={cn(
          "h-full rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm",
          "overflow-hidden shadow-sm hover:shadow-lg hover:shadow-primary/5",
          "transition-all duration-200 hover:border-primary/40",
          "bg-gradient-to-br from-card/80 to-card/40",
          "hover:-translate-y-1" // Animation CSS simple au lieu de framer-motion
        )}
      >
        {/* Header compact avec gradient */}
        <div className={cn(
          "h-24 bg-gradient-to-br relative overflow-hidden",
          subject.color
        )}>
          {/* Overlay subtil */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.1)_0%,transparent_60%)]" />

          {/* Icône et infos */}
          <div className="relative h-full flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-background/90 backdrop-blur-sm border border-border/30">
                <FolderOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                  {subject.title}
                </h3>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-muted-foreground/80 flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {subject.doc_count}
                  </span>
                  <span className="text-xs text-muted-foreground/80 flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    {subject.artifact_count}
                  </span>
                </div>
              </div>
            </div>

            {/* Bouton de suppression */}
            <button
              onClick={onDelete}
              className="p-1.5 rounded-lg bg-background/90 backdrop-blur-sm border border-border/30 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:border-destructive/30 z-10"
              title={t("deleteTooltip")}
            >
              <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive transition-colors" />
            </button>
          </div>
        </div>

        {/* Footer compact */}
        <div className="px-4 py-3 bg-card/40 border-t border-border/30 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {formatLastActive(subject.last_active)}
          </span>
          <div className="flex items-center gap-1.5 text-primary opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-xs font-medium">{t("open")}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>
    </div>
  )
})
