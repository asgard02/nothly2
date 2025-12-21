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

  const subjectColors = ["bg-[#BAE6FD]", "bg-[#FBCFE8]", "bg-[#BBF7D0]", "bg-[#FDE68A]", "bg-[#DDD6FE]"]

  return (
    <div className="h-full flex flex-col relative overflow-hidden bg-transparent">

      {/* Search Header Floating */}
      <div className="flex-shrink-0 px-6 pt-6 pb-2 z-20">
        <div className="rounded-3xl bg-white border-2 border-black p-6 flex flex-col md:flex-row items-center justify-between shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] gap-4">
          <div className="px-2">
            <h1 className="text-3xl font-black tracking-tight text-black mb-1 uppercase">
              {t("title")}
            </h1>
            <p className="text-sm font-bold text-gray-500 uppercase">
              {filteredSubjects.length} {filteredSubjects.length > 1 ? t("title").toLowerCase() : t("title").slice(0, -1).toLowerCase()}
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* Barre de recherche compacte */}
            <div className="relative w-full md:w-72 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-black group-focus-within:text-black transition-colors" strokeWidth={3} />
              <input
                type="text"
                placeholder={t("searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 text-sm font-bold rounded-xl border-2 border-black bg-white focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all placeholder:text-gray-400 text-black placeholder:font-medium placeholder:uppercase"
              />
            </div>

            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              size="sm"
              className="h-12 rounded-xl px-6 bg-black text-white hover:bg-gray-800 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] active:translate-y-[4px] active:shadow-none transition-all font-black uppercase"
            >
              <Plus className="h-4 w-4 mr-2" strokeWidth={3} />
              {t("newCollection")}
            </Button>
          </div>
        </div>
      </div>

      {/* Contenu - Grille moderne */}
      <div className="relative z-10 flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-700/50">
        {filteredSubjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full relative z-10 px-4">
            <div className="relative z-10 flex flex-col items-center text-center w-full max-w-4xl mx-auto p-8 md:p-16 rounded-[2.5rem] border-2 border-black bg-white shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] animate-in fade-in zoom-in-95 duration-500">

              <h2 className="text-4xl md:text-6xl font-black tracking-tight text-black mb-6 uppercase">
                Turn your notes <br className="hidden md:block" /> into <span className="text-[#8B5CF6] underline decoration-4 underline-offset-4">Grades</span>
              </h2>

              <p className="text-gray-600 font-medium text-lg md:text-xl max-w-2xl mx-auto mb-16 leading-relaxed">
                Upload your course materials (PDF, notes) and let our AI instantly generate quizzes and flashcards for you.
              </p>

              {/* 3-Step Process */}
              <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-12 mb-16 w-full">
                {/* Step 1 */}
                <div className="flex flex-col items-center gap-4 group">
                  <div className="w-20 h-20 rounded-2xl bg-[#BAE6FD] border-2 border-black flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] group-hover:-translate-y-1 transition-transform duration-300">
                    <FileText className="h-8 w-8 text-black" strokeWidth={2.5} />
                  </div>
                  <span className="font-black text-black uppercase text-sm">Import PDF</span>
                </div>

                <ArrowRight className="hidden md:block h-6 w-6 text-black" strokeWidth={3} />

                {/* Step 2 */}
                <div className="flex flex-col items-center gap-4 group">
                  <div className="w-20 h-20 rounded-2xl bg-[#FBCFE8] border-2 border-black flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] group-hover:-translate-y-1 transition-transform duration-300">
                    <Sparkles className="h-8 w-8 text-black" strokeWidth={2.5} />
                  </div>
                  <span className="font-black text-black uppercase text-sm">AI Processing</span>
                </div>

                <ArrowRight className="hidden md:block h-6 w-6 text-black" strokeWidth={3} />

                {/* Step 3 */}
                <div className="flex flex-col items-center gap-4 group">
                  <div className="w-20 h-20 rounded-2xl bg-[#BBF7D0] border-2 border-black flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] group-hover:-translate-y-1 transition-transform duration-300">
                    <GraduationCap className="h-8 w-8 text-black" strokeWidth={2.5} />
                  </div>
                  <span className="font-black text-black uppercase text-sm">Master it</span>
                </div>
              </div>

              <Button
                onClick={() => setIsCreateDialogOpen(true)}
                className="h-auto py-4 px-10 rounded-xl bg-black hover:bg-gray-900 text-white text-lg font-black uppercase border-2 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,0.3)] hover:translate-y-[2px] active:translate-y-[4px] active:shadow-none transition-all duration-300"
              >
                <Plus className="h-6 w-6 mr-2" strokeWidth={3} />
                Start a new subject
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-[1600px] mx-auto pb-20">
            {filteredSubjects.map((subject, index) => (
              <SubjectCard
                key={subject.id}
                subject={subject}
                index={Math.min(index, 20)}
                color={subjectColors[index % subjectColors.length]}
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
  color: string
  onClick: () => void
  onDelete: (e: React.MouseEvent) => void
  formatLastActive: (date: string) => string
}

const SubjectCard = React.memo(function SubjectCard({ subject, index, color, onClick, onDelete, formatLastActive }: SubjectCardProps) {
  const t = useTranslations("Library")
  return (
    <div
      onClick={onClick}
      className="group cursor-pointer animate-in fade-in-0 slide-in-from-bottom-4 duration-500"
      style={{ animationDelay: `${Math.min(index * 50, 500)}ms` }}
    >
      <div
        className={cn(
          "h-full min-h-[180px] rounded-2xl border-2 border-black",
          "relative overflow-hidden transition-all duration-300",
          "hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-2",
          color
        )}
      >
        <div className="relative z-10 p-6 flex flex-col h-full justify-between">
          <div>
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 rounded-xl bg-white border-2 border-black text-black group-hover:rotate-6 transition-all duration-300 shadow-sm">
                <FolderOpen className="h-6 w-6" strokeWidth={2.5} />
              </div>

              <button
                onClick={onDelete}
                className="p-2 rounded-lg bg-white border-2 border-black text-black hover:bg-rose-100 transition-colors opacity-0 group-hover:opacity-100 shadow-sm"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <h3 className="text-xl font-black text-black mb-2 line-clamp-1 leading-tight">
              {subject.title}
            </h3>

            <div className="flex items-center gap-3 text-xs text-black/70 font-bold uppercase">
              <span className="flex items-center gap-1.5 bg-white/50 px-2 py-1 rounded-md border border-black/10">
                <FileText className="h-3.5 w-3.5" />
                {subject.doc_count} {subject.doc_count > 1 ? "docs" : "doc"}
              </span>
              <span className="flex items-center gap-1.5 bg-white/50 px-2 py-1 rounded-md border border-black/10">
                <Sparkles className="h-3.5 w-3.5" />
                {subject.artifact_count} generated
              </span>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t-2 border-black/10 flex items-center justify-between">
            <span className="text-xs text-black/60 font-black uppercase">{formatLastActive(subject.last_active)}</span>

            <div className="flex items-center gap-1 text-xs font-black text-black opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-300 uppercase">
              OPEN <ArrowRight className="h-3 w-3" strokeWidth={3} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})
