"use client"

import { useState, useEffect, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import Sidebar from "@/components/Sidebar"
import { Loader2, ArrowLeft, Sparkles } from "lucide-react"
import NotionStyleMenu from "@/components/NotionStyleMenu"
import MainContent from "@/components/MainContent"
import { transformText } from "@/lib/ai-client"
import ChatButton from "@/components/ChatButton"
import SaveStatusIndicator from "@/components/SaveStatusIndicator"
import { useNote } from "@/lib/hooks/useNotes"
import { useAutoSave } from "@/lib/hooks/useAutoSave"
import { useRealtimeNote } from "@/lib/hooks/useRealtimeNote"
import { triggerGenerationToast } from "@/components/GenerationToast"
import { toast } from "sonner"

export default function NoteEditorPage() {
  const { id } = useParams()
  const router = useRouter()

  const noteId = Array.isArray(id) ? id[0] : id

  // Charger la note avec React Query (peut être null si la note n'existe pas encore)
  const { data: note, isLoading, error } = useNote(noteId || null)

  // 🔄 Activer les mises à jour en temps réel (collaboration live)
  useRealtimeNote(noteId || null)

  // Auto-save optimisé avec le nouveau hook
  // ⚡ Activé même si la note n'existe pas encore (elle sera créée au premier edit)
  // ⚡ Utiliser les valeurs de la note chargée si disponibles, sinon des chaînes vides
  const noteTitle = note?.title ?? ""
  const noteContent = note?.content ?? ""

  const {
    title,
    setTitle,
    content,
    setContent,
    saveStatus,
  } = useAutoSave({
    noteId: noteId || "",
    initialTitle: noteTitle,
    initialContent: noteContent,
    enabled: !!noteId, // Activé dès qu'on a un ID (même si la note n'existe pas encore)
  })

  // États pour le menu style Notion
  const [selectionMenu, setSelectionMenu] = useState<{
    show: boolean
    position: { top: number; left: number }
    selectedText: string
    startOffset: number
    endOffset: number
  }>({
    show: false,
    position: { top: 0, left: 0 },
    selectedText: "",
    startOffset: 0,
    endOffset: 0,
  })
  const [isTransforming, setIsTransforming] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Détecter la sélection de texte dans le textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    const handleSelection = () => {
      // Petit délai pour s'assurer que la sélection est bien définie
      setTimeout(() => {
        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const selectedText = content.substring(start, end).trim()

        if (selectedText && selectedText.length > 0 && start !== end) {
          const textareaRect = textarea.getBoundingClientRect()

          // Calculer approximativement la position basée sur le nombre de lignes
          const textBeforeStart = content.substring(0, start)
          const linesBefore = textBeforeStart.split('\n')
          const lineHeight = parseFloat(window.getComputedStyle(textarea).lineHeight) || 24
          const paddingTop = parseFloat(window.getComputedStyle(textarea).paddingTop) || 0

          // Position approximative : au-dessus de la ligne de sélection
          const approximateTop = textareaRect.top + paddingTop + (linesBefore.length - 1) * lineHeight - 50

          // Centrer horizontalement sur le textarea (ou utiliser la position du curseur si possible)
          const menuLeft = textareaRect.left + (textareaRect.width / 2)

          // Vérifier que le menu ne sort pas de l'écran
          const menuWidth = 280
          const adjustedLeft = Math.max(
            menuWidth / 2 + 10,
            Math.min(menuLeft, window.innerWidth - menuWidth / 2 - 10)
          )

          const adjustedTop = Math.max(10, approximateTop)

          setSelectionMenu({
            show: true,
            position: { top: adjustedTop, left: adjustedLeft },
            selectedText,
            startOffset: start,
            endOffset: end,
          })
        } else {
          setSelectionMenu({
            show: false,
            position: { top: 0, left: 0 },
            selectedText: "",
            startOffset: 0,
            endOffset: 0,
          })
        }
      }, 10)
    }

    textarea.addEventListener('mouseup', handleSelection)
    textarea.addEventListener('keyup', handleSelection)
    textarea.addEventListener('select', handleSelection)

    return () => {
      textarea.removeEventListener('mouseup', handleSelection)
      textarea.removeEventListener('keyup', handleSelection)
      textarea.removeEventListener('select', handleSelection)
    }
  }, [content])

  // Fermer le menu si on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target && !target.closest('[data-notion-menu]')) {
        setSelectionMenu(prev => ({ ...prev, show: false }))
      }
    }

    if (selectionMenu.show) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [selectionMenu.show])

  const handleTextAction = async (action: string) => {
    if (!selectionMenu.selectedText || isTransforming) return

    setIsTransforming(true)

    try {
      const transformed = await transformText(selectionMenu.selectedText, action)

      // Remplacer précisément le texte sélectionné
      const newContent =
        content.substring(0, selectionMenu.startOffset) +
        transformed +
        content.substring(selectionMenu.endOffset)

      setContent(newContent)

      // Fermer le menu et désélectionner
      setSelectionMenu({
        show: false,
        position: { top: 0, left: 0 },
        selectedText: "",
        startOffset: 0,
        endOffset: 0,
      })

      // Repositionner le curseur après le texte transformé
      if (textareaRef.current) {
        const newCursorPos = selectionMenu.startOffset + transformed.length
        textareaRef.current.focus()
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos)
      }
    } catch (error: any) {
      console.error("Erreur transformation:", error)
      alert(error.message || "Une erreur est survenue lors de la transformation")
    } finally {
      setIsTransforming(false)
    }
  }

  const handleGenerateCollection = async () => {
    if (!content || content.trim().length < 50) {
      toast.error("Votre note est trop courte pour générer des fiches (min. 50 caractères).")
      return
    }

    setIsGenerating(true)

    // 1. Déclencher le toast visuel
    triggerGenerationToast(() => {
      // Callback appelée quand l'animation du toast est finie (succès)
      router.push("/flashcards")
    })

    try {
      // 2. Appeler l'API pour lancer le job
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: content,
          mode: "subject",
          metadata: {
            noteId: noteId,
            title: title || "Sans titre"
          }
        })
      })

      if (!res.ok) {
        throw new Error("Erreur lors du lancement de la génération")
      }

      // Le toast gère la redirection à la fin de son animation

    } catch (error) {
      console.error("Erreur génération:", error)
      toast.error("Impossible de lancer la génération. Réessayez.")
      setIsGenerating(false)
    }
  }

  // États de chargement et d'erreur
  // ⚡ Ne pas bloquer si la note n'existe pas encore (création au premier edit)
  if (isLoading && noteId) {
    return (
      <div className="flex h-screen bg-background items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground font-medium">Chargement de la note...</p>
        </div>
      </div>
    )
  }

  // Si erreur (autre que 404 qui est géré par useNote), afficher l'erreur
  if (error && !error.message?.includes("404")) {
    return (
      <div className="flex h-screen bg-background items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4 font-medium">Erreur lors du chargement</p>
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

  // ⚡ Si pas de note, continuer quand même (création au premier edit)
  // note peut être null ou une note vide pour les nouvelles notes

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />

      {/* Éditeur principal */}
      <MainContent className="flex flex-col relative">
        {/* Toolbar flottante minimaliste */}
        <div className="absolute top-6 left-6 right-6 z-40 flex justify-center pointer-events-none">
          <div className="bg-background/60 backdrop-blur-xl border border-border/40 rounded-full px-6 py-2 shadow-sm flex items-center gap-6 pointer-events-auto transition-all hover:bg-background/80 hover:shadow-md hover:border-border/60">
            <button
              onClick={() => router.push("/dashboard")}
              className="text-muted-foreground hover:text-foreground transition-colors duration-200 flex items-center gap-2 text-sm font-medium"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Retour</span>
            </button>

            <div className="w-px h-4 bg-border/60" />

            {/* Indicateur de sauvegarde optimisé */}
            <SaveStatusIndicator status={saveStatus} />

            <div className="w-px h-4 bg-border/60" />

            {/* ✨ NOUVEAU BOUTON D'ACTION PRINCIPAL */}
            <button
              onClick={handleGenerateCollection}
              disabled={isGenerating || !content.trim()}
              className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-1.5 rounded-full text-sm font-medium transition-all shadow-sm hover:shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              <span>Générer Fiches & Quiz</span>
            </button>
          </div>
        </div>

        {/* Zone d'édition */}
        <div className="flex-1 overflow-y-auto px-10 pt-28 pb-10 bg-background">
          <div className="max-w-4xl mx-auto">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titre de la note"
              className="text-5xl font-bold w-full bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground mb-8 tracking-tight"
            />

            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Commencez à écrire..."
              className="w-full min-h-[600px] text-lg bg-transparent border-none outline-none resize-none text-foreground placeholder:text-muted-foreground leading-relaxed"
              data-notion-menu
            />
          </div>
        </div>
      </MainContent>

      {/* Menu contextuel style Notion */}
      {selectionMenu.show && (
        <div data-notion-menu>
          <NotionStyleMenu
            position={selectionMenu.position}
            selectedText={selectionMenu.selectedText}
            onAction={handleTextAction}
            isLoading={isTransforming}
          />
        </div>
      )}

      {/* Chatbot flottant global avec contexte */}
      <ChatButton
        noteId={noteId}
        noteTitle={note?.title || title}  // Utiliser la note chargée en priorité
        noteContent={note?.content || content}  // Utiliser la note chargée en priorité
      />
    </div>
  )
}
