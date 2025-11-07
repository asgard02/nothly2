"use client"

import { Sparkles, CheckCircle, Globe, FileText, Loader2 } from "lucide-react"

interface NotionStyleMenuProps {
  position: { top: number; left: number }
  selectedText: string
  onAction: (action: string) => void
  isLoading: boolean
}

const aiActions = [
  { 
    id: "improve", 
    label: "Améliorer", 
    icon: Sparkles, 
    description: "Améliore le style",
    color: "hover:bg-purple-50 hover:text-purple-600 dark:hover:bg-purple-900/20 dark:hover:text-purple-400"
  },
  { 
    id: "correct", 
    label: "Corriger", 
    icon: CheckCircle, 
    description: "Corrige les fautes",
    color: "hover:bg-green-50 hover:text-green-600 dark:hover:bg-green-900/20 dark:hover:text-green-400"
  },
  { 
    id: "translate", 
    label: "Traduire", 
    icon: Globe, 
    description: "Traduit en anglais",
    color: "hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20 dark:hover:text-blue-400"
  },
  { 
    id: "summarize", 
    label: "Résumer", 
    icon: FileText, 
    description: "Résume le texte",
    color: "hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-orange-900/20 dark:hover:text-orange-400"
  },
]

export default function NotionStyleMenu({ position, selectedText, onAction, isLoading }: NotionStyleMenuProps) {
  if (!selectedText || selectedText.trim().length === 0) {
    return null
  }

  return (
    <div
      className="fixed z-50 animate-in fade-in slide-in-from-bottom-2 duration-200"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: "translateX(-50%)",
      }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-1 flex gap-0.5 backdrop-blur-sm">
        {isLoading ? (
          <div className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-300">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Traitement en cours...</span>
          </div>
        ) : (
          <>
            {/* Section IA */}
            <div className="flex items-center gap-0.5">
              {aiActions.map((action) => {
                const Icon = action.icon
                return (
                  <button
                    key={action.id}
                    onClick={() => onAction(action.id)}
                    className={`group relative flex flex-col items-center gap-1 px-3 py-2 rounded-md transition-all ${action.color} min-w-[60px]`}
                    title={action.description}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-xs font-medium whitespace-nowrap">
                      {action.label}
                    </span>
                    {/* Tooltip au survol */}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                      {action.description}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-700" />
                    </div>
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>
      
      {/* Petite flèche pointant vers le texte sélectionné */}
      <div className="absolute left-1/2 bottom-0 transform -translate-x-1/2 translate-y-full">
        <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-white dark:border-t-gray-800" />
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-[1px] w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-gray-200 dark:border-t-gray-700" />
      </div>
    </div>
  )
}

