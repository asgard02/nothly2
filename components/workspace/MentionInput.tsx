"use client"

import { useState, useRef, useEffect, useMemo, useCallback } from "react"
import { FileText, X, Send, Plus, Mic, AtSign } from "lucide-react"


import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { useTranslations } from "next-intl"

export interface MentionableDocument {
  id: string
  title: string
  filename?: string
}

interface MentionInputProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  onUpload?: () => void
  placeholder?: string
  disabled?: boolean
  isLoading?: boolean
  documents: MentionableDocument[]
  className?: string
}

interface Mention {
  id: string
  documentId: string
  documentTitle: string
  start: number
  end: number
}

export function MentionInput({
  value,
  onChange,
  onSend,
  onUpload,
  placeholder,
  disabled = false,
  isLoading = false,
  documents,
  className,
}: MentionInputProps) {
  const t = useTranslations("MentionInput")
  const [showMentions, setShowMentions] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [mentionQuery, setMentionQuery] = useState("")
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0)
  const [cursorPosition, setCursorPosition] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const mentionsListRef = useRef<HTMLDivElement>(null)

  // Extraire les mentions du texte (format: @nom du document)
  const mentions = useMemo<Mention[]>(() => {
    // Regex pour capturer @ suivi du nom du document jusqu'à un espace, une ponctuation ou la fin
    // On essaie de faire correspondre avec les noms de documents disponibles
    const regex = /@([^\s@]+(?:\s+[^\s@]+)*?)(?=\s|$|[,.;:!?])/g
    const matches: Mention[] = []
    let match

    while ((match = regex.exec(value)) !== null) {
      const documentTitle = match[1].trim()
      // Trouver le document correspondant par nom (correspondance exacte)
      const document = documents.find(doc => doc.title === documentTitle)

      if (document) {
        matches.push({
          id: document.id,
          documentId: document.id,
          documentTitle: documentTitle,
          start: match.index,
          end: match.index + match[0].length,
        })
      }
    }

    return matches
  }, [value, documents])

  // Filtrer les documents selon la requête
  const filteredDocuments = useMemo(() => {
    if (!mentionQuery) return documents.slice(0, 5)

    const query = mentionQuery.toLowerCase()
    return documents
      .filter((doc) =>
        doc.title.toLowerCase().includes(query) ||
        doc.filename?.toLowerCase().includes(query)
      )
      .slice(0, 5)
  }, [documents, mentionQuery])

  // Détecter quand l'utilisateur tape @
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    const cursorPos = e.target.selectionStart

    onChange(newValue)
    setCursorPosition(cursorPos)

    // Vérifier si on est en train de taper une mention
    const textBeforeCursor = newValue.substring(0, cursorPos)
    const lastAtIndex = textBeforeCursor.lastIndexOf("@")
    const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1)

    // Si on trouve @ et qu'il n'y a pas d'espace après
    if (lastAtIndex !== -1 && !textAfterAt.includes(" ") && !textAfterAt.includes("\n")) {
      setMentionQuery(textAfterAt)
      setShowMentions(true)
      setSelectedMentionIndex(0)
    } else {
      setShowMentions(false)
      setMentionQuery("")
    }
  }

  // Insérer une mention dans le texte (format: @nom du document)
  const insertMention = (document: MentionableDocument) => {
    if (!textareaRef.current) return

    const textBeforeCursor = value.substring(0, cursorPosition)
    const textAfterCursor = value.substring(cursorPosition)
    const lastAtIndex = textBeforeCursor.lastIndexOf("@")
    const textBeforeAt = value.substring(0, lastAtIndex)
    const textAfterAt = value.substring(cursorPosition)

    // N'afficher que le nom du document, sans l'ID
    const mentionText = `@${document.title}`
    const newValue = textBeforeAt + mentionText + " " + textAfterAt

    onChange(newValue)
    setShowMentions(false)
    setMentionQuery("")

    // Repositionner le curseur après la mention
    setTimeout(() => {
      const newCursorPos = textBeforeAt.length + mentionText.length + 1
      textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos)
      textareaRef.current?.focus()
    }, 0)
  }

  // Gérer les touches du clavier
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentions && filteredDocuments.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setSelectedMentionIndex((prev) =>
          prev < filteredDocuments.length - 1 ? prev + 1 : 0
        )
        return
      }
      if (e.key === "ArrowUp") {
        e.preventDefault()
        setSelectedMentionIndex((prev) =>
          prev > 0 ? prev - 1 : filteredDocuments.length - 1
        )
        return
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault()
        insertMention(filteredDocuments[selectedMentionIndex])
        return
      }
      if (e.key === "Escape") {
        setShowMentions(false)
        return
      }
    }

    // Envoyer avec Enter (sans Shift)
    if (e.key === "Enter" && !e.shiftKey && !showMentions) {
      e.preventDefault()
      if (value.trim()) {
        onSend()
      }
    }
  }

  // Rendre le texte avec les mentions stylisées
  const renderTextWithMentions = () => {
    if (!value) return null

    const parts: React.ReactNode[] = []
    let lastIndex = 0

    mentions.forEach((mention) => {
      // Texte avant la mention
      if (mention.start > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`}>
            {value.substring(lastIndex, mention.start)}
          </span>
        )
      }

      // La mention stylisée
      parts.push(
        <span
          key={`mention-${mention.id}`}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary text-sm font-medium"
        >
          <FileText className="h-3 w-3" />
          {mention.documentTitle}
        </span>
      )

      lastIndex = mention.end
    })

    // Texte après la dernière mention
    if (lastIndex < value.length) {
      parts.push(
        <span key={`text-${lastIndex}`}>
          {value.substring(lastIndex)}
        </span>
      )
    }

    return parts
  }

  // Extraire les IDs des documents mentionnés
  const getMentionedDocumentIds = useCallback((): string[] => {
    return mentions.map((m) => m.documentId)
  }, [mentions])

  // Exposer la fonction pour récupérer les mentions
  useEffect(() => {
    if (textareaRef.current) {
      ; (textareaRef.current as any).getMentionedDocumentIds = getMentionedDocumentIds
    }
  }, [getMentionedDocumentIds])

  // Ajuster la hauteur quand la valeur change (pour les insertions programmatiques)
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px"
    }
  }, [value])

  return (
    <div className={cn("relative w-full max-w-3xl mx-auto", className)}>
      <div className="relative flex items-center gap-2 p-2 rounded-[26px] border border-border/60 bg-background/80 backdrop-blur-xl shadow-lg hover:shadow-xl hover:border-border/80 transition-all duration-300">

        {/* Bouton Plus (Upload/Actions) */}
        {/* Bouton Mention (@) */}
        {/* Bouton Plus (Menu) */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className={cn(
              "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-colors",
              showMenu ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
            title="Options"
          >
            <Plus className={cn("h-5 w-5 transition-transform duration-200", showMenu && "rotate-45")} />
          </button>

          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute bottom-full left-0 mb-4 w-64 bg-popover border border-border rounded-2xl shadow-xl z-50 overflow-hidden"
              >
                <div className="p-1.5">
                  <button
                    onClick={() => {
                      setShowMenu(false)
                      const newValue = value + "@"
                      onChange(newValue)

                      // Manually trigger the mention logic
                      setTimeout(() => {
                        if (textareaRef.current) {
                          textareaRef.current.focus()
                          setCursorPosition(newValue.length)

                          // Only try to show mentions if there are documents
                          if (documents && documents.length > 0) {
                            setMentionQuery("")
                            setShowMentions(true)
                            setSelectedMentionIndex(0)
                          }
                        }
                      }, 0)
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-muted transition-colors"
                  >
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      <AtSign className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">{t("mentionDocument")}</div>
                      <div className="text-xs text-muted-foreground">{t("addReference")}</div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setShowMenu(false)
                      onUpload?.()
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-muted transition-colors"
                  >
                    <div className="p-2 rounded-lg bg-muted text-muted-foreground">
                      <Plus className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">{t("addFile")}</div>
                      <div className="text-xs text-muted-foreground">{t("fileTypes")}</div>
                    </div>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex-1 relative pt-3 pb-1">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || t("placeholder")}
            disabled={disabled}
            rows={1}
            className="w-full px-2 py-0 bg-transparent border-0 resize-none focus:outline-none focus:ring-0 placeholder:text-muted-foreground/60 max-h-[60vh] overflow-y-auto min-h-[24px]"
            style={{ height: "auto" }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement
              target.style.height = "auto"
              target.style.height = target.scrollHeight + "px"
            }}
          />
        </div>

        {/* Boutons Droite (Mic + Send) */}
        <div className="flex items-center gap-1">
          <button
            className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title={t("voiceDictation")}
          >
            <Mic className="h-5 w-5" />
          </button>

          <button
            onClick={onSend}
            disabled={!value.trim() || disabled || isLoading}
            className={cn(
              "flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200",
              value.trim()
                ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            {isLoading ? (
              <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="h-4 w-4 ml-0.5" />
            )}
          </button>
        </div>

        {/* Liste déroulante des mentions */}
        <AnimatePresence>
          {showMentions && filteredDocuments.length > 0 && (
            <motion.div
              ref={mentionsListRef}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute bottom-full left-0 mb-4 w-full bg-popover border border-border rounded-2xl shadow-xl z-50 max-h-64 overflow-y-auto overflow-hidden"
            >
              <div className="p-2">
                <div className="text-xs font-medium text-muted-foreground px-3 py-2">
                  {t("availableDocuments")}
                </div>
                {filteredDocuments.map((doc, index) => (
                  <button
                    key={doc.id}
                    onClick={() => insertMention(doc)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors",
                      index === selectedMentionIndex
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted"
                    )}
                  >
                    <FileText className="h-4 w-4 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate text-sm">{doc.title}</div>
                      {doc.filename && (
                        <div className="text-xs text-muted-foreground truncate opacity-70">
                          {doc.filename}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Aperçu des mentions (optionnel, pour debug) */}
      {mentions.length > 0 && (
        <div className="absolute top-full left-4 mt-2 flex flex-wrap gap-2 opacity-0 pointer-events-none">
          {mentions.map((mention) => (
            <span
              key={mention.id}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-sm"
            >
              <FileText className="h-3 w-3" />
              {mention.documentTitle}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// Fonction helper pour extraire les IDs des documents mentionnés
// Nécessite la liste des documents pour mapper les noms aux IDs
export function extractMentionedDocumentIds(text: string, documents: MentionableDocument[]): string[] {
  const regex = /@([^\s@]+(?:\s+[^\s@]+)*?)(?=\s|$|[,.;:!?])/g
  const ids: string[] = []
  let match

  while ((match = regex.exec(text)) !== null) {
    const documentTitle = match[1].trim()
    const document = documents.find(doc => doc.title === documentTitle)
    if (document) {
      ids.push(document.id)
    }
  }

  return [...new Set(ids)] // Supprimer les doublons
}

