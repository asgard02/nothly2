
"use client"

import { useMemo } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  ArrowLeft,
  BookOpen,
  Sparkles,
  ListChecks,
  CornerDownRight,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { QuizDialogLauncher, buildDeckQuestions } from "@/components/deck/quiz-dialog-launcher"
import { useDocumentDetail } from "@/lib/hooks/useDocuments"
import type { RevisionNotePayload } from "@/lib/ai-generation"

function formatDate(value: string | null | undefined) {
  if (!value) return ""
  try {
    return new Date(value).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return value
  }
}

function renderSectionContent(content: string) {
  if (!content) return null
  const blocks = content.split(/\n{2,}/)
  return blocks.map((block, index) => {
    const trimmed = block.trim()
    if (!trimmed) {
      return null
    }
    if (/^#{1,3}\s+/.test(trimmed)) {
      const text = trimmed.replace(/^#{1,3}\s+/, "")
      return (
        <h3 key={`heading-${index}`} className="mt-8 text-xl font-semibold text-foreground">
          {text}
        </h3>
      )
    }
    if (/^\-|\*|\d+\.\s+/.test(trimmed)) {
      const items = trimmed
        .split(/\n/)
        .map((item) => item.replace(/^(\-|\*|\d+\.)\s+/, "").trim())
        .filter(Boolean)
      return (
        <ul key={`list-${index}`} className="mt-4 space-y-2 pl-6 text-base text-muted-foreground list-disc">
          {items.map((item, idx) => (
            <li key={`list-item-${index}-${idx}`}>{item}</li>
          ))}
        </ul>
      )
    }
    return (
      <p key={`paragraph-${index}`} className="mt-4 text-base leading-relaxed text-muted-foreground">
        {trimmed}
      </p>
    )
  })
}

export default function SectionDetailPage() {
  const params = useParams<{ id: string; sectionId: string }>()
  const documentId = params.id
  const sectionId = params.sectionId

  const { data, isLoading, error } = useDocumentDetail(documentId)

  const { section, revisionPayload } = useMemo(() => {
    if (!data) {
      return { section: null, revisionPayload: null }
    }

    const versions = data.document_versions
    const currentVersion =
      data.current_version ??
      versions.find((version) => version.id === data.current_version_id) ??
      versions[versions.length - 1]

    const foundSection = currentVersion?.document_sections?.find((item) => item.id === sectionId) ?? null
    const payload = foundSection?.revision_notes?.[0]?.payload as RevisionNotePayload | undefined

    return { section: foundSection, revisionPayload: payload ?? null }
  }, [data, sectionId])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Chargement de la fiche…</p>
      </div>
    )
  }

  if (error || !data || !section) {
    return (
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="rounded-full bg-destructive/10 p-3 text-destructive">
          <BookOpen className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-semibold text-foreground">Fiche introuvable</h1>
        <p className="text-muted-foreground">
          Impossible de retrouver cette fiche. Retourne au deck pour relancer la génération.
        </p>
        <Link href={`/documents/${documentId}`}>
          <Button variant="outline">Retour au deck</Button>
        </Link>
      </div>
    )
  }

  const deckQuestions = buildDeckQuestions(section.quiz_sets, section.heading)
  const processedDate =
    data.updated_at ?? data.created_at ?? null

  const learningObjectives = revisionPayload?.learningObjectives ?? []
  const keyIdeas =
    revisionPayload?.sections?.flatMap((part) => part.keyIdeas ?? []) ?? []

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-10 px-6 py-10">
      <header className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href={`/documents/${documentId}`}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour au deck
            </Link>
          </div>
          <QuizDialogLauncher questions={deckQuestions} label="Quiz de la section" variant="default" />
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Fiche {section.order_index + 1}
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-foreground">
            {section.heading || "Sans titre"}
          </h1>
          {processedDate && (
            <p className="mt-2 text-sm text-muted-foreground">
              Dernière mise à jour le {formatDate(processedDate)}
            </p>
          )}
        </div>
      </header>

      <main className="space-y-10">
        <section className="space-y-6 rounded-3xl border border-border/80 bg-card/70 p-8 shadow-sm">
          {renderSectionContent(section.content)}
        </section>

        {learningObjectives.length > 0 && (
          <section className="space-y-3 rounded-3xl border border-primary/30 bg-primary/5 p-6">
            <div className="flex items-center gap-2 text-primary">
              <Sparkles className="h-4 w-4" />
              <h2 className="text-sm font-semibold uppercase tracking-wide">
                Objectifs d’apprentissage
              </h2>
            </div>
            <ul className="space-y-2 text-sm text-primary">
              {learningObjectives.map((objective, index) => (
                <li key={`objective-${index}`} className="flex items-start gap-2">
                  <CornerDownRight className="mt-1 h-3 w-3" />
                  <span>{objective}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {keyIdeas.length > 0 && (
          <section className="space-y-3 rounded-3xl border border-border/70 bg-muted/40 p-6">
            <div className="flex items-center gap-2 text-muted-foreground">
              <ListChecks className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold uppercase tracking-wide">
                Points clés à retenir
              </h2>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {keyIdeas.map((idea, index) => (
                <li key={`idea-${index}`} className="flex items-start gap-2">
                  <CornerDownRight className="mt-1 h-3 w-3 text-primary" />
                  <span>{idea}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  )
}

