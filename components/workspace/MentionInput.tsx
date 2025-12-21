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
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#BAE6FD] text-black border-2 border-black text-sm font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
        >
          <FileText className="h-3 w-3" strokeWidth={2.5} />
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
      <div className="relative flex items-end gap-2 p-3 rounded-3xl border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all duration-300 group focus-within:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] focus-within:-translate-y-0.5">

        {/* Bouton Plus (Menu) */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className={cn(
              "flex-shrink-0 w-10 h-10 rounded-xl border-2 flex items-center justify-center transition-all duration-200",
              showMenu
                ? "bg-black text-white border-black shadow-[2px_2px_0px_0px_#8B5CF6]"
                : "bg-white text-black border-transparent hover:border-black hover:bg-gray-100 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            )}
            title="Options"
          >
            <Plus className={cn("h-5 w-5 transition-transform duration-200", showMenu && "rotate-45")} strokeWidth={2.5} />
          </button>

          <AnimatePresence>
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute bottom-full left-0 mb-4 w-64 bg-white border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-50 overflow-hidden"
              >
                <div className="p-2 space-y-1">
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
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all border-2 border-transparent hover:border-black hover:bg-[#BAE6FD] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  >
                    <div className="p-2 rounded-lg bg-black text-white">
                      <AtSign className="h-4 w-4" strokeWidth={2.5} />
                    </div>
                    <div>
                      <div className="font-bold text-sm uppercase text-black">{t("mentionDocument")}</div>
                      <div className="text-xs text-gray-500 font-medium">{t("addReference")}</div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setShowMenu(false)
                      onUpload?.()
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all border-2 border-transparent hover:border-black hover:bg-[#BBF7D0] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                  >
                    <div className="p-2 rounded-lg bg-gray-100 text-black border-2 border-black">
                      <Plus className="h-4 w-4" strokeWidth={2.5} />
                    </div>
                    <div>
                      <div className="font-bold text-sm uppercase text-black">{t("addFile")}</div>
                      <div className="text-xs text-gray-500 font-medium">{t("fileTypes")}</div>
                    </div>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex-1 relative pt-2 pb-2">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || t("placeholder")}
            disabled={disabled}
            rows={1}
            className="w-full px-2 py-0 bg-transparent border-0 resize-none focus:outline-none focus:ring-0 placeholder:text-gray-400 placeholder:font-bold text-black font-bold max-h-[60vh] overflow-y-auto min-h-[24px]"
            style={{ height: "auto" }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement
              target.style.height = "auto"
              target.style.height = target.scrollHeight + "px"
            }}
          />
        </div>

        {/* Boutons Droite (Mic + Send) */}
        <div className="flex items-center gap-2">
          <button
            className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 hover:text-black hover:bg-gray-100 hover:border-2 hover:border-black transition-all"
            title={t("voiceDictation")}
          >
            <Mic className="h-5 w-5" strokeWidth={2.5} />
          </button>

          <button
            onClick={onSend}
            disabled={!value.trim() || disabled || isLoading}
            className={cn(
              "flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 border-2 border-black",
              value.trim()
                ? "bg-[#8B5CF6] text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[1px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-[2px] active:shadow-none"
                : "bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed"
            )}
          >
            {isLoading ? (
              <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="h-4 w-4 ml-0.5" strokeWidth={3} />
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
              className="absolute bottom-full left-0 mb-4 w-full bg-white border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-50 max-h-64 overflow-y-auto overflow-hidden"
            >
              <div className="p-2">
                <div className="text-xs font-black uppercase text-gray-400 px-3 py-2">
                  {t("availableDocuments")}
                </div>
                {filteredDocuments.map((doc, index) => (
                  <button
                    key={doc.id}
                    onClick={() => insertMention(doc)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all border-2",
                      index === selectedMentionIndex
                        ? "bg-black text-white border-black shadow-[2px_2px_0px_0px_#BAE6FD]"
                        : "border-transparent hover:border-black hover:bg-[#BAE6FD] hover:text-black hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                    )}
                  >
                    <FileText className={cn("h-4 w-4 shrink-0", index === selectedMentionIndex ? "text-[#BAE6FD]" : "text-current")} strokeWidth={2.5} />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold truncate text-sm uppercase">{doc.title}</div>
                      {doc.filename && (
                        <div className="text-xs truncate opacity-70 font-medium">
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

