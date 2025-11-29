"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { FileText, Brain, ListChecks, BookOpen, Search, ArrowRight, ArrowLeft, Sparkles, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

export type GenerationIntent = "flashcards" | "quiz" | "summary"

interface GenerationDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    documents: Array<{ id: string; title: string; filename: string }>
    intent: GenerationIntent | null
    onConfirm: (selectedDocIds: string[], topic: string) => void
}

export function GenerationDialog({
    open,
    onOpenChange,
    documents,
    intent,
    onConfirm
}: GenerationDialogProps) {
    const [step, setStep] = useState<1 | 2>(1)
    const [selectedDocIds, setSelectedDocIds] = useState<string[]>([])
    const [topic, setTopic] = useState("")
    const [searchQuery, setSearchQuery] = useState("")

    // Reset state when opening
    useEffect(() => {
        if (open) {
            setStep(1)
            setSelectedDocIds([]) // Will be auto-filled in step 2 if needed
            setTopic("")
            setSearchQuery("")
        }
    }, [open])

    // Pre-select all docs when entering step 2 if none selected
    useEffect(() => {
        if (step === 2 && selectedDocIds.length === 0) {
            setSelectedDocIds(documents.map(d => d.id))
        }
    }, [step, documents])

    const filteredDocs = documents.filter(doc =>
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.filename.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const handleToggleDoc = (docId: string) => {
        setSelectedDocIds(prev =>
            prev.includes(docId)
                ? prev.filter(id => id !== docId)
                : [...prev, docId]
        )
    }

    const handleSelectAll = () => {
        if (selectedDocIds.length === filteredDocs.length) {
            setSelectedDocIds([])
        } else {
            setSelectedDocIds(filteredDocs.map(d => d.id))
        }
    }

    const handleNext = () => {
        setStep(2)
    }

    const handleSubmit = () => {
        onConfirm(selectedDocIds, topic)
        onOpenChange(false)
    }

    const getIntentIcon = () => {
        switch (intent) {
            case "flashcards": return <Brain className="h-6 w-6 text-purple-500" />
            case "quiz": return <ListChecks className="h-6 w-6 text-green-500" />
            case "summary": return <BookOpen className="h-6 w-6 text-amber-500" />
            default: return <FileText className="h-6 w-6" />
        }
    }

    const getIntentTitle = () => {
        switch (intent) {
            case "flashcards": return "Créer des Flashcards"
            case "quiz": return "Créer un Quiz"
            case "summary": return "Générer un Résumé"
            default: return "Générer"
        }
    }

    const getIntentColor = () => {
        switch (intent) {
            case "flashcards": return "text-purple-500"
            case "quiz": return "text-green-500"
            case "summary": return "text-amber-500"
            default: return "text-primary"
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden bg-background/95 backdrop-blur-xl border-border/50 shadow-2xl duration-300">
                <div className="relative flex flex-col h-[500px]">

                    {/* Header */}
                    <div className="px-8 py-6 border-b border-border/40 flex items-center justify-between bg-muted/10">
                        <div className="flex items-center gap-3">
                            <div className={cn("p-2 rounded-xl bg-background shadow-sm border border-border/50", getIntentColor())}>
                                {getIntentIcon()}
                            </div>
                            <div>
                                <h2 className="text-xl font-bold tracking-tight">{getIntentTitle()}</h2>
                                <p className="text-xs text-muted-foreground font-medium">Étape {step} sur 2</p>
                            </div>
                        </div>
                        {/* Progress dots */}
                        <div className="flex gap-2">
                            <div className={cn("h-2 w-2 rounded-full transition-colors", step >= 1 ? "bg-primary" : "bg-muted")} />
                            <div className={cn("h-2 w-2 rounded-full transition-colors", step >= 2 ? "bg-primary" : "bg-muted")} />
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-hidden relative">
                        <AnimatePresence mode="wait">
                            {step === 1 ? (
                                <motion.div
                                    key="step1"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className="absolute inset-0 p-8 flex flex-col justify-center"
                                >
                                    <div className="space-y-6 max-w-md mx-auto w-full">
                                        <div className="text-center space-y-2">
                                            <Sparkles className="h-8 w-8 text-primary mx-auto mb-4 animate-pulse" />
                                            <h3 className="text-2xl font-bold">Quel est le sujet ?</h3>
                                            <p className="text-muted-foreground">
                                                Précisez le thème pour aider l'IA à se concentrer.
                                            </p>
                                        </div>

                                        <div className="relative">
                                            <Input
                                                autoFocus
                                                placeholder="Ex: La Guerre Froide, Les limites..."
                                                value={topic}
                                                onChange={(e) => setTopic(e.target.value)}
                                                className="h-14 text-lg px-6 rounded-2xl bg-muted/30 border-border/60 focus:ring-primary/30 transition-all shadow-sm"
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") handleNext()
                                                }}
                                            />
                                        </div>

                                        <div className="flex flex-col gap-3 pt-4">
                                            <Button
                                                onClick={handleNext}
                                                size="lg"
                                                className="w-full rounded-xl h-12 text-base font-medium shadow-md hover:shadow-lg transition-all"
                                            >
                                                {topic ? "Continuer avec ce sujet" : "Je n'ai pas de sujet précis"}
                                                <ArrowRight className="ml-2 h-4 w-4" />
                                            </Button>
                                            {!topic && (
                                                <p className="text-xs text-center text-muted-foreground">
                                                    L'IA analysera l'ensemble du contenu sélectionné.
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="step2"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="absolute inset-0 flex flex-col"
                                >
                                    <div className="px-8 pt-6 pb-2">
                                        <h3 className="text-lg font-semibold mb-1">Sélectionnez les sources</h3>
                                        <p className="text-sm text-muted-foreground mb-4">
                                            Choisissez les documents à utiliser pour {topic ? `"${topic}"` : "la génération"}.
                                        </p>

                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="relative flex-1">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    placeholder="Filtrer les documents..."
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                    className="pl-9 bg-muted/30 border-border/60"
                                                />
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={handleSelectAll}
                                                className="whitespace-nowrap"
                                            >
                                                {selectedDocIds.length === filteredDocs.length ? "Tout désélectionner" : "Tout sélectionner"}
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-y-auto px-8 pb-4">
                                        <div className="grid grid-cols-1 gap-2">
                                            {filteredDocs.map(doc => (
                                                <div
                                                    key={doc.id}
                                                    onClick={() => handleToggleDoc(doc.id)}
                                                    className={cn(
                                                        "flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer group",
                                                        selectedDocIds.includes(doc.id)
                                                            ? "bg-primary/5 border-primary/30 shadow-sm"
                                                            : "bg-card border-border/40 hover:bg-muted/40 hover:border-border/80"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "h-5 w-5 rounded-md border flex items-center justify-center transition-colors",
                                                        selectedDocIds.includes(doc.id)
                                                            ? "bg-primary border-primary text-primary-foreground"
                                                            : "border-muted-foreground/30 group-hover:border-primary/50"
                                                    )}>
                                                        {selectedDocIds.includes(doc.id) && <CheckCircle2 className="h-3.5 w-3.5" />}
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <p className={cn(
                                                            "font-medium text-sm truncate transition-colors",
                                                            selectedDocIds.includes(doc.id) ? "text-primary" : "text-foreground"
                                                        )}>
                                                            {doc.title}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground truncate opacity-70">
                                                            {doc.filename}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="p-6 border-t border-border/40 bg-muted/10 flex items-center justify-between">
                                        <Button
                                            variant="ghost"
                                            onClick={() => setStep(1)}
                                            className="text-muted-foreground hover:text-foreground"
                                        >
                                            <ArrowLeft className="mr-2 h-4 w-4" />
                                            Retour
                                        </Button>
                                        <Button
                                            onClick={handleSubmit}
                                            disabled={selectedDocIds.length === 0}
                                            className="bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all px-8"
                                        >
                                            <Sparkles className="mr-2 h-4 w-4" />
                                            Lancer la génération
                                        </Button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
