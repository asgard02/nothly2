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
        className={`group fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 rounded-2xl backdrop-blur-md transition-all duration-300 hover:scale-110 ${
          isOpen
            ? "bg-blue-500 text-white shadow-xl shadow-blue-500/30"
            : "bg-white/80 text-[#64748B] hover:text-blue-500 border border-[#E2E8F0] shadow-lg hover:shadow-xl"
        }`}
        title="Chat avec l'IA"
      >
        <MessageCircle className="h-6 w-6 transition-transform duration-500 group-hover:rotate-[360deg]" />
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

