// Store Zustand pour le cache local des notes (Optimistic UI)
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Note } from './db'

interface NotesState {
  notes: Note[]
  setNotes: (notes: Note[]) => void
  addOptimisticNote: (note: Note) => void
  replaceOptimisticNote: (tempId: string, realNote: Note) => void
  removeNote: (id: string) => void
  updateNote: (id: string, updates: Partial<Note>) => void
}

export const useNotesStore = create<NotesState>()(
  persist(
    (set) => ({
      notes: [],
      
      setNotes: (notes) => set({ notes }),
      
      // Ajoute une note temporaire (optimistic)
      addOptimisticNote: (note) =>
        set((state) => ({
          notes: [note, ...state.notes],
        })),
      
      // Remplace une note temporaire par la vraie
      replaceOptimisticNote: (tempId, realNote) =>
        set((state) => ({
          notes: state.notes.map((n) =>
            n.id === tempId ? realNote : n
          ),
        })),
      
      // Supprime une note
      removeNote: (id) =>
        set((state) => ({
          notes: state.notes.filter((n) => n.id !== id),
        })),
      
      // Met à jour une note
      updateNote: (id, updates) =>
        set((state) => ({
          notes: state.notes.map((n) =>
            n.id === id ? { ...n, ...updates } : n
          ),
        })),
    }),
    {
      name: 'notlhy-notes-cache', // Nom dans localStorage
      partialize: (state) => ({ notes: state.notes }), // Ne persiste que les notes
    }
  )
)

