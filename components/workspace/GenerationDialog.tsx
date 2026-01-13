"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { FileText, Brain, ListChecks, BookOpen, Search, ArrowRight, ArrowLeft, Sparkles, CheckCircle2, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"

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
    const [isCheckingTitle, setIsCheckingTitle] = useState(false)
    const [titleExists, setTitleExists] = useState(false)
    const [titleError, setTitleError] = useState<string | null>(null)

    // Reset state when opening
    useEffect(() => {
        if (open) {
            setStep(1)
            setSelectedDocIds([])
            setTopic("")
            setSearchQuery("")
            setTitleExists(false)
            setTitleError(null)
        }
    }, [open])

    // Vérifier l'unicité du titre quand l'utilisateur valide
    const checkTitleUniqueness = async () => {
        if (!topic.trim() || !intent) {
            return true // Pas de topic = OK (génération globale)
        }

        const generatedTitle = intent === "flashcards"
            ? `Flashcards: ${topic}`
            : intent === "quiz"
                ? `Quiz: ${topic}`
                : `Résumé: ${topic}`

        setIsCheckingTitle(true)
        setTitleError(null)

        try {
            const response = await fetch(`/api/study-collections/check-title?title=${encodeURIComponent(generatedTitle)}&type=${intent === "flashcards" ? "flashcard" : intent}`)
            if (response.ok) {
                const data = await response.json()
                setTitleExists(data.exists)
                if (data.exists) {
                    setTitleError(`Un ${intent === "flashcards" ? "ensemble de flashcards" : intent === "quiz" ? "quiz" : "résumé"} avec ce titre existe déjà`)
                    return false
                }
                return true
            }
            return true
        } catch (error) {
            console.error("Error checking title:", error)
            return true // En cas d'erreur, on laisse passer
        } finally {
            setIsCheckingTitle(false)
        }
    }

    // Pre-select all docs when entering step 2 if none selected
    useEffect(() => {
        if (step === 2 && selectedDocIds.length === 0 && documents.length > 0) {
            setSelectedDocIds(documents.map(d => d.id))
        }
    }, [step, documents, selectedDocIds.length])

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

    const handleNext = async () => {
        const isUnique = await checkTitleUniqueness()
        if (isUnique) {
            setStep(2)
        }
    }

    const handleSubmit = () => {
        onConfirm(selectedDocIds, topic)
        onOpenChange(false)
    }

    const getIntentIcon = () => {
        switch (intent) {
            case "flashcards": return <Brain className="h-6 w-6 text-foreground" strokeWidth={2.5} />
            case "quiz": return <ListChecks className="h-6 w-6 text-foreground" strokeWidth={2.5} />
            case "summary": return <BookOpen className="h-6 w-6 text-foreground" strokeWidth={2.5} />
            default: return <FileText className="h-6 w-6 text-foreground" strokeWidth={2.5} />
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

    const getIntentBg = () => {
        switch (intent) {
            case "flashcards": return "bg-[#FBCFE8]"
            case "quiz": return "bg-[#BBF7D0]"
            case "summary": return "bg-[#FDE68A]"
            default: return "bg-card"
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden bg-card border-2 border-border shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] rounded-3xl duration-300">
                <div className="relative flex flex-col h-[550px]">

                    {/* Header */}
                    <div className="px-8 py-6 border-b-2 border-border flex items-center justify-between bg-card">
                        <div className="flex items-center gap-4">
                            <div className={cn("px-3 py-3 rounded-xl border-2 border-border shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]", getIntentBg())}>
                                {getIntentIcon()}
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-black uppercase tracking-tight text-foreground">{getIntentTitle()}</DialogTitle>
                                <DialogDescription className="text-xs text-muted-foreground font-bold uppercase">Étape {step} sur 2</DialogDescription>
                            </div>
                        </div>
                        {/* Progress dots */}
                        <div className="flex gap-2">
                            <div className={cn("h-3 w-3 rounded-full border-2 border-border transition-all", step >= 1 ? "bg-foreground" : "bg-transparent")} />
                            <div className={cn("h-3 w-3 rounded-full border-2 border-border transition-all", step >= 2 ? "bg-foreground" : "bg-transparent")} />
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
                                    <div className="space-y-8 max-w-md mx-auto w-full">
                                        <div className="text-center space-y-3">
                                            <div className="inline-block p-4 rounded-full bg-[#BAE6FD] border-2 border-border shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] mb-4">
                                                <Sparkles className="h-8 w-8 text-foreground" strokeWidth={2.5} />
                                            </div>
                                            <h3 className="text-2xl font-black uppercase text-foreground">Quel est le sujet ?</h3>
                                            <p className="text-muted-foreground font-bold text-sm">
                                                Précisez le thème pour aider l'IA à se concentrer.
                                            </p>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="relative group">
                                                <Input
                                                    autoFocus
                                                    placeholder="EX: LA GUERRE FROIDE..."
                                                    value={topic}
                                                    onChange={(e) => {
                                                        setTopic(e.target.value)
                                                        if (titleError) {
                                                            setTitleError(null)
                                                            setTitleExists(false)
                                                        }
                                                    }}
                                                    className={cn(
                                                        "h-16 text-lg px-6 rounded-2xl bg-card border-2 border-border focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:focus:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] focus:ring-0 focus:-translate-y-1 transition-all placeholder:text-muted-foreground font-bold uppercase text-foreground",
                                                        titleExists && "border-destructive bg-destructive/10"
                                                    )}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter" && !isCheckingTitle) handleNext()
                                                    }}
                                                />
                                                {isCheckingTitle && (
                                                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                                        <div className="h-6 w-6 border-4 border-black border-t-[#FDE68A] rounded-full animate-spin" />
                                                    </div>
                                                )}
                                            </div>

                                            {titleError && !isCheckingTitle && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: -10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    className="flex items-start gap-3 p-4 rounded-xl bg-destructive/10 border-2 border-border shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
                                                >
                                                    <div className="bg-destructive rounded-full p-0.5 border border-border text-destructive-foreground shrink-0">
                                                        <Check className="h-3 w-3 rotate-45" strokeWidth={4} />
                                                    </div>
                                                    <p className="text-sm text-foreground font-black uppercase">{titleError}</p>
                                                </motion.div>
                                            )}
                                        </div>

                                        <div className="flex flex-col gap-4 pt-4">
                                            <Button
                                                onClick={handleNext}
                                                size="lg"
                                                disabled={isCheckingTitle}
                                                className="w-full rounded-xl h-14 text-lg font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] hover:-translate-y-[2px] active:translate-y-0 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:active:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] transition-all border-2 border-border bg-foreground text-background hover:bg-foreground/90"
                                            >
                                                {isCheckingTitle ? (
                                                    <>
                                                        Vérification...
                                                    </>
                                                ) : (
                                                    <>
                                                        {topic ? "Continuer" : "Je n'ai pas de sujet précis"}
                                                        <ArrowRight className="ml-3 h-5 w-5" strokeWidth={3} />
                                                    </>
                                                )}
                                            </Button>
                                            {!topic && (
                                                <p className="text-[10px] text-center font-bold uppercase text-muted-foreground">
                                                    L'IA analysera l'ensemble du contenu.
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
                                        <h3 className="text-xl font-black uppercase mb-1 text-foreground">Sélectionnez les sources</h3>
                                        <p className="text-sm font-bold text-muted-foreground mb-6 uppercase">
                                            Quels documents utiliser pour {topic ? `"${topic}"` : "la génération"} ?
                                        </p>

                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="relative flex-1 group">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-foreground" strokeWidth={2.5} />
                                                <Input
                                                    placeholder="RECHERCHER..."
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                    className="pl-10 h-12 bg-card border-2 border-border rounded-xl font-bold placeholder:text-muted-foreground uppercase focus:ring-0 focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:focus:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] transition-all text-foreground"
                                                />
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={handleSelectAll}
                                                className="whitespace-nowrap h-12 border-2 border-border rounded-xl font-bold uppercase hover:bg-foreground hover:text-background transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] active:translate-y-[2px] active:shadow-none text-foreground"
                                            >
                                                {selectedDocIds.length === filteredDocs.length ? "Tout désélectionner" : "Tout sélectionner"}
                                            </Button>
                                        </div>
                                    </div>

                                    <ScrollArea className="flex-1 px-8 pb-4">
                                        <div className="grid grid-cols-1 gap-3">
                                            {filteredDocs.map(doc => (
                                                <div
                                                    key={doc.id}
                                                    onClick={() => handleToggleDoc(doc.id)}
                                                    className={cn(
                                                        "flex items-center gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer group hover:-translate-y-1",
                                                        selectedDocIds.includes(doc.id)
                                                            ? "bg-[#F0FDF4] border-border shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
                                                            : "bg-card border-border hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "h-6 w-6 rounded border-2 border-border flex items-center justify-center transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]",
                                                        selectedDocIds.includes(doc.id)
                                                            ? "bg-[#BBF7D0]"
                                                            : "bg-card"
                                                    )}>
                                                        {selectedDocIds.includes(doc.id) && <Check className="h-4 w-4 text-foreground" strokeWidth={4} />}
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-black text-sm truncate uppercase text-foreground">
                                                            {doc.title}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground truncate font-bold uppercase">
                                                            {doc.filename}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </ScrollArea>

                                    <div className="p-6 border-t-2 border-border bg-card flex items-center justify-between">
                                        <Button
                                            variant="ghost"
                                            onClick={() => setStep(1)}
                                            className="text-foreground font-bold uppercase hover:bg-muted rounded-xl h-12 px-6 border-2 border-transparent hover:border-border transition-all"
                                        >
                                            <ArrowLeft className="mr-2 h-5 w-5" strokeWidth={3} />
                                            Retour
                                        </Button>
                                        <Button
                                            onClick={handleSubmit}
                                            disabled={selectedDocIds.length === 0}
                                            className="bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase rounded-xl h-12 px-8 border-2 border-border shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:translate-y-[2px] active:translate-y-[4px] active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0"
                                        >
                                            <Sparkles className="mr-2 h-5 w-5 fill-primary-foreground" />
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
