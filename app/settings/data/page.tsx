"use client"

import { useState } from "react"
import { Download, Upload, Database, Trash2, FileJson, FileText, Archive } from "lucide-react"

export default function DataPage() {
    const [exporting, setExporting] = useState(false)
    const [importing, setImporting] = useState(false)

    const handleExportJSON = async () => {
        setExporting(true)
        try {
            const response = await fetch("/api/notes")
            const notes = await response.json()

            const dataStr = JSON.stringify(notes, null, 2)
            const dataBlob = new Blob([dataStr], { type: "application/json" })
            const url = URL.createObjectURL(dataBlob)
            const link = document.createElement("a")
            link.href = url
            link.download = `nothly-export-${new Date().toISOString().split("T")[0]}.json`
            link.click()
            URL.revokeObjectURL(url)
        } catch (error) {
            console.error("Erreur export:", error)
            alert("Erreur lors de l'export")
        } finally {
            setExporting(false)
        }
    }

    const handleExportMarkdown = async () => {
        setExporting(true)
        try {
            const response = await fetch("/api/notes")
            const notes = await response.json()

            let markdown = "# Mes Notes Nothly\n\n"
            notes.forEach((note: any) => {
                markdown += `## ${note.title}\n\n`
                markdown += `${note.content}\n\n`
                markdown += `---\n\n`
            })

            const dataBlob = new Blob([markdown], { type: "text/markdown" })
            const url = URL.createObjectURL(dataBlob)
            const link = document.createElement("a")
            link.href = url
            link.download = `nothly-notes-${new Date().toISOString().split("T")[0]}.md`
            link.click()
            URL.revokeObjectURL(url)
        } catch (error) {
            console.error("Erreur export:", error)
            alert("Erreur lors de l'export")
        } finally {
            setExporting(false)
        }
    }

    const handleClearCache = () => {
        if (confirm("Voulez-vous vraiment vider le cache ? Cela peut améliorer les performances.")) {
            localStorage.clear()
            sessionStorage.clear()
            alert("Cache vidé avec succès")
            window.location.reload()
        }
    }

    return (
        <div className="max-w-3xl mx-auto p-10">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-foreground mb-2">Données</h1>
                <p className="text-muted-foreground">
                    Exportez, importez et gérez vos données
                </p>
            </div>

            {/* Export */}
            <div className="bg-card rounded-xl border border-border shadow-sm p-6 mb-6 transition-colors">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Download className="h-5 w-5 text-primary" />
                    </div>
                    <h2 className="text-lg font-semibold text-foreground">
                        Exporter vos données
                    </h2>
                </div>

                <p className="text-sm text-muted-foreground mb-6">
                    Téléchargez toutes vos notes dans différents formats
                </p>

                <div className="space-y-3">
                    <button
                        onClick={handleExportJSON}
                        disabled={exporting}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-border text-foreground hover:bg-muted transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <FileJson className="h-5 w-5" />
                        <div className="flex-1 text-left">
                            <p className="text-sm font-medium">Export JSON</p>
                            <p className="text-xs text-muted-foreground">Format structuré pour réimporter</p>
                        </div>
                    </button>

                    <button
                        onClick={handleExportMarkdown}
                        disabled={exporting}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-border text-foreground hover:bg-muted transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <FileText className="h-5 w-5" />
                        <div className="flex-1 text-left">
                            <p className="text-sm font-medium">Export Markdown</p>
                            <p className="text-xs text-muted-foreground">Format texte lisible</p>
                        </div>
                    </button>
                </div>
            </div>

            {/* Import */}
            <div className="bg-card rounded-xl border border-border shadow-sm p-6 mb-6 transition-colors">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Upload className="h-5 w-5 text-primary" />
                    </div>
                    <h2 className="text-lg font-semibold text-foreground">
                        Importer des données
                    </h2>
                </div>

                <p className="text-sm text-muted-foreground mb-6">
                    Importez vos notes depuis un fichier JSON
                </p>

                <button
                    disabled={importing}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-border text-foreground hover:bg-muted transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Archive className="h-5 w-5" />
                    Importer un fichier JSON
                </button>
            </div>

            {/* Stockage */}
            <div className="bg-card rounded-xl border border-border shadow-sm p-6 mb-6 transition-colors">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Database className="h-5 w-5 text-primary" />
                    </div>
                    <h2 className="text-lg font-semibold text-foreground">
                        Stockage
                    </h2>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between py-3 border-b border-border">
                        <div>
                            <p className="text-sm font-medium text-foreground">Cache local</p>
                            <p className="text-xs text-muted-foreground">Données temporaires stockées localement</p>
                        </div>
                        <button
                            onClick={handleClearCache}
                            className="px-4 py-2 rounded-lg border border-border text-foreground hover:bg-muted transition-all duration-200 text-sm font-medium"
                        >
                            Vider le cache
                        </button>
                    </div>
                </div>
            </div>

            {/* Zone dangereuse */}
            <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-6 transition-colors">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-destructive/20 rounded-lg flex items-center justify-center">
                        <Trash2 className="h-5 w-5 text-destructive" />
                    </div>
                    <h2 className="text-lg font-semibold text-foreground">
                        Zone dangereuse
                    </h2>
                </div>

                <p className="text-sm text-muted-foreground mb-4">
                    Ces actions sont irréversibles. Soyez prudent.
                </p>

                <button
                    className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg bg-destructive/20 border border-destructive text-destructive hover:bg-destructive/30 transition-all duration-200 font-medium"
                >
                    <Trash2 className="h-5 w-5" />
                    Supprimer toutes mes données
                </button>
            </div>
        </div>
    )
}
