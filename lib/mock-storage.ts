import type { Note } from "./db"

// Mock storage en mémoire partagé entre toutes les routes API
// En production, remplacer par Supabase
export const mockNotes = new Map<string, Note[]>()

// Fonctions helpers pour gérer les notes
export function getUserNotes(userId: string): Note[] {
  return mockNotes.get(userId) || []
}

export function setUserNotes(userId: string, notes: Note[]) {
  mockNotes.set(userId, notes)
}

export function addUserNote(userId: string, note: Note) {
  const notes = getUserNotes(userId)
  notes.unshift(note) // Ajoute au début
  setUserNotes(userId, notes)
}

export function updateUserNote(userId: string, noteId: string, updates: Partial<Note>): Note | null {
  const notes = getUserNotes(userId)
  const noteIndex = notes.findIndex(n => n.id === noteId)
  
  if (noteIndex === -1) return null
  
  notes[noteIndex] = {
    ...notes[noteIndex],
    ...updates,
    updated_at: new Date().toISOString()
  }
  
  setUserNotes(userId, notes)
  return notes[noteIndex]
}

export function deleteUserNote(userId: string, noteId: string): boolean {
  const notes = getUserNotes(userId)
  const filteredNotes = notes.filter(n => n.id !== noteId)
  
  if (filteredNotes.length === notes.length) return false
  
  setUserNotes(userId, filteredNotes)
  return true
}

export function getUserNote(userId: string, noteId: string): Note | null {
  const notes = getUserNotes(userId)
  return notes.find(n => n.id === noteId) || null
}

