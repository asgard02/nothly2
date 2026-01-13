"use client"

import { Sparkles, CheckCircle, Globe, FileText, Code, Loader2 } from "lucide-react"

interface SelectionMenuProps {
  position: { top: number; left: number }
  onAction: (action: string) => void
  isLoading: boolean
}

export default function SelectionMenu({ position, onAction, isLoading }: SelectionMenuProps) {
  const actions = [
    { id: "improve", label: "Améliorer", icon: Sparkles, color: "hover:bg-purple-50 hover:text-purple-600" },
    { id: "correct", label: "Corriger", icon: CheckCircle, color: "hover:bg-green-50 hover:text-green-600" },
    { id: "translate", label: "Traduire", icon: Globe, color: "hover:bg-blue-50 hover:text-blue-600" },
    { id: "summarize", label: "Résumer", icon: FileText, color: "hover:bg-orange-50 hover:text-orange-600" },
    { id: "markdown", label: "Markdown", icon: Code, color: "hover:bg-gray-50 hover:text-gray-600" },
  ]

  return (
    <div
      className="fixed z-50 animate-in fade-in slide-in-from-bottom-2 duration-200"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: "translateX(-50%)",
      }}
    >
      <div className="bg-card border-2 border-border rounded-xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] p-2 flex gap-1 backdrop-blur-sm">
        {isLoading ? (
          <div className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Traitement...</span>
          </div>
        ) : (
          actions.map((action) => {
            const Icon = action.icon
            return (
              <button
                key={action.id}
                onClick={() => onAction(action.id)}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all hover:bg-muted text-foreground group`}
                title={action.label}
              >
                <Icon className="h-4 w-4" />
                <span className="text-xs font-medium whitespace-nowrap">
                  {action.label}
                </span>
              </button>
            )
          })
        )}
      </div>
      
      {/* Petite flèche pointant vers le texte */}
      <div className="absolute left-1/2 bottom-0 transform -translate-x-1/2 translate-y-full">
        <div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-card" />
      </div>
    </div>
  )
}

