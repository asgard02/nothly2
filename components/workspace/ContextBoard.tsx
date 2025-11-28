"use client"

import { useState } from "react"
import { FileText, BrainCircuit, BookOpen, LayoutGrid, GraduationCap, FolderOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LibraryView } from "./LibraryView"
import { CollectionView } from "./CollectionView"

import type { Collection } from "@/lib/hooks/useCollections"
import { useTranslations } from "next-intl"

interface ContextBoardProps {
  activeContext: {
    type: "collection" | "pdf" | "note" | "quiz" | "graph"
    data: any
  }
  onContextChange: (type: "collection" | "pdf" | "note" | "quiz" | "graph", data?: any) => void
}

export function ContextBoard({ activeContext, onContextChange }: ContextBoardProps) {
  const t = useTranslations("ContextBoard")
  // Si aucun contexte n'est actif (état initial), on affiche la nouvelle LibraryView avec Collections
  if (activeContext.type === "graph" || !activeContext.data) {
    return (
      <LibraryView
        onSelectCollection={(collection: Collection) => onContextChange("collection", collection)}
      />
    )
  }

  // Si une collection est sélectionnée, afficher la vue de la collection
  if (activeContext.type === "collection") {
    return (
      <CollectionView
        collection={activeContext.data}
        onBack={() => onContextChange("graph")}
        onSelectDocument={(doc) => onContextChange("pdf", doc)}
      />
    )
  }

  return (
    <div className="h-full flex flex-col bg-background/50">
      {/* Barre d'onglets contextuelle */}
      <div className="flex items-center gap-1 p-2 border-b border-border/40 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <TabButton
          icon={LayoutGrid}
          label={t("myCollections")}
          isActive={false}
          onClick={() => onContextChange("graph")}
          variant="ghost"
        />
        <div className="w-px h-4 bg-border/50 mx-2" />

        <TabButton
          icon={FileText}
          label={t("sourceDocument")}
          isActive={activeContext.type === 'pdf'}
          onClick={() => onContextChange("pdf", activeContext.data)}
        />
        <TabButton
          icon={BookOpen}
          label={t("studySheet")}
          isActive={activeContext.type === 'note'}
          onClick={() => onContextChange("note", activeContext.data)}
        />
        <TabButton
          icon={GraduationCap}
          label={t("quizPractice")}
          isActive={activeContext.type === 'quiz'}
          onClick={() => onContextChange("quiz", activeContext.data)}
        />
      </div>

      {/* Contenu du panneau */}
      <div className="flex-1 overflow-hidden relative">
        {activeContext.type === 'pdf' && (
          <div className="h-full flex flex-col">
            <div className="p-4 border-b border-border/40 flex justify-between items-center bg-card/30">
              <h3 className="font-semibold">{activeContext.data.title}</h3>
              <Button variant="outline" size="sm" disabled>{t("download")}</Button>
            </div>
            <div className="flex-1 bg-muted/20 flex items-center justify-center text-muted-foreground">
              {/* Ici viendra le vrai visualiseur PDF */}
              <div className="text-center">
                <FileText className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p>{t("pdfViewerPlaceholder")}</p>
                <p className="text-xs opacity-60 mt-2">ID: {activeContext.data.id}</p>
              </div>
            </div>
          </div>
        )}

        {activeContext.type === 'note' && (
          <div className="h-full flex flex-col p-8 overflow-y-auto max-w-3xl mx-auto w-full bg-white dark:bg-card shadow-sm my-4 rounded-xl border border-border/30">
            <h1 className="text-3xl font-bold mb-6">{activeContext.data.title} - {t("summaryTitle")}</h1>
            <div className="prose dark:prose-invert max-w-none">
              <p className="lead">{t("summaryIntro")}</p>
              <hr className="my-4" />
              <h3>{t("keyPoints")}</h3>
              <ul>
                <li>{t("keyPoint1")}</li>
                <li>{t("keyPoint2")}</li>
                <li>{t("keyPoint3")}</li>
              </ul>
              <h3>{t("detailedAnalysis")}</h3>
              <p>{t("analysisText")}</p>
            </div>
          </div>
        )}

        {activeContext.type === 'quiz' && (
          <div className="h-full flex items-center justify-center p-8 bg-muted/10">
            <div className="max-w-lg w-full bg-card border border-border rounded-2xl shadow-xl p-8 text-center">
              <BrainCircuit className="h-12 w-12 text-primary mx-auto mb-6" />
              <h3 className="text-xl font-bold mb-2">{t("quizReadyTitle")}</h3>
              <p className="text-muted-foreground mb-8">
                {t("quizReadyDesc", { title: activeContext.data.title })}
              </p>
              <Button size="lg" className="w-full rounded-xl">
                {t("startQuiz")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function TabButton({ icon: Icon, label, isActive, onClick, variant = "default" }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${isActive
        ? "bg-primary/10 text-primary shadow-sm border border-primary/10"
        : variant === "ghost"
          ? "hover:bg-muted text-muted-foreground hover:text-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  )
}

