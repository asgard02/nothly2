"use client"

import { useState } from "react"
import { Sparkles, CheckCircle, Globe, FileText, Code, Upload, X } from "lucide-react"

interface AIContextMenuProps {
  isOpen: boolean
  onClose: () => void
  position: { bottom: number; right: number }
  onTextAction: (action: string) => void
}

export default function AIContextMenu({ isOpen, onClose, position, onTextAction }: AIContextMenuProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const textActions = [
    { id: "improve", label: "Améliorer le style", icon: Sparkles, color: "hover:bg-purple-50 hover:text-purple-600" },
    { id: "correct", label: "Corriger les fautes", icon: CheckCircle, color: "hover:bg-green-50 hover:text-green-600" },
    { id: "translate", label: "Traduire", icon: Globe, color: "hover:bg-blue-50 hover:text-blue-600" },
    { id: "summarize", label: "Résumer", icon: FileText, color: "hover:bg-orange-50 hover:text-orange-600" },
    { id: "markdown", label: "Markdown", icon: Code, color: "hover:bg-gray-50 hover:text-gray-600" },
  ]

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length === 0) return

    const file = files[0]
    const fileType = file.name.toLowerCase()

    setIsProcessing(true)

    if (fileType.endsWith(".pdf")) {
      await handlePDF(file)
    } else if (fileType.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
      await handleImage(file)
    } else {
      alert("Type de fichier non supporté. Utilisez PDF ou images (JPG, PNG, GIF, WebP)")
    }

    setIsProcessing(false)
  }

  async function handlePDF(file: File) {
    // Placeholder - simulation d'analyse
    console.log("📄 Analyse PDF :", file.name)
    await new Promise(resolve => setTimeout(resolve, 1500))
    alert(`✅ PDF analysé : ${file.name}\n\n(Fonctionnalité à venir : extraction de texte et résumé)`)
  }

  async function handleImage(file: File) {
    // Placeholder - simulation d'analyse
    console.log("🖼️ Analyse image :", file.name)
    await new Promise(resolve => setTimeout(resolve, 1500))
    alert(`✅ Image analysée : ${file.name}\n\n(Fonctionnalité à venir : OCR et description)`)
  }

  if (!isOpen) return null

  return (
    <>
      {/* Overlay transparent pour fermer en cliquant à l'extérieur */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />

      {/* Menu contextuel */}
      <div
        className="fixed z-50 w-80 bg-card border-2 border-border rounded-xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-200"
        style={{
          bottom: `${position.bottom}px`,
          right: `${position.right}px`,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-r from-primary/10 to-primary/5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">Outils IA</h3>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground hover:bg-muted p-1 rounded-lg transition-colors"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Actions de texte */}
        <div className="p-3 border-b border-border">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 px-1">
            Actions sur le texte
          </p>
          <div className="space-y-1">
            {textActions.map((action) => {
              const Icon = action.icon
              return (
                <button
                  key={action.id}
                  onClick={() => {
                    onTextAction(action.id)
                    onClose()
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left hover:bg-muted text-foreground"
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm font-medium">{action.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Zone drag & drop */}
        <div className="p-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 px-1">
            Analyser un fichier
          </p>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-6 transition-all text-center ${
              isDragging
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/50 hover:bg-muted"
            } ${isProcessing ? "opacity-50 cursor-wait" : "cursor-pointer"}`}
          >
            {isProcessing ? (
              <div className="space-y-2">
                <div className="animate-spin mx-auto h-8 w-8 border-3 border-primary border-t-transparent rounded-full" />
                <p className="text-sm text-muted-foreground">Analyse en cours...</p>
              </div>
            ) : (
              <>
                <Upload className={`h-8 w-8 mx-auto mb-2 ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
                <p className={`text-sm font-medium mb-1 ${isDragging ? "text-primary" : "text-foreground"}`}>
                  {isDragging ? "Déposez pour analyser" : "Glissez un fichier ici"}
                </p>
                <p className="text-xs text-muted-foreground">
                  PDF, JPG, PNG acceptés
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

