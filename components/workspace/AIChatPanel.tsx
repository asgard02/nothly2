"use client"

import { memo, useMemo, useState, useRef, useEffect } from "react"
import { Send, Loader2, Mic, Paperclip, Sparkles } from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"
import { sendChatMessage } from "@/lib/chat"
import MarkdownMessage from "@/components/MarkdownMessage"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import Logo from "@/components/Logo"

interface Message {
  id: string
  text: string
  sender: "user" | "ai"
  timestamp: Date
}

interface AIChatPanelProps {
  onOpenDocument?: (doc: any) => void
  onGenerateQuiz?: (quiz: any) => void
}

export function AIChatPanel({ onOpenDocument, onGenerateQuiz }: AIChatPanelProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      text: "Bonjour. Je suis prêt à analyser vos documents.",
      sender: "ai",
      timestamp: new Date(),
    },
  ])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Speech Recognition State
  const [isListening, setIsListening] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const speechInitializedRef = useRef(false)

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    if (typeof window !== "undefined") {
      setSpeechSupported(
        "SpeechRecognition" in window || "webkitSpeechRecognition" in window
      )
    }
  }, [])

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

      const response = await sendChatMessage(apiMessages)
      
      let aiReply: string
      if (typeof response === "string") {
        aiReply = response
      } else {
        aiReply = response.reply || String(response)
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: aiReply,
        sender: "ai",
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, aiMessage])
      
    } catch (error: any) {
      console.error("Erreur chat IA:", error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "Désolé, une erreur est survenue.",
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

  const renderedMessages = useMemo(
    () =>
      messages.map((message, index) => {
        const isLast = index === messages.length - 1
        const isUser = message.sender === "user"
        
        return (
            <div
              key={message.id}
              className={`group flex flex-col gap-1 mb-6 ${isUser ? "items-end" : "items-start"}`}
            >
               <div
                className={`
                    max-w-[92%] px-5 py-3.5 text-sm leading-relaxed shadow-sm
                    ${isUser 
                        ? "bg-black text-white dark:bg-white dark:text-black rounded-2xl rounded-tr-sm" 
                        : "bg-white dark:bg-[#1A1A1A] text-foreground border border-black/5 dark:border-white/5 rounded-2xl rounded-tl-sm"
                    }
                `}
              >
                {isUser ? (
                  <p className="whitespace-pre-wrap break-words">{message.text}</p>
                ) : (
                  <MemoMarkdownMessage content={message.text} />
                )}
              </div>
              <span 
                className="text-[10px] text-muted-foreground/40 px-1 opacity-0 group-hover:opacity-100 transition-opacity"
                suppressHydrationWarning
              >
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
        )
      }),
    [messages]
  )

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header Minimaliste */}
      <div className="h-16 px-6 flex items-center justify-between border-b border-black/5 dark:border-white/5">
        <div className="flex items-center gap-2.5">
             <div className="h-8 w-8 rounded-full bg-primary/5 flex items-center justify-center text-primary">
                <Sparkles className="h-4 w-4" />
             </div>
             <div>
                 <h2 className="text-sm font-semibold tracking-tight">Assistant</h2>
                 <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    En ligne
                 </p>
             </div>
        </div>
      </div>

      {/* Zone de Messages */}
      <div className="flex-1 overflow-y-auto p-6 scrollbar-none">
        {renderedMessages}

        {isLoading && (
          <div className="flex justify-start mb-6">
            <div className="bg-white dark:bg-[#1A1A1A] px-4 py-3 rounded-2xl rounded-tl-sm border border-black/5 dark:border-white/5 shadow-sm flex items-center gap-2">
               <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-foreground/20 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-1.5 h-1.5 bg-foreground/20 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-1.5 h-1.5 bg-foreground/20 rounded-full animate-bounce"></span>
               </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Flottant */}
      <div className="p-6 pt-2 bg-gradient-to-t from-[#FAFAFA] dark:from-[#0A0A0A] via-[#FAFAFA] dark:via-[#0A0A0A] to-transparent">
        <div className="relative bg-white dark:bg-[#1A1A1A] rounded-[20px] shadow-lg shadow-black/[0.03] border border-black/5 dark:border-white/10 p-1.5 transition-all focus-within:ring-2 focus-within:ring-black/5 dark:focus-within:ring-white/10 focus-within:border-black/10">
            <div className="flex items-end gap-2">
                <button 
                    className="p-2.5 text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 rounded-xl transition-colors"
                >
                    <Paperclip className="h-4.5 w-4.5" />
                </button>

                <textarea
                    ref={(el) => {
                        if (el) {
                            el.style.height = 'auto';
                            el.style.height = el.scrollHeight + 'px';
                        }
                        // @ts-ignore
                        inputRef.current = el
                    }}
                    rows={1}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => {
                         if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault()
                            handleSend()
                         }
                    }}
                    placeholder="Posez une question..."
                    disabled={isLoading}
                    className="flex-1 bg-transparent border-none focus:outline-none text-sm text-foreground placeholder:text-muted-foreground/50 py-3 px-1 resize-none max-h-32 scrollbar-none"
                    style={{ minHeight: '44px' }}
                />
                
                <button
                    onClick={handleSend}
                    disabled={!inputValue.trim() || isLoading}
                    className="p-2.5 bg-black dark:bg-white text-white dark:text-black rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                    <Send className="h-4 w-4" />
                </button>
            </div>
        </div>
        <p className="text-[10px] text-center text-muted-foreground/40 mt-3 font-medium tracking-wide">
            Nothly AI peut faire des erreurs.
        </p>
      </div>
    </div>
  )
}

interface MarkdownProps {
  content: string
}

const MemoMarkdownMessage = memo(function MemoMarkdownMessage({ content }: MarkdownProps) {
  return <MarkdownMessage content={content} />
})
