"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Loader2,
  Sparkles,
  Tag as TagIcon,
  ListChecks,
  ChevronLeft,
  Trash2,
} from "lucide-react"

import type { StudyCollectionDetail } from "@/lib/hooks/useCollections"
import { useDeleteCollection } from "@/lib/hooks/useCollections"
import { cn } from "@/lib/utils"
import DeleteCollectionDialog from "@/components/DeleteCollectionDialog"

interface SidebarPanelProps {
  collection: StudyCollectionDetail
  activeTab: "flashcards" | "quiz"
  onTabChange: (tab: "flashcards" | "quiz") => void
  reviewCount: number
}

export default function SidebarPanel({ collection, activeTab, onTabChange, reviewCount }: SidebarPanelProps) {
  const router = useRouter()
  const deleteCollection = useDeleteCollection()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const handleDelete = () => {
    deleteCollection.mutate(collection.id, {
      onSuccess: () => {
        router.push("/flashcards")
      },
      onError: (error) => {
        console.error("Erreur lors de la suppression:", error)
        alert("Erreur lors de la suppression de la collection")
      },
    })
  }

  const sections = useMemo(
    () => [
      {
        id: "flashcards" as const,
        label: "Flashcards",
        icon: Sparkles,
        count: collection.total_flashcards,
        disabled: collection.total_flashcards === 0,
      },
      {
        id: "quiz" as const,
        label: "Quiz",
        icon: ListChecks,
        count: collection.total_quiz,
        disabled: collection.total_quiz === 0,
      },
    ],
    [collection.total_flashcards, collection.total_quiz]
  )

  return (
    <aside className="col-span-12 md:col-span-3">
      <div className="sticky top-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <button
          onClick={() => router.push("/flashcards")}
          className="group mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
        >
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-600 group-hover:bg-slate-200">
            <ChevronLeft className="h-4 w-4" />
          </span>
          Retour aux collections
        </button>

        <div className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <h2 className="text-xl font-bold text-slate-900">{collection.title}</h2>
              <p className="text-sm text-slate-500 mt-1">Créée le {new Date(collection.created_at).toLocaleDateString("fr-FR")}</p>
            </div>
            <button
              onClick={() => setShowDeleteDialog(true)}
              className="p-2.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
              title="Supprimer la collection"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        </div>

        <nav className="mt-6 grid gap-2">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => onTabChange(section.id)}
              disabled={section.disabled}
              className={cn(
                "flex items-center justify-between rounded-xl border-2 px-4 py-3 text-left transition",
                activeTab === section.id
                  ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm"
                  : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white",
                section.disabled && "cursor-not-allowed opacity-60"
              )}
            >
              <span className="inline-flex items-center gap-2.5 text-base font-medium">
                <section.icon className="h-5 w-5" />
                {section.label}
              </span>
              <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-slate-600 shadow-sm">
                {section.count}
              </span>
            </button>
          ))}
        </nav>

        <div className="mt-6 grid gap-3">
          <div className="rounded-xl border-2 border-slate-200 bg-slate-50 px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Supports</p>
            <p className="mt-2 text-xl font-bold text-slate-900">{collection.total_sources}</p>
          </div>
          <div className="rounded-xl border-2 border-slate-200 bg-slate-50 px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">À revoir</p>
            <p className="mt-2 text-xl font-bold text-amber-600">{reviewCount}</p>
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            {collection.status === "ready"
              ? "Collection prête"
              : collection.status === "failed"
              ? "Génération en échec"
              : "Génération en cours"}
          </div>
          <div className="inline-flex items-center gap-2 text-xs text-slate-500">
            <Loader2 className="h-3 w-3" />
            Dernière màj {new Date(collection.updated_at).toLocaleDateString("fr-FR")}
          </div>
        </div>

        {collection.tags?.length ? (
          <div className="mt-6 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tags</p>
            <div className="flex flex-wrap gap-2">
              {collection.tags.map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
                  <TagIcon className="h-3 w-3 text-blue-500" />
                  {tag}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {/* Dialog de confirmation de suppression */}
        <DeleteCollectionDialog
          isOpen={showDeleteDialog}
          onClose={() => setShowDeleteDialog(false)}
          onConfirm={() => {
            setShowDeleteDialog(false)
            handleDelete()
          }}
          collectionTitle={collection.title}
          isDeleting={deleteCollection.isPending}
        />
      </div>
    </aside>
  )
}
