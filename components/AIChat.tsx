"use client"

import { memo, useMemo, useState, useRef, useEffect } from "react"
import { X, Send, Bot, Loader2, Mic, MicOff } from "lucide-react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { sendChatMessage } from "@/lib/chat"
import MarkdownMessage from "@/components/MarkdownMessage"
import type { Note } from "@/lib/hooks/useNotes"

interface Message {
  id: string
  text: string
  sender: "user" | "ai"
  timestamp: Date
}

interface ChatContext {
  currentPage?: string
  noteId?: string
  noteTitle?: string
  noteContent?: string
}

interface AIChatProps {
  isOpen: boolean
  onClose: () => void
  context?: ChatContext
}

export default function AIChat({ isOpen, onClose, context }: AIChatProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isVisible, setIsVisible] = useState(isOpen)
  const [isAnimatingOut, setIsAnimatingOut] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      text: "Bonjour ! Je suis votre assistant IA. Comment puis-je vous aider avec vos notes ?",
      sender: "ai",
      timestamp: new Date(),
    },
  ])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // 1. Ajouter l'import de l'icône Microphone
  const [isListening, setIsListening] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)
  const [speechError, setSpeechError] = useState<string | null>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const speechInitializedRef = useRef(false)
  const userStoppedRef = useRef(false)
  const retryCountRef = useRef(0)

  const [noteState, setNoteState] = useState({
    title: context?.noteTitle || "",
    content: context?.noteContent || "",
  })

  useEffect(() => {
    setNoteState({
      title: context?.noteTitle || "",
      content: context?.noteContent || "",
    })
  }, [context?.noteId, context?.noteTitle, context?.noteContent])

  // Auto-scroll vers le bas quand de nouveaux messages arrivent
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Focus sur l'input quand le chat s'ouvre
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
      setIsAnimatingOut(false)
      inputRef.current?.focus()
    } else if (isVisible) {
      setIsAnimatingOut(true)
      const timeout = setTimeout(() => {
        setIsVisible(false)
        setIsAnimatingOut(false)
      }, 220)
      return () => clearTimeout(timeout)
    }
  }, [isOpen, isVisible])

  useEffect(() => {
    if (!isOpen || !isVisible) return

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (!panelRef.current) return
      const target = event.target as Node
      if (!panelRef.current.contains(target)) {
        onClose()
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("touchstart", handleClickOutside)

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("touchstart", handleClickOutside)
    }
  }, [isOpen, isVisible, onClose])

  // Fermer avec la touche Échap
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose()
      }
    }
    window.addEventListener("keydown", handleEscape)
    return () => window.removeEventListener("keydown", handleEscape)
  }, [isOpen, onClose])

  const initializeSpeechRecognition = () => {
    if (speechInitializedRef.current) {
      return recognitionRef.current
    }
    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      setSpeechSupported(false)
      return null
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = "fr-FR"
    ;(recognition as any).maxAlternatives = 1

    recognition.onstart = () => {
      setIsListening(true)
      userStoppedRef.current = false
    }

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = ""

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript + " "
        }
      }

      if (finalTranscript) {
        setInputValue((prev) => {
          const trimmedPrev = prev.trimEnd()
          return (trimmedPrev ? trimmedPrev + " " : "") + finalTranscript.trim()
        })
      }
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      let errorMessage = ""
      let shouldStop = true

      switch (event.error) {
        case "no-speech":
          setSpeechError(null)
          return
        case "not-allowed":
          errorMessage = "Permission microphone refusée. Activez-la dans les paramètres du navigateur."
          break
        case "network":
          if (retryCountRef.current < 2) {
            retryCountRef.current++
            shouldStop = false
            setTimeout(() => {
              recognitionRef.current?.start()
            }, 2000)
            return
          } else {
            errorMessage =
              "Erreur réseau : Impossible de se connecter aux serveurs de reconnaissance vocale. Vérifiez votre connexion Internet et réessayez."
            retryCountRef.current = 0
          }
          break
        case "aborted":
          setSpeechError(null)
          shouldStop = false
          return
        case "audio-capture":
          errorMessage = "Aucun microphone détecté. Vérifiez que votre microphone est connecté."
          break
        case "service-not-allowed":
          errorMessage = "Service de reconnaissance vocale non autorisé. Vérifiez les paramètres du navigateur."
          break
        default:
          errorMessage = `Erreur de reconnaissance vocale: ${event.error}`
          shouldStop = false
          break
      }

      if (shouldStop) {
        setIsListening(false)
      }

      if (errorMessage) {
        setSpeechError(errorMessage)
        setTimeout(() => {
          setSpeechError(null)
        }, 5000)
      }
    }

    recognition.onend = () => {
      setIsListening(false)
      if (!userStoppedRef.current) {
        setTimeout(() => {
          try {
            recognitionRef.current?.start()
          } catch {
            // ignore
          }
        }, 300)
      }
    }

    recognitionRef.current = recognition
    speechInitializedRef.current = true
    setSpeechSupported(true)
    return recognition
  }

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop()
    }
  }, [])

  // 4. Fonction pour démarrer/arrêter l'enregistrement
  const toggleListening = () => {
    if (!recognitionRef.current) {
      const recognition = initializeSpeechRecognition()
      if (!recognition) {
        setSpeechError("Reconnaissance vocale non disponible sur ce navigateur.")
        return
      }
      recognitionRef.current = recognition
    }
    
    if (isListening) {
      userStoppedRef.current = true
      recognitionRef.current.stop()
      setIsListening(false)
      setSpeechError(null)
      retryCountRef.current = 0
    } else {
      try {
        // Vérifier la connexion Internet
        if (!navigator.onLine) {
          setSpeechError("Pas de connexion Internet. La reconnaissance vocale nécessite une connexion active.")
          return
        }
        
        // Vérifier si on est en HTTPS ou localhost (requis pour l'API)
        const isSecure =
          window.location.protocol === "https:" ||
          window.location.hostname === "localhost" ||
          window.location.hostname === "127.0.0.1"
        if (!isSecure) {
          setSpeechError("La reconnaissance vocale nécessite HTTPS ou localhost.")
          return
        }
        
        // Vérifier que le navigateur supporte l'API
        if (!("SpeechRecognition" in window) && !("webkitSpeechRecognition" in window)) {
          setSpeechError("Votre navigateur ne supporte pas la reconnaissance vocale. Utilisez Chrome, Edge ou Safari.")
          return
        }
        
        retryCountRef.current = 0
        setSpeechError(null)
        userStoppedRef.current = false
        recognitionRef.current.start()
      } catch (error: any) {
        setIsListening(false)
        
        // Gérer les erreurs spécifiques
        if (error.name === "InvalidStateError") {
          // La reconnaissance est déjà en cours
        } else {
          setSpeechError(`Impossible de démarrer l'enregistrement: ${error.message || "Erreur inconnue"}`)
        }
      }
    }
  }

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: "user",
      timestamp: new Date(),
    }

    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInputValue("")
    setIsLoading(true)

    try {
      const apiMessages = newMessages
        .filter(m => m.id !== "welcome")
        .map(m => ({
          role: m.sender === "user" ? "user" : "assistant",
          content: m.text,
        }))

      // Passer le contexte à sendChatMessage
      const response = await sendChatMessage(apiMessages, context || undefined)
      
      // response peut être soit un string (ancien format) soit un objet (nouveau format)
      let aiReply: string
      let action: { type: string; route?: string; content?: string; title?: string; noteId?: string } = { type: "none" }
      
      if (typeof response === "string") {
        aiReply = response
      } else {
        aiReply = response.reply || String(response)
        action = response.action || { type: "none" }
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: aiReply,
        sender: "ai",
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, aiMessage])

      // 🎯 EXÉCUTER LES ACTIONS
      if (action.type === "navigate" && action.route) {
        // Navigation simple
        setTimeout(() => {
          router.push(action.route!)
          onClose()
        }, 500)
      } else if (action.type === "add_to_note" && action.content && context?.noteId) {
        // Ajouter du contenu à la note actuelle
        try {
          let updatedTitle = action.title?.trim()
          const trimmedActionContent = action.content?.trim()

          if (!updatedTitle && trimmedActionContent) {
            const derivedLines = trimmedActionContent
              .split('\n')
              .map(line => line.trim())
              .filter(Boolean)

            if (derivedLines.length === 1) {
              updatedTitle = derivedLines[0]
            }
          }

          if (!updatedTitle) {
            updatedTitle = noteState.title || context.noteTitle || "Nouvelle note"
          }

          const currentContent = noteState.content || ""
          const trimmedUpdatedTitle = updatedTitle.toLowerCase().trim()
          const shouldAppendContent = Boolean(
            trimmedActionContent &&
            trimmedActionContent.toLowerCase() !== trimmedUpdatedTitle
          )

          const newContent = shouldAppendContent
            ? (currentContent
                ? `${currentContent}\n\n${action.content}`
                : action.content)
            : currentContent

          if (!shouldAppendContent) {
            console.log("[AIChat] ✏️ Aucun contenu ajouté, mise à jour du titre uniquement")
          }

          console.log("[AIChat] 🔄 Envoi PATCH vers:", `/api/notes/${context.noteId}`)
          console.log("[AIChat] 📦 Body:", { 
            title: updatedTitle,
            contentLength: newContent.length 
          })

          const res = await fetch(`/api/notes/${context.noteId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: updatedTitle,
              content: newContent,
            }),
          })

          console.log("[AIChat] 📡 Réponse PATCH:", res.status, res.statusText)

          if (res.ok) {
            const updatedNote = await res.json()
            console.log("[AIChat] ✅ Note mise à jour avec succès:", updatedNote.id)
            console.log("[AIChat] 📄 Nouveau contenu (premiers 200 chars):", updatedNote.content?.substring(0, 200))

            setNoteState({
              title: updatedTitle,
              content: newContent,
            })
            
            // Mettre à jour le cache React Query
            queryClient.setQueryData(["note", context.noteId], updatedNote)
            queryClient.invalidateQueries({ queryKey: ["note", context.noteId] })
            queryClient.invalidateQueries({ queryKey: ["notes"] })
            
            // Optionnel : rafraîchir la page après un court délai pour laisser le temps au cache de se mettre à jour
            setTimeout(() => {
              router.refresh()
            }, 500)
          } else {
            const errorText = await res.text()
            console.error("[AIChat] ❌ Erreur PATCH:", res.status, errorText)
          }
        } catch (error) {
          console.error("[AIChat] ❌ Exception lors de l'ajout:", error)
        }
      } else if (action.type === "create_note_with_content" && action.title && action.content) {
        // Créer une nouvelle note avec contenu
        try {
          const res = await fetch("/api/notes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: action.title,
              content: action.content,
            }),
          })

          if (res.ok) {
            const newNote = await res.json()
            
            // 🔥 METTRE LA NOTE DANS LE CACHE AVANT DE NAVIGUER
            queryClient.setQueryData<Note>(["note", newNote.id], newNote)
            
            // Ajouter aussi à la liste des notes dans le cache
            queryClient.setQueryData<Note[]>(["notes"], (old = []) => {
              // Vérifier si la note n'existe pas déjà
              const exists = old.some(n => n.id === newNote.id)
              if (exists) {
                // Si elle existe, la mettre à jour
                return old.map(n => n.id === newNote.id ? newNote : n)
              }
              // Sinon, l'ajouter au début
              return [newNote, ...old]
            })
            
            // Invalider pour s'assurer que tout est synchronisé
            // Mais attendre un peu pour que la base de données soit à jour
            setTimeout(() => {
              queryClient.invalidateQueries({ queryKey: ["notes"] })
            }, 1000)
            
            // Naviguer vers la note (le cache est prêt, donc elle s'affichera immédiatement)
            setTimeout(() => {
              router.push(`/note/${newNote.id}`)
              onClose()
            }, 500)
          } else {
            const errorText = await res.text()
            console.error("[AIChat] Erreur création note:", res.status, errorText)
          }
        } catch (error) {
          console.error("[AIChat] Erreur création note:", error)
        }
      }
    } catch (error: any) {
      console.error("Erreur chat IA:", error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: error.message.includes("Non authentifié") 
          ? "⚠️ Vous devez être connecté pour utiliser le chat IA."
          : "⚠️ Erreur de communication avec l'IA. Vérifiez votre clé API OpenAI.",
        sender: "ai",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const formatTime = (date: Date) =>
    date.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    })

  const renderedMessages = useMemo(
    () =>
      messages.map((message) => (
        <div
          key={message.id}
          className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`max-w-[85%] rounded-2xl px-5 py-3 shadow-sm transition-all duration-200 ${
              message.sender === "user"
                ? "bg-primary text-primary-foreground rounded-tr-sm hover:shadow-md"
                : "bg-muted/50 backdrop-blur-sm border border-border/50 text-foreground rounded-tl-sm hover:bg-muted/70"
            }`}
          >
            {message.sender === "ai" ? (
              <MemoMarkdownMessage content={message.text} />
            ) : (
              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.text}</p>
            )}
            <p
              className={`text-[10px] mt-1.5 font-medium opacity-70 ${
                message.sender === "user"
                  ? "text-primary-foreground/80"
                  : "text-muted-foreground"
              }`}
            >
              {formatTime(message.timestamp)}
            </p>
          </div>
        </div>
      )),
    [messages]
  )

  if (!isVisible) return null

  return (
    <>
      {/* Overlay semi-transparent */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ease-out ${
          isOpen && !isAnimatingOut ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Panneau de chat */}
      <div
        ref={panelRef}
        className={`fixed bottom-24 right-6 z-50 flex h-[600px] w-96 flex-col overflow-hidden rounded-3xl border border-white/20 bg-background/80 backdrop-blur-2xl shadow-2xl will-change-transform transition-all duration-300 cubic-bezier(0.16, 1, 0.3, 1) ${
          isOpen && !isAnimatingOut
            ? "translate-y-0 opacity-100 scale-100"
            : "translate-y-10 opacity-0 scale-95 pointer-events-none"
        }`}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 border-b border-border/40 p-4 flex items-center justify-between flex-shrink-0 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2.5 rounded-2xl ring-1 ring-white/10 shadow-sm">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-foreground tracking-tight">Assistant IA</h3>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                En ligne
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="hover:bg-muted/50 p-2 rounded-xl transition-colors text-muted-foreground hover:text-foreground"
            aria-label="Fermer le chat"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-transparent scrollbar-none">
          {renderedMessages}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted/50 backdrop-blur-md rounded-2xl rounded-tl-none px-4 py-3 shadow-sm border border-white/5">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm font-medium">L'IA réfléchit...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 bg-background/40 backdrop-blur-xl border-t border-border/40 flex-shrink-0">
          <div className="flex gap-2 items-end bg-muted/30 rounded-2xl border border-border/40 p-1.5 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/30 transition-all">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Posez une question..."
              disabled={isLoading}
              className="flex-1 px-3 py-2.5 bg-transparent border-none focus:outline-none text-sm text-foreground placeholder:text-muted-foreground min-h-[44px]"
            />
            
            {/* Bouton Microphone */}
            {speechSupported && (
            <button
                onClick={toggleListening}
                disabled={isLoading}
                className={`p-2.5 rounded-xl transition-all duration-200 disabled:opacity-50 flex-shrink-0 ${
                  isListening
                    ? "bg-red-500 text-white shadow-lg shadow-red-500/25 animate-pulse"
                    : "text-muted-foreground hover:bg-background hover:text-foreground hover:shadow-sm"
                }`}
                title={isListening ? "Arrêter l'enregistrement (clic)" : "Parler (reconnaissance vocale)"}
                aria-label={isListening ? "Arrêter l'enregistrement" : "Démarrer la reconnaissance vocale"}
              >
                <Mic className="h-5 w-5" />
              </button>
            )}
            
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading}
              className="bg-primary text-primary-foreground p-2.5 rounded-xl hover:shadow-lg hover:shadow-primary/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none flex-shrink-0 active:scale-95"
              aria-label="Envoyer le message"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>

          {isListening && (
            <div className="mt-3 mb-1 rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-red-500 text-white shadow-inner shadow-red-300">
                  <Mic className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-red-600 dark:text-red-300">
                    Dictée vocale en cours
                  </p>
                  <p className="text-xs text-red-500/80 dark:text-red-200/70">
                    Parlez librement, cliquez sur le micro pour terminer
                  </p>
                </div>
              </div>
              <div className="mt-3 flex h-10 items-center">
                <div className="voice-wave">
                  {Array.from({ length: 36 }).map((_, index) => (
                    <span
                      key={index}
                      style={{ animationDelay: `${index * 0.05}s` }}
                    />
                  ))}
                </div>
              </div>
              <div className="mt-2 flex items-center justify-center gap-1.5 text-xs font-medium text-red-500 dark:text-red-300">
                <span>Analyse vocale en cours</span>
                <span className="voice-dot" />
                <span className="voice-dot" style={{ animationDelay: "0.18s" }} />
                <span className="voice-dot" style={{ animationDelay: "0.36s" }} />
              </div>
            </div>
          )}

          {speechError && (
            <p className="text-xs text-red-500 dark:text-red-400 mt-2 text-center font-medium">
              ⚠️ {speechError}
            </p>
          )}
          <p className="text-xs text-gray-400 dark:text-muted-foreground mt-2 text-center">
            {isListening ? (
              <span className="flex items-center justify-center gap-2 text-red-500 font-medium">
                <span className="flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
                Enregistrement en cours... Parlez maintenant
              </span>
            ) : (
              <>
                Appuyez sur Entrée pour envoyer
                {speechSupported && (
                  <span className="ml-2 text-gray-500">• Cliquez sur le micro pour parler</span>
                )}
              </>
            )}
          </p>
        </div>
      </div>
    <style jsx>{`
      @keyframes voiceWave {
        0%, 100% {
          transform: scaleY(0.35) translateY(0);
          opacity: 0.35;
        }
        50% {
          transform: scaleY(1) translateY(-2px);
          opacity: 1;
        }
      }

      .voice-wave {
        display: flex;
        align-items: center;
        gap: 2px;
        width: 100%;
        padding: 0 12px;
      }

      .voice-wave span {
        display: block;
        width: 3px;
        height: 100%;
        background: linear-gradient(180deg, rgba(239,68,68,0.95), rgba(248,113,113,0.4));
        border-radius: 999px;
        animation: voiceWave 1.1s ease-in-out infinite;
        transform-origin: center;
      }

      @keyframes voiceBounce {
        0%, 100% {
          transform: translateY(1px);
          opacity: 0.4;
        }
        50% {
          transform: translateY(-4px);
          opacity: 1;
        }
      }

      .voice-dot {
        display: inline-flex;
        height: 10px;
        width: 10px;
        border-radius: 999px;
        background: rgba(239, 68, 68, 0.95);
        animation: voiceBounce 0.9s ease-in-out infinite;
      }
    `}</style>
    </>
  )
}

interface MarkdownProps {
  content: string
}

const MemoMarkdownMessage = memo(function MemoMarkdownMessage({ content }: MarkdownProps) {
  return <MarkdownMessage content={content} />
})

