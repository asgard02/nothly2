"use client"

import { useState } from "react"
import { MessageCircle } from "lucide-react"
import { usePathname } from "next/navigation"
import AIChat from "@/components/AIChat"

interface ChatButtonProps {
  noteId?: string
  noteTitle?: string
  noteContent?: string
}

export default function ChatButton({ noteId, noteTitle, noteContent }: ChatButtonProps = {}) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  return (
    <>
      {/* Bouton flottant - design harmonisé avec Outils IA */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`group fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 rounded-full backdrop-blur-xl border shadow-lg transition-all duration-300 hover:scale-110 hover:shadow-primary/25 ${
          isOpen
            ? "bg-primary text-primary-foreground border-primary shadow-primary/30"
            : "bg-background/80 text-muted-foreground hover:text-primary border-border/50"
        }`}
        title="Chat avec l'IA"
      >
        <MessageCircle className={`h-6 w-6 transition-transform duration-500 ${isOpen ? "rotate-180" : "group-hover:rotate-12"}`} />
      </button>

      {/* Chat IA avec contexte */}
      <AIChat 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)}
        context={{
          currentPage: pathname || "",
          noteId: noteId,
          noteTitle: noteTitle,
          noteContent: noteContent,
        }}
      />
    </>
  )
}

