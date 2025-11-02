"use client"

import { useNotes } from "@/lib/hooks/useNotes"
import NotesGrid from "@/components/NotesGrid"
import { Loader2 } from "lucide-react"

export default function DashboardClient() {
  const { data: notes, isLoading, error } = useNotes()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground font-medium">Chargement de vos notes...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-destructive font-medium">Erreur lors du chargement des notes</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 text-primary hover:text-primary/80 font-medium"
          >
            Réessayer
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-10 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-foreground mb-3 tracking-tight">
          Recueil de notes
        </h1>
        <p className="text-muted-foreground text-lg font-medium">
          {notes?.length || 0} note{notes?.length !== 1 ? "s" : ""} au total
        </p>
      </div>

      {/* Grille de notes */}
      <NotesGrid notes={notes || []} />
    </div>
  )
}

