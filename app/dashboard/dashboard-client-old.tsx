"use client"

import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import type { User, Note } from "@/lib/db"
import { FileText, Plus, Trash2, LogOut, Sparkles, Bot, Wand2 } from "lucide-react"
import AIChat from "@/components/AIChat"
import SelectionMenu from "@/components/SelectionMenu"
import AIContextMenu from "@/components/AIContextMenu"
import { transformText } from "@/lib/ai-client"

interface DashboardClientProps {
  user: User
}

export default function DashboardClient({ user }: DashboardClientProps) {
  const [notes, setNotes] = useState<Note[]>([])
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "">("")
  const [improvingAI, setImprovingAI] = useState(false)
  
  // États pour le chat IA
  const [isChatOpen, setIsChatOpen] = useState(false)
  
  // États pour le menu de sélection contextuelle
  const [isContextualMode, setIsContextualMode] = useState(false)
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false)
  const [selectionMenu, setSelectionMenu] = useState<{
    show: boolean
    position: { top: number; left: number }
    selectedText: string
  }>({ show: false, position: { top: 0, left: 0 }, selectedText: "" })
  const [isTransforming, setIsTransforming] = useState(false)

  // Charge les notes au montage
  useEffect(() => {
    loadNotes()
  }, [])

  // Auto-save avec debounce de 500ms
  useEffect(() => {
    if (!selectedNote) return

    setSaveStatus("saving")
    const timer = setTimeout(() => {
      saveNote()
    }, 500)

    return () => clearTimeout(timer)
  }, [content, title, selectedNote, saveNote])

  // Gestion de la sélection de texte pour le menu contextuel
  useEffect(() => {
    if (!isContextualMode) {
      setSelectionMenu({ show: false, position: { top: 0, left: 0 }, selectedText: "" })
      return
    }

    const handleSelection = () => {
      const selection = window.getSelection()
      const selectedText = selection?.toString().trim()

      if (selectedText && selectedText.length > 0) {
        const range = selection?.getRangeAt(0)
        const rect = range?.getBoundingClientRect()

        if (rect) {
          setSelectionMenu({
            show: true,
            position: {
              top: rect.top + window.scrollY - 60, // 60px au-dessus de la sélection
              left: rect.left + rect.width / 2 + window.scrollX,
            },
            selectedText,
          })
        }
      } else {
        setSelectionMenu({ show: false, position: { top: 0, left: 0 }, selectedText: "" })
      }
    }

    document.addEventListener("mouseup", handleSelection)
    document.addEventListener("keyup", handleSelection)

    return () => {
      document.removeEventListener("mouseup", handleSelection)
      document.removeEventListener("keyup", handleSelection)
    }
  }, [isContextualMode])

  const loadNotes = async () => {
    const res = await fetch("/api/notes")
    if (res.ok) {
      const data = await res.json()
      setNotes(data)
    }
  }

  const createNote = async () => {
    const res = await fetch("/api/notes", {
      method: "POST",
    })
    
    if (res.ok) {
      const newNote = await res.json()
      setNotes([newNote, ...notes])
      selectNote(newNote)
    }
  }

  const selectNote = (note: Note) => {
    setSelectedNote(note)
    setTitle(note.title)
    setContent(note.content)
    setSaveStatus("")
  }

  const saveNote = useCallback(async () => {
    if (!selectedNote) return

    const res = await fetch(`/api/notes/${selectedNote.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content }),
    })

    if (res.ok) {
      const updatedNote = await res.json()

      // Met à jour la liste des notes
      setNotes(notes.map(n =>
        n.id === updatedNote.id ? updatedNote : n
      ))

      setSaveStatus("saved")
    }
  }, [selectedNote, title, content, notes])

  const deleteNote = async () => {
    if (!selectedNote) return
    if (!confirm("Supprimer cette note ?")) return
    
    const res = await fetch(`/api/notes/${selectedNote.id}`, {
      method: "DELETE"
    })
    
    if (res.ok) {
      const newNotes = notes.filter(n => n.id !== selectedNote.id)
      setNotes(newNotes)
      
      // Sélectionne la première note restante ou vide
      if (newNotes.length > 0) {
        selectNote(newNotes[0])
      } else {
        setSelectedNote(null)
        setTitle("")
        setContent("")
      }
    }
  }

  const improveWithAI = async () => {
    if (!selectedNote || !content.trim()) return
    
    setImprovingAI(true)
    
    try {
      const res = await fetch("/api/ai/improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      })
      
      if (res.ok) {
        const { improved } = await res.json()
        
        // Met à jour le contenu avec la version améliorée
        setContent(improved)
        
        // L'auto-save se déclenchera automatiquement via useEffect
      } else {
        const error = await res.json()
        alert(error.error || "Erreur lors de l'amélioration")
      }
    } catch (error) {
      console.error("Erreur amélioration:", error)
      alert("Erreur lors de l'amélioration")
    } finally {
      setImprovingAI(false)
    }
  }

  const handleSelectionAction = async (action: string) => {
    if (!selectionMenu.selectedText) return
    
    setIsTransforming(true)
    
    try {
      const transformed = await transformText(selectionMenu.selectedText, action)
      
      // Remplace le texte sélectionné par le texte transformé
      const newContent = content.replace(selectionMenu.selectedText, transformed)
      setContent(newContent)
      
      // Ferme le menu
      setSelectionMenu({ show: false, position: { top: 0, left: 0 }, selectedText: "" })
      
      // Désélectionne le texte
      window.getSelection()?.removeAllRanges()
    } catch (error) {
      console.error("Erreur transformation:", error)
      alert("Erreur lors de la transformation du texte")
    } finally {
      setIsTransforming(false)
    }
  }

  const handleTextActionFromMenu = async (action: string) => {
    // Vérifie si du texte est sélectionné
    const selection = window.getSelection()
    const selectedText = selection?.toString().trim()
    
    if (!selectedText) {
      alert("Veuillez sélectionner du texte dans votre note avant d'utiliser cette action")
      return
    }
    
    setIsTransforming(true)
    
    try {
      const transformed = await transformText(selectedText, action)
      
      // Remplace le texte sélectionné par le texte transformé
      const newContent = content.replace(selectedText, transformed)
      setContent(newContent)
      
      // Désélectionne le texte
      window.getSelection()?.removeAllRanges()
    } catch (error) {
      console.error("Erreur transformation:", error)
      alert("Erreur lors de la transformation du texte")
    } finally {
      setIsTransforming(false)
    }
  }

  const logout = async () => {
    try {
      await fetch("/auth/signout", { method: "POST", credentials: "include", cache: "no-store" })
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error)
    } finally {
      window.location.href = "/login"
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

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="border-b bg-white h-14 flex items-center px-4 flex-shrink-0">
        <div className="flex items-center justify-between w-full">
          <h1 className="text-xl font-semibold">Nothly</h1>
          
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">{user.email}</span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={logout}
              className="h-8"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Liste des notes */}
        <aside className="w-64 border-r bg-gray-50 flex flex-col">
          <div className="p-3 border-b bg-white">
            <Button 
              onClick={createNote} 
              className="w-full justify-start gap-2 h-9"
              size="sm"
            >
              <Plus className="h-4 w-4" />
              Nouvelle note
            </Button>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {notes.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Aucune note</p>
              </div>
            ) : (
              <div className="p-2">
                {notes.map((note) => (
                  <button
                    key={note.id}
                    onClick={() => selectNote(note)}
                    className={`w-full text-left p-3 rounded-lg mb-1 transition-colors ${
                      selectedNote?.id === note.id
                        ? "bg-white shadow-sm border"
                        : "hover:bg-white hover:shadow-sm"
                    }`}
                  >
                    <h3 className="font-medium text-sm truncate mb-1">
                      {note.title || "Sans titre"}
                    </h3>
                    <p className="text-xs text-gray-500 truncate">
                      {note.content || "Note vide"}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatDate(note.updated_at)}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* Editor */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {selectedNote ? (
            <>
              {/* Toolbar */}
              <div className="border-b bg-white px-6 py-2 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2 text-sm">
                  {saveStatus === "saving" && (
                    <span className="text-gray-400">Enregistrement...</span>
                  )}
                  {saveStatus === "saved" && (
                    <span className="text-green-600">✓ Enregistré</span>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={improveWithAI}
                    disabled={improvingAI || !content.trim()}
                    className="h-8 text-purple-600 hover:text-purple-700 hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    {improvingAI ? "Amélioration en cours..." : "Améliorer avec l'IA"}
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={deleteNote}
                    className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Supprimer
                  </Button>
                </div>
              </div>

              {/* Editor Area */}
              <div className="flex-1 overflow-y-auto px-6 py-8">
                <div className="max-w-3xl mx-auto">
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Titre de la note"
                    className="text-3xl font-bold w-full border-none outline-none mb-6 placeholder:text-gray-300"
                  />
                  
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Commencez à écrire..."
                    className="w-full min-h-[600px] text-base border-none outline-none resize-none placeholder:text-gray-300 leading-relaxed"
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <FileText className="h-20 w-20 mx-auto mb-4 opacity-20" />
                <p className="text-lg mb-2">Aucune note sélectionnée</p>
                <p className="text-sm">Créez-en une pour commencer</p>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Boutons flottants en bas à droite */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-30">
        {/* Bouton Outils IA Contextuelle */}
        <button
          onClick={() => {
            setIsContextMenuOpen(!isContextMenuOpen)
            setIsContextualMode(!isContextualMode)
          }}
          className={`group relative flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-all hover:scale-110 ${
            isContextMenuOpen || isContextualMode
              ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white"
              : "bg-white text-gray-700 hover:bg-gray-50"
          }`}
          title="Outils IA"
        >
          <Wand2 className="h-6 w-6" />
          
          {/* Tooltip */}
          <span className="absolute right-16 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            Outils IA
          </span>
          
          {/* Badge actif */}
          {(isContextMenuOpen || isContextualMode) && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500"></span>
            </span>
          )}
        </button>

        {/* Bouton Chat IA */}
        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className={`group relative flex items-center justify-center w-14 h-14 rounded-full shadow-lg transition-all hover:scale-110 ${
            isChatOpen
              ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white"
              : "bg-white text-gray-700 hover:bg-gray-50"
          }`}
          title="Chat IA"
        >
          <Bot className="h-6 w-6" />
          
          {/* Tooltip */}
          <span className="absolute right-16 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            Chat IA
          </span>
        </button>
      </div>

      {/* Menu de sélection contextuelle (au survol de texte) */}
      {selectionMenu.show && (
        <SelectionMenu
          position={selectionMenu.position}
          onAction={handleSelectionAction}
          isLoading={isTransforming}
        />
      )}

      {/* Menu contextuel IA (au clic sur le bouton ⚙️) */}
      <AIContextMenu
        isOpen={isContextMenuOpen}
        onClose={() => setIsContextMenuOpen(false)}
        position={{ bottom: 90, right: 24 }}
        onTextAction={handleTextActionFromMenu}
      />

      {/* Chat IA */}
      <AIChat isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </div>
  )
}
