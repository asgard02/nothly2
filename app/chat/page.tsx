"use client"

import Sidebar from "@/components/Sidebar"
import AIChat from "@/components/AIChat"
import { useState } from "react"

export default function ChatPage() {
  const [isChatOpen, setIsChatOpen] = useState(true)

  return (
    <div className="flex h-screen bg-black">
      <Sidebar />
      
      <div className="flex-1 ml-64 flex items-center justify-center p-8">
        <div className="max-w-4xl w-full">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">
              💬 Chat IA
            </h1>
            <p className="text-gray-400">
              Discutez avec l'assistant intelligent de Nothly
            </p>
          </div>

          {/* Container pour centrer le chat */}
          <div className="relative flex justify-center">
            <AIChat isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
          </div>
        </div>
      </div>
    </div>
  )
}

