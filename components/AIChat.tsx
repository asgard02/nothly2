"use client"

import { useState, useRef, useEffect } from "react"
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
      inputRef.current?.focus()
    }
  }, [isOpen])

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

  // 3. Vérifier le support de la reconnaissance vocale au montage
  useEffect(() => {
    // Vérifier si l'API est supportée
    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition
    
    if (SpeechRecognition) {
      setSpeechSupported(true)
      const recognition = new SpeechRecognition()
      recognition.continuous = true // Continuer après une pause
      recognition.interimResults = true // Afficher les résultats en temps réel
      recognition.lang = 'fr-FR' // Langue française
      ;(recognition as any).maxAlternatives = 1
      
      recognition.onstart = () => {
        setIsListening(true)
        userStoppedRef.current = false
        console.log("[Speech] 🎤 Enregistrement démarré")
      }
      
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interimTranscript = ''
        let finalTranscript = ''
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' '
          } else {
            interimTranscript += transcript
          }
        }
        
        // Mettre à jour le champ de saisie avec la transcription
        if (finalTranscript) {
          setInputValue(prev => {
            const trimmedPrev = prev.trimEnd()
            return (trimmedPrev ? trimmedPrev + " " : "") + finalTranscript.trim()
          })
        } else if (interimTranscript) {
          // Afficher la transcription temporaire (optionnel)
          // setInputValue(prev => prev + interimTranscript)
        }
      }
      
      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error("[Speech] ❌ Erreur:", event.error)
        
        let errorMessage = ''
        let shouldRetry = false
        let shouldStop = true
        
        switch (event.error) {
          case 'no-speech':
            // Pas de parole détectée, c'est normal - ne pas afficher d'erreur
            setSpeechError(null)
            return
          case 'not-allowed':
            errorMessage = 'Permission microphone refusée. Activez-la dans les paramètres du navigateur.'
            break
          case 'network':
            // Erreur réseau - essayer de réessayer automatiquement (max 2 fois)
            if (retryCountRef.current < 2) {
              retryCountRef.current++
              console.log(`[Speech] 🔄 Nouvelle tentative ${retryCountRef.current}/2...`)
              shouldRetry = true
              setTimeout(() => {
                if (recognitionRef.current) {
                  try {
                    recognitionRef.current.start()
                  } catch (e) {
                    console.error("[Speech] Erreur retry:", e)
                  }
                }
              }, 2000) // Augmenter le délai à 2 secondes
              return
            } else {
              errorMessage = 'Erreur réseau : Impossible de se connecter aux serveurs de reconnaissance vocale. Vérifiez votre connexion Internet et réessayez. Si le problème persiste, les serveurs Google peuvent être temporairement indisponibles.'
              retryCountRef.current = 0
            }
            break
          case 'aborted':
            // L'utilisateur a arrêté manuellement, c'est normal
            setSpeechError(null)
            shouldStop = false
            return
          case 'audio-capture':
            errorMessage = 'Aucun microphone détecté. Vérifiez que votre microphone est connecté.'
            break
          case 'service-not-allowed':
            errorMessage = 'Service de reconnaissance vocale non autorisé. Vérifiez les paramètres du navigateur.'
            break
          default:
            errorMessage = `Erreur de reconnaissance vocale: ${event.error}`
            shouldStop = false
            break
        }
        
        if (shouldStop) {
          setIsListening(false)
        }
        
        // Afficher l'erreur dans l'UI
        if (errorMessage) {
          console.error("[Speech]", errorMessage)
          setSpeechError(errorMessage)
          // Effacer l'erreur après 5 secondes
          setTimeout(() => {
            setSpeechError(null)
          }, 5000)
        }
      }
      
      recognition.onend = () => {
        setIsListening(false)
        console.log("[Speech] 🎤 Enregistrement terminé")
        if (!userStoppedRef.current && recognitionRef.current) {
          setTimeout(() => {
            try {
              recognitionRef.current?.start()
            } catch (error) {
              console.error("[Speech] Erreur redémarrage:", error)
            }
          }, 300)
        }
      }
      
      recognitionRef.current = recognition
    } else {
      setSpeechSupported(false)
      console.warn("[Speech] ⚠️ Reconnaissance vocale non supportée par ce navigateur")
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [])

  // 4. Fonction pour démarrer/arrêter l'enregistrement
  const toggleListening = () => {
    if (!recognitionRef.current) {
      setSpeechError('Reconnaissance vocale non disponible sur ce navigateur.')
      return
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
          setSpeechError('Pas de connexion Internet. La reconnaissance vocale nécessite une connexion active.')
          return
        }
        
        // Vérifier si on est en HTTPS ou localhost (requis pour l'API)
        const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        if (!isSecure) {
          setSpeechError('La reconnaissance vocale nécessite HTTPS ou localhost.')
          return
        }
        
        // Vérifier que le navigateur supporte l'API
        if (!('SpeechRecognition' in window) && !('webkitSpeechRecognition' in window)) {
          setSpeechError('Votre navigateur ne supporte pas la reconnaissance vocale. Utilisez Chrome, Edge ou Safari.')
          return
        }
        
        retryCountRef.current = 0
        setSpeechError(null)
        userStoppedRef.current = false
        console.log("[Speech] 🎤 Démarrage de la reconnaissance vocale...")
        recognitionRef.current.start()
      } catch (error: any) {
        console.error("[Speech] Erreur démarrage:", error)
        setIsListening(false)
        
        // Gérer les erreurs spécifiques
        if (error.name === 'InvalidStateError') {
          // La reconnaissance est déjà en cours
          console.log("[Speech] Reconnaissance déjà en cours")
        } else {
          setSpeechError(`Impossible de démarrer l'enregistrement: ${error.message || 'Erreur inconnue'}`)
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
      
      console.log("[AIChat] Réponse reçue:", response)
      console.log("[AIChat] Action:", response.action)
      console.log("[AIChat] Contexte:", context)
      
      // response peut être soit un string (ancien format) soit un objet (nouveau format)
      let aiReply: string
      let action: { type: string; route?: string; content?: string; title?: string; noteId?: string } = { type: "none" }
      
      if (typeof response === "string") {
        aiReply = response
      } else {
        aiReply = response.reply || String(response)
        action = response.action || { type: "none" }
      }

      console.log("[AIChat] Action après traitement:", action)

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
        console.log("[AIChat] ✅ Action: add_to_note détectée")
        console.log("[AIChat] �� Note ID:", context.noteId)
        console.log("[AIChat] 📄 Contenu actuel:", noteState.content?.substring(0, 100) || "(vide)")
        console.log("[AIChat] ➕ Nouveau contenu à ajouter:", action.content.substring(0, 100))
        
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
        console.log("[AIChat] Action: create_note_with_content", action.title, action.content.substring(0, 100))
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
            
            console.log("[AIChat] Note créée:", newNote.id, newNote.title)
            
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
              console.log("[AIChat] Navigation vers:", `/note/${newNote.id}`)
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
      } else {
        console.log("[AIChat] Aucune action à exécuter, type:", action.type)
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

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (!isOpen) return null

  return (
    <>
      {/* Overlay semi-transparent */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Panneau de chat */}
      <div className="fixed bottom-20 right-6 w-96 h-[600px] bg-white dark:bg-background rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden border border-gray-200 dark:border-border animate-in slide-in-from-bottom-5 duration-300">
        {/* Header */}
        <div className="bg-gradient-to-r from-nothly-blue to-nothly-violet text-white p-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 backdrop-blur-sm p-2 rounded-full">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base">Assistant IA</h3>
              <p className="text-xs text-purple-100">En ligne</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="hover:bg-white/20 p-1.5 rounded-lg transition-colors"
            aria-label="Fermer le chat"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-background">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.sender === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                  message.sender === "user"
                    ? "bg-gradient-to-r from-nothly-blue to-nothly-violet text-white rounded-br-sm"
                    : "bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-sm dark:bg-card dark:text-foreground dark:border-border"
                }`}
              >
                {message.sender === "ai" ? (
                  <MarkdownMessage content={message.text} />
                ) : (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                    {message.text}
                  </p>
                )}
                <p
                  className={`text-xs mt-1.5 ${
                    message.sender === "user"
                      ? "text-purple-100"
                      : "text-gray-400 dark:text-muted-foreground"
                  }`}
                >
                  {formatTime(message.timestamp)}
                </p>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-card rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm border border-gray-100 dark:border-border">
                <div className="flex items-center gap-2 text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">L'IA réfléchit...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-200 dark:border-border p-4 bg-white dark:bg-card flex-shrink-0">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Posez une question..."
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-50 dark:disabled:bg-muted disabled:cursor-not-allowed text-sm bg-white dark:bg-background text-foreground"
            />
            
            {/* Bouton Microphone */}
            {speechSupported && (
            <button
                onClick={toggleListening}
                disabled={isLoading}
                className={`p-2.5 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 ${
                  isListening
                    ? "bg-red-500 text-white shadow-lg shadow-red-500/50 ring-2 ring-red-300 ring-offset-2"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
                title={isListening ? "Arrêter l'enregistrement (clic)" : "Parler (reconnaissance vocale)"}
                aria-label={isListening ? "Arrêter l'enregistrement" : "Démarrer la reconnaissance vocale"}
              >
                {isListening ? (
                  <div className="relative">
                    <Mic className="h-5 w-5 animate-pulse" />
                    {/* Point rouge animé pour indiquer l'enregistrement */}
                    <span className="absolute -top-1 -right-1 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                    </span>
                  </div>
                ) : (
                  <Mic className="h-5 w-5" />
                )}
              </button>
            )}
            
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading}
              className="bg-gradient-to-r from-nothly-blue to-nothly-violet text-white p-2.5 rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none flex-shrink-0"
              aria-label="Envoyer le message"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>

          {isListening && (
            <div className="mt-3 mb-2 rounded-2xl border border-red-200/80 bg-red-50/80 px-4 py-3 dark:border-red-500/40 dark:bg-red-500/10">
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

