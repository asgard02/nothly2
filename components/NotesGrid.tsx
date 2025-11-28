"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { FileText, Clock, Trash2, CheckSquare, Square, Plus } from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"
import { useDeleteNote } from "@/lib/hooks/useNotes"
import DeleteNoteDialog from "./DeleteNoteDialog"
import type { Note } from "@/lib/db"

interface NotesGridProps {
  notes: Note[]
}

export default function NotesGrid({ notes }: NotesGridProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const deleteNote = useDeleteNote()

  // État pour la modal de confirmation
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null)
  
  // État pour la sélection multiple
  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set())
  const [showDeleteMultiple, setShowDeleteMultiple] = useState(false)

  // Prefetch une note au hover
  const prefetchNote = async (noteId: string) => {
    // Vérifier d'abord si la note est déjà dans le cache
    const cachedNote = queryClient.getQueryData<Note>(["note", noteId])
    if (cachedNote) {
      // La note est déjà en cache, pas besoin de prefetch
      return
    }

    // Utiliser la même clé que le reste de l'application
    await queryClient.prefetchQuery({
      queryKey: ["note", noteId], // Utiliser "note" au singulier, pas "notes"
      queryFn: async () => {
        const res = await fetch(`/api/notes/${noteId}`)
        if (!res.ok) {
          // Si 404, ne pas throw d'erreur mais retourner null
          if (res.status === 404) {
            return null
          }
          throw new Error("Erreur prefetch")
        }
        return res.json()
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
      // Ne pas throw d'erreur si la note n'existe pas encore
      retry: false,
    })
  }

  // Gérer la sélection/désélection d'une note
  const toggleNoteSelection = (noteId: string) => {
    setSelectedNotes((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(noteId)) {
        newSet.delete(noteId)
      } else {
        newSet.add(noteId)
      }
      return newSet
    })
  }

  // Sélectionner/désélectionner toutes les notes
  const toggleSelectAll = () => {
    if (selectedNotes.size === notes.length) {
      setSelectedNotes(new Set())
    } else {
      setSelectedNotes(new Set(notes.map((note) => note.id)))
    }
  }

  // Gérer la suppression d'une seule note
  const handleDeleteConfirm = () => {
    if (!noteToDelete) return

    deleteNote.mutate(noteToDelete.id, {
      onSuccess: () => {
        setNoteToDelete(null)
      },
      onError: (error) => {
        console.error("Erreur lors de la suppression:", error)
        alert("Erreur lors de la suppression de la note")
      },
    })
  }

  // Gérer la suppression multiple
  const handleDeleteMultiple = async () => {
    setShowDeleteMultiple(false)
    
    // Supprimer toutes les notes sélectionnées
    const deletePromises = Array.from(selectedNotes).map((noteId) =>
      fetch(`/api/notes/${noteId}`, { method: "DELETE" })
    )

    try {
      await Promise.all(deletePromises)
      // Invalider le cache pour recharger la liste
      queryClient.invalidateQueries({ queryKey: ["notes"] })
      // Réinitialiser la sélection
      setSelectedNotes(new Set())
    } catch (error) {
      console.error("Erreur lors de la suppression multiple:", error)
      alert("Erreur lors de la suppression des notes")
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return "À l'instant"
    if (diffMins < 60) return `Il y a ${diffMins} min`
    if (diffMins < 1440) return `Il y a ${Math.floor(diffMins / 60)}h`
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
  }

  if (notes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] py-20">
        <div className="bg-card/80 backdrop-blur-sm rounded-3xl p-16 border border-border shadow-xl max-w-md w-full text-center">
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
              <FileText className="h-10 w-10 text-primary/60" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-foreground mb-3">
            Aucune note pour le moment
          </h3>
          <p className="text-muted-foreground mb-8 text-base max-w-sm mx-auto leading-relaxed">
            Note_fi transforme vos cours en quiz interactifs. <br/>
            <span className="text-primary/80">Copiez-collez votre cours</span> dans une nouvelle note, et laissez l'IA générer vos révisions.
          </p>
          <button
            onClick={() => router.push('/new')}
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-xl font-semibold text-base hover:bg-primary/90 transition-all duration-200 hover:scale-105 hover:shadow-lg shadow-md"
          >
            <Plus className="h-5 w-5" />
            Créer ma première note
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Barre d'actions pour la sélection multiple */}
      {selectedNotes.size > 0 && (
        <div className="mb-6 bg-primary/10 border border-primary/20 rounded-2xl p-4 flex items-center justify-between animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-4">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              {selectedNotes.size === notes.length ? (
                <CheckSquare className="h-5 w-5" />
              ) : (
                <Square className="h-5 w-5" />
              )}
              {selectedNotes.size === notes.length ? "Tout désélectionner" : "Tout sélectionner"}
            </button>
            <span className="text-sm text-primary font-medium">
              {selectedNotes.size} note{selectedNotes.size > 1 ? "s" : ""} sélectionnée{selectedNotes.size > 1 ? "s" : ""}
            </span>
          </div>
          <button
            onClick={() => setShowDeleteMultiple(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground font-medium transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Supprimer la sélection
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {notes.map((note) => {
          const isSelected = selectedNotes.has(note.id)
          
          return (
            <div
              key={note.id}
              onMouseEnter={() => prefetchNote(note.id)}
              className={`group bg-card/40 backdrop-blur-xl rounded-2xl p-6 border transition-all duration-500 ease-out hover:-translate-y-2 hover:shadow-2xl relative overflow-hidden ${
                isSelected
                  ? "border-primary shadow-lg shadow-primary/20 ring-1 ring-primary"
                  : "border-white/10 dark:border-white/5 hover:border-primary/30 hover:shadow-primary/5"
              }`}
            >
              {/* Ajout d'un dégradé subtil en arrière-plan au survol */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

              {/* Checkbox de sélection */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  toggleNoteSelection(note.id)
                }}
                className="absolute top-4 left-4 z-10 p-1.5 rounded-lg hover:bg-primary/10 transition-colors"
                title="Sélectionner"
              >
                {isSelected ? (
                  <CheckSquare className="h-5 w-5 text-primary" />
                ) : (
                  <Square className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </button>

              {/* Bouton de suppression individuelle */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setNoteToDelete(note)
                }}
                className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-2 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 z-10"
                title="Supprimer la note"
              >
                <Trash2 className="h-4 w-4" />
              </button>

              {/* Zone cliquable pour ouvrir la note */}
              <div
                onClick={() => router.push(`/note/${note.id}`)}
                className="cursor-pointer"
              >
                {/* En-tête de la carte */}
                <div className="flex items-start justify-between mb-3 px-8">
                  <h2 className="text-lg font-semibold text-foreground line-clamp-2 flex-1 group-hover:text-primary transition-colors duration-200">
                    {note.title || "Sans titre"}
                  </h2>
                  <FileText className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors duration-200 flex-shrink-0 ml-2" />
                </div>

                {/* Contenu */}
                <p className="text-muted-foreground text-sm line-clamp-3 mb-4 leading-relaxed">
                  {note.content || "Note vide"}
                </p>

                {/* Footer avec date */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                  <Clock className="h-3 w-3" />
                  <span>{formatDate(note.updated_at)}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal de confirmation pour suppression individuelle */}
      <DeleteNoteDialog
        isOpen={!!noteToDelete}
        onClose={() => setNoteToDelete(null)}
        onConfirm={handleDeleteConfirm}
        noteTitle={noteToDelete?.title || ""}
        isDeleting={deleteNote.isPending}
      />

      {/* Modal de confirmation pour suppression multiple */}
      <DeleteNoteDialog
        isOpen={showDeleteMultiple}
        onClose={() => setShowDeleteMultiple(false)}
        onConfirm={handleDeleteMultiple}
        noteTitle={`${selectedNotes.size} note${selectedNotes.size > 1 ? "s" : ""}`}
        isDeleting={false}
      />
    </>
  )
}

