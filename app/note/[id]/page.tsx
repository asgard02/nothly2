"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Sidebar from "@/components/Sidebar"
import { Loader2, ArrowLeft, Wand2 } from "lucide-react"
import AIContextMenu from "@/components/AIContextMenu"
import { transformText } from "@/lib/ai-client"
import ChatButton from "@/components/ChatButton"
import SaveStatusIndicator from "@/components/SaveStatusIndicator"
import { useNote } from "@/lib/hooks/useNotes"
import { useAutoSave } from "@/lib/hooks/useAutoSave"

export default function NoteEditorPage() {
  const { id } = useParams()
  const router = useRouter()
  
  const noteId = Array.isArray(id) ? id[0] : id
  
  // Charger la note avec React Query
  const { data: note, isLoading, error } = useNote(noteId || null)

  // Auto-save optimisé avec le nouveau hook
  const {
    title,
    setTitle,
    content,
    setContent,
    saveStatus,
  } = useAutoSave({
    noteId: noteId || "",
    initialTitle: note?.title || "",
    initialContent: note?.content || "",
    enabled: !!note,
  })

  // États pour l'IA
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false)
  const [isTransforming, setIsTransforming] = useState(false)

  const handleTextActionFromMenu = async (action: string) => {
    const selection = window.getSelection()
    const selectedText = selection?.toString().trim()
    
    if (!selectedText) {
      alert("Veuillez sélectionner du texte avant d'utiliser cette action")
      return
    }
    
    setIsTransforming(true)
    
    try {
      const transformed = await transformText(selectedText, action)
      const newContent = content.replace(selectedText, transformed)
      setContent(newContent)
      window.getSelection()?.removeAllRanges()
    } catch (error) {
      console.error("Erreur transformation:", error)
    } finally {
      setIsTransforming(false)
    }
  }

  // États de chargement et d'erreur
  if (isLoading) {
    return (
      <div className="flex h-screen bg-background items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground font-medium">Chargement de la note...</p>
        </div>
      </div>
    )
  }

  if (error || !note) {
    return (
      <div className="flex h-screen bg-background items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4 font-medium">
            {error ? "Erreur lors du chargement" : "Note introuvable"}
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="text-primary hover:text-primary/80 font-medium transition-colors"
          >
            ← Retour au dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      {/* Éditeur principal */}
      <div className="flex-1 ml-64 flex flex-col">
        {/* Toolbar minimaliste */}
        <div className="border-b border-border bg-card/80 backdrop-blur-md px-8 py-4 flex items-center gap-5">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-muted-foreground hover:text-foreground transition-colors duration-200"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          
          {/* Indicateur de sauvegarde optimisé */}
          <SaveStatusIndicator status={saveStatus} />
        </div>

        {/* Zone d'édition */}
        <div className="flex-1 overflow-y-auto p-10 bg-background">
          <div className="max-w-4xl mx-auto">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titre de la note"
              className="text-5xl font-bold w-full bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground mb-8 tracking-tight"
            />
            
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Commencez à écrire..."
              className="w-full min-h-[600px] text-lg bg-transparent border-none outline-none resize-none text-foreground placeholder:text-muted-foreground leading-relaxed"
            />
          </div>
        </div>
      </div>

      {/* Bouton flottant Outils IA - positionné au-dessus du chatbot */}
      <button
        onClick={() => {
          setIsContextMenuOpen(!isContextMenuOpen)
        }}
        className={`group fixed bottom-28 right-6 z-30 flex items-center justify-center w-14 h-14 rounded-2xl backdrop-blur-md transition-all duration-300 hover:scale-110 ${
          isContextMenuOpen
            ? "bg-primary text-primary-foreground shadow-xl shadow-primary/30"
            : "bg-card/80 text-muted-foreground hover:text-primary border border-border shadow-lg hover:shadow-xl"
        }`}
        title="Outils IA"
      >
        <Wand2 className="h-6 w-6 transition-transform duration-500 group-hover:rotate-[360deg]" />
      </button>

      {/* Menu contextuel IA */}
      <AIContextMenu
        isOpen={isContextMenuOpen}
        onClose={() => setIsContextMenuOpen(false)}
        position={{ bottom: 130, right: 24 }}
        onTextAction={handleTextActionFromMenu}
      />

      {/* Chatbot flottant global */}
      <ChatButton />
    </div>
  )
}

