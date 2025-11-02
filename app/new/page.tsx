"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Sidebar from "@/components/Sidebar"
import ChatButton from "@/components/ChatButton"
import { Loader2 } from "lucide-react"

export default function NewNotePage() {
  const router = useRouter()
  const [creating, setCreating] = useState(false)
  const hasCreated = useRef(false) // 🔒 Flag anti-double appel

  // Créer automatiquement au chargement (protection StrictMode + Optimistic UI)
  useEffect(() => {
    const createNote = async () => {
      // 🛡️ Empêche la double exécution en mode dev (StrictMode)
      if (hasCreated.current) {
        console.log("[NewNote] 🛡️ Double exécution bloquée (StrictMode)")
        return
      }
      
      hasCreated.current = true
      setCreating(true)
      
      console.log("[NewNote] 🚀 Création de la note...")
      
      try {
        // ⚡ Appel API pour créer la note
        const res = await fetch("/api/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}))
          console.error("[NewNote] ❌ Erreur API:", res.status, errorData)
          
          // Si non authentifié, rediriger vers login
          if (res.status === 401) {
            alert("Session expirée. Veuillez vous reconnecter.")
            router.push("/login")
            return
          }
          
          throw new Error(errorData.error || `Erreur ${res.status}`)
        }

        const newNote = await res.json()
        console.log("[NewNote] ✅ Note créée:", newNote.id)
        
        // 🚀 Navigation immédiate vers l'éditeur
        router.push(`/note/${newNote.id}`)
        
      } catch (error: any) {
        console.error("[NewNote] ❌ Exception:", error.message)
        alert(`Erreur: ${error.message}`)
        
        // Reset et retour au dashboard
        setCreating(false)
        hasCreated.current = false
        router.push("/dashboard")
      }
    }

    createNote()
  }, [router])

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <div className="flex-1 ml-64 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground font-medium">Création de votre note...</p>
        </div>
      </div>

      {/* Chatbot flottant global */}
      <ChatButton />
    </div>
  )
}

