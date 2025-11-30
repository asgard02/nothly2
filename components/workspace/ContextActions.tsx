"use client"

import { useState } from "react"
import {
  Sparkles,
  BookOpen,
  GraduationCap,
  Zap,
  Brain,
  X
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import AIChat from "@/components/AIChat"

interface ContextActionsProps {
  activeContext: {
    type: "subject" | "pdf" | "note" | "quiz" | "graph"
    data: any
  }
  onGenerateQuiz?: (quiz: any) => void
}

export function ContextActions({ activeContext, onGenerateQuiz }: ContextActionsProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showChat, setShowChat] = useState(false)

  // Ne pas afficher si on est sur la vue graph/library ou sujet (le chat est intégré dans SubjectView)
  if (activeContext.type === "graph" || activeContext.type === "subject" || !activeContext.data) {
    return null
  }

  const quickActions = [
    {
      icon: BookOpen,
      label: "Générer fiche",
      action: () => console.log("Générer fiche"),
    },
    {
      icon: GraduationCap,
      label: "Créer quiz",
      action: () => onGenerateQuiz?.(activeContext.data),
    },
    {
      icon: Zap,
      label: "Résumer",
      action: () => console.log("Résumer"),
    },
    {
      icon: Brain,
      label: "Discuter",
      action: () => setShowChat(true),
    }
  ]

  return (
    <>
      {/* Bouton flottant minimaliste */}
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        className="fixed bottom-6 right-6 z-50"
      >
        <AnimatePresence>
          {!isExpanded ? (
            <motion.button
              key="closed"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              onClick={() => setIsExpanded(true)}
              className="w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl flex items-center justify-center transition-all hover:scale-105"
            >
              <Sparkles className="h-5 w-5" />
            </motion.button>
          ) : (
            <motion.div
              key="expanded"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="bg-background border rounded-xl shadow-xl p-2 min-w-[200px] mb-2"
            >
              {quickActions.map((action, idx) => {
                const Icon = action.icon
                return (
                  <button
                    key={action.label}
                    onClick={() => {
                      action.action()
                      setIsExpanded(false)
                    }}
                    className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted transition-colors text-left text-sm"
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span>{action.label}</span>
                  </button>
                )
              })}
              <button
                onClick={() => setIsExpanded(false)}
                className="w-full mt-2 pt-2 border-t flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted transition-colors text-left text-sm text-muted-foreground"
              >
                <X className="h-4 w-4" />
                <span>Fermer</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Chat modal */}
      <AnimatePresence>
        {showChat && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
            onClick={() => setShowChat(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl h-[80vh] bg-background rounded-xl border shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">Assistant IA</h3>
                </div>
                <button
                  onClick={() => setShowChat(false)}
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <AIChat isOpen={true} onClose={() => setShowChat(false)} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
