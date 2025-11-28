"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  Loader2,
  ArrowLeft,
  BookOpen,
  Sparkles,
  ListChecks,
  CornerDownRight,
  FileText,
  Clock,
  Target,
  PenSquare,
  Eye,
  X,
} from "lucide-react"

import { useDocumentDetail, type DocumentSectionDetail } from "@/lib/hooks/useDocuments"
import type { RevisionNotePayload } from "@/lib/ai-generation"
import { QuizDialogLauncher, buildDeckQuestions } from "@/components/deck/quiz-dialog-launcher"

function formatDate(value: string | null | undefined) {
  if (!value) return ""
  try {
    return new Date(value).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    })
  } catch {
    return value
  }
}

function sanitizeExcerpt(text: string, limit = 240) {
  if (!text) return ""
  const clean = text.replace(/\s+/g, " ").trim()
  if (clean.length <= limit) return clean
  return `${clean.slice(0, limit).trim()}…`
}

export default function DocumentDetailPage({ params }: { params: { id: string } }) {
  const { data, isLoading, error } = useDocumentDetail(params.id)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [isLoadingPdf, setIsLoadingPdf] = useState(false)
  const [showPdfViewer, setShowPdfViewer] = useState(false)

  const currentVersion = useMemo(() => {
    if (!data) return null

    return (
      data.current_version ??
      data.document_versions.find((version) => version.id === data.current_version_id) ??
      data.document_versions[data.document_versions.length - 1] ??
      null
    )
  }, [data])

  const sections = useMemo(() => {
    if (!currentVersion?.document_sections) {
      return []
    }
    return currentVersion.document_sections.slice().sort((a, b) => a.order_index - b.order_index)
  }, [currentVersion])

  const deckQuestions = useMemo(
    () =>
      sections
        .flatMap((section) => buildDeckQuestions(section.quiz_sets, section.heading))
        .sort((a, b) => a.order_index - b.order_index),
    [sections]
  )

  const totalQuestions = useMemo(
    () => deckQuestions.length,
    [deckQuestions]
  )

  // Fonction pour charger l'URL du PDF
  const loadPdfUrl = async () => {
    if (pdfUrl) {
      setShowPdfViewer(true)
      return
    }

    setIsLoadingPdf(true)
    try {
      const response = await fetch(`/api/documents/${params.id}/pdf`)
      if (!response.ok) {
        throw new Error("Impossible de charger le PDF")
      }
      const data = await response.json()
      setPdfUrl(data.url)
      setShowPdfViewer(true)
    } catch (error) {
      console.error("Erreur lors du chargement du PDF:", error)
      alert("Impossible de charger le PDF")
    } finally {
      setIsLoadingPdf(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Chargement du document...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="rounded-full bg-destructive/10 p-3 text-destructive">
          <PenSquare className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-semibold text-foreground">Document introuvable</h1>
        <p className="text-muted-foreground">
          Impossible de retrouver ce document. Retourne au recueil pour relancer une génération.
        </p>
        <Link href="/dashboard" className="mt-2 inline-flex items-center gap-2 rounded-full border border-border px-5 py-2 text-sm font-medium text-foreground hover:border-primary hover:text-primary">
          <ArrowLeft className="h-4 w-4" />
          Retour au recueil
        </Link>
      </div>
    )
  }

  const processedDate =
    currentVersion?.processed_at ?? data.updated_at ?? data.created_at ?? null

  return (
    <>
      <div className="mx-auto max-w-5xl px-6 py-12 space-y-10">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour au recueil
          </Link>
          <div className="flex items-center gap-3">
            <button
              onClick={loadPdfUrl}
              disabled={isLoadingPdf}
              className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground hover:border-primary hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoadingPdf ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Chargement...
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4" />
                  Voir le PDF
                </>
              )}
            </button>
            <QuizDialogLauncher
              questions={deckQuestions}
              label="Lancer le quiz complet"
              variant="default"
              size="default"
            />
          </div>
        </div>

      <header className="space-y-6 rounded-3xl border border-border bg-card/70 p-8 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${
              data.status === "ready"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : data.status === "processing"
                ? "border-amber-200 bg-amber-50 text-amber-700"
                : "border-destructive/30 bg-destructive/10 text-destructive"
            }`}
          >
            {data.status === "ready"
              ? "Génération terminée"
              : data.status === "processing"
              ? "Génération en cours"
              : "Génération en échec"}
          </span>
          <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
            <FileText className="h-4 w-4" />
            {sections.length} fiche{sections.length > 1 ? "s" : ""}
          </span>
          {processedDate && (
            <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-4 w-4" />
              Générée le {formatDate(processedDate)}
            </span>
          )}
        </div>

        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{data.title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Fichier original : {data.original_filename}
          </p>
          <p className="text-sm text-muted-foreground">
            Dernière mise à jour : {formatDate(data.updated_at)}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <SummaryStat
            icon={BookOpen}
            label="Fiches générées"
            value={`${sections.length}`}
            helper="Sections prêtes à réviser"
          />
          <SummaryStat
            icon={Target}
            label="Questions disponibles"
            value={`${totalQuestions}`}
            helper="Pour les quiz du deck"
          />
          <SummaryStat
            icon={Sparkles}
            label="Quiz prêts"
            value={`${deckQuestions.length > 0 ? "Oui" : "En cours"}`}
            helper={deckQuestions.length > 0 ? "Toutes les sections ont un quiz" : "Patiente encore un peu"}
          />
        </div>
      </header>

      <section className="space-y-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-2xl font-semibold text-foreground">Fiches de révision</h2>
          <span className="text-sm text-muted-foreground">
            {sections.length} fiche{sections.length > 1 ? "s" : ""} générée{sections.length > 1 ? "s" : ""} automatiquement
          </span>
        </div>

        {sections.length === 0 ? (
          <div className="rounded-3xl border border-border bg-card/70 p-12 text-center">
            <Sparkles className="mx-auto mb-4 h-10 w-10 text-primary" />
            <h3 className="text-xl font-semibold">Aucune fiche disponible pour l’instant</h3>
            <p className="mt-2 text-muted-foreground">
              La génération est encore en cours ou a échoué. Relance la génération depuis la page d’import.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {sections.map((section, index) => (
              <NoteCard key={section.id} section={section} index={index} documentId={data.id} />
            ))}
          </div>
        )}
      </section>
      </div>

      {/* Modal/Viewer pour le PDF */}
      {showPdfViewer && pdfUrl && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full h-full max-w-7xl max-h-[90vh] flex flex-col bg-background rounded-lg shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border bg-muted/50">
              <h2 className="text-lg font-semibold text-foreground">{data?.title || "Visualisation PDF"}</h2>
              <button
                onClick={() => setShowPdfViewer(false)}
                className="p-2 rounded-lg hover:bg-muted transition-colors text-foreground"
                aria-label="Fermer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <iframe
                src={pdfUrl}
                className="w-full h-full border-0"
                title="PDF Viewer"
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function NoteCard({
  section,
  index,
  documentId,
}: {
  section: DocumentSectionDetail
  index: number
  documentId: string
}) {
  const revisionPayload = section.revision_notes?.[0]?.payload as RevisionNotePayload | undefined
  
  // Essayer de récupérer le résumé depuis plusieurs sources
  let summaryText = ""
  if (revisionPayload?.summary && revisionPayload.summary.trim()) {
    summaryText = revisionPayload.summary
  } else if (revisionPayload?.sections && revisionPayload.sections.length > 0) {
    // Chercher le résumé dans les sections qui correspondent au heading
    const matchingSection = revisionPayload.sections.find(
      (s) => s.title === section.heading || s.title.toLowerCase().includes(section.heading.toLowerCase())
    )
    if (matchingSection?.summary && matchingSection.summary.trim()) {
      summaryText = matchingSection.summary
    } else if (revisionPayload.sections[0]?.summary && revisionPayload.sections[0].summary.trim()) {
      // Utiliser le premier résumé de section disponible
      summaryText = revisionPayload.sections[0].summary
    }
  }
  
  // Fallback sur le contenu de la section si aucun résumé n'est trouvé
  // Si le contenu est trop long, on le tronque pour l'affichage
  const fallbackText = section.content && section.content.trim() ? section.content : ""
  const summary = sanitizeExcerpt(summaryText || fallbackText, 260)
  const learningObjectives = revisionPayload?.learningObjectives?.slice(0, 3) ?? []
  const keyIdeas =
    revisionPayload?.sections?.flatMap((part) => part.keyIdeas ?? []).slice(0, 4) ?? []

  const sectionQuestions = buildDeckQuestions(section.quiz_sets, section.heading)

  return (
    <article
      id={`section-${section.id}`}
      className="flex h-full flex-col rounded-3xl border border-border/70 bg-background/80 p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Fiche {index + 1}
          </p>
          <h3 className="text-lg font-semibold text-foreground">
            {section.heading || "Sans titre"}
          </h3>
        </div>
        <div className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
          <BookOpen className="h-4 w-4" />
        </div>
      </div>

      {summary ? (
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{summary}</p>
      ) : (
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground italic">
          Résumé en cours de génération...
        </p>
      )}

      {learningObjectives.length > 0 && (
        <div className="mt-5 space-y-2 rounded-2xl bg-primary/5 p-4">
          <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Objectifs d’apprentissage
          </h4>
          <ul className="space-y-1.5 text-sm text-primary">
            {learningObjectives.map((objective, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <CornerDownRight className="mt-1 h-3 w-3" />
                <span>{objective}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {keyIdeas.length > 0 && (
        <div className="mt-4 space-y-2">
          <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <ListChecks className="h-3.5 w-3.5 text-primary" />
            Points clés
          </h4>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            {keyIdeas.map((idea, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <CornerDownRight className="mt-1 h-3 w-3 text-primary" />
                <span>{idea}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 flex items-center justify-between gap-3 border-t border-border/60 pt-4">
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">
            {sectionQuestions.length} question{sectionQuestions.length > 1 ? "s" : ""} associée
          </span>
          <Link
            href={`/documents/${documentId}/sections/${section.id}`}
            className="text-xs text-primary underline underline-offset-4"
          >
            Ouvrir la fiche
          </Link>
        </div>
        <QuizDialogLauncher
          questions={sectionQuestions}
          label="Quiz section"
          variant="outline"
          size="sm"
        />
      </div>
    </article>
  )
}

function SummaryStat({
  icon: Icon,
  label,
  value,
  helper,
}: {
  icon: typeof BookOpen
  label: string
  value: string
  helper?: string
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-border/60 bg-background/80 p-4">
      <div className="rounded-lg bg-primary/10 p-2 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold text-foreground">{value}</p>
        {helper && <p className="text-xs text-muted-foreground">{helper}</p>}
      </div>
    </div>
  )
}
