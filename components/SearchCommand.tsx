"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Search, FileText, Brain, ListChecks, BookOpen, X, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"

export type SearchResultType = "document" | "flashcard" | "quiz" | "collection" | "subject"

export interface SearchResult {
  id: string
  type: SearchResultType
  title: string
  description?: string
  url: string
  subjectName?: string
  subjectId?: string
  metadata?: {
    tags?: string[]
    createdAt?: string
    [key: string]: unknown
  }
}

interface SearchCommandProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SearchCommand({ open, onOpenChange }: SearchCommandProps) {
  const t = useTranslations("Search")
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedType, setSelectedType] = useState<SearchResultType | "all">("all")

  // Raccourci clavier Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        onOpenChange(!open)
      }
      if (open && e.key === "Escape") {
        onOpenChange(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open, onOpenChange])

  // Recherche avec debounce
  useEffect(() => {
    if (!open) {
      setQuery("")
      setResults([])
      setSelectedIndex(0)
      return
    }

    const timeoutId = setTimeout(() => {
      if (query.trim().length >= 2) {
        performSearch(query.trim())
      } else {
        setResults([])
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [query, open, selectedType])

  const performSearch = async (searchQuery: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&type=${selectedType}`)
      if (!response.ok) {
        throw new Error("Erreur lors de la recherche")
      }
      const data = await response.json()
      setResults(data.results || [])
      setSelectedIndex(0)
    } catch (error) {
      console.error("[SearchCommand] Erreur recherche:", error)
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelect = useCallback(
    (result: SearchResult) => {
      router.push(result.url)
      onOpenChange(false)
      setQuery("")
      setResults([])
    },
    [router, onOpenChange]
  )

  // Navigation au clavier
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev))
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0))
      } else if (e.key === "Enter" && results[selectedIndex]) {
        e.preventDefault()
        handleSelect(results[selectedIndex])
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open, results, selectedIndex, handleSelect])

  const getTypeIcon = (type: SearchResultType) => {
    switch (type) {
      case "document":
        return <FileText className="h-5 w-5 text-foreground" strokeWidth={2.5} />
      case "flashcard":
        return <Brain className="h-5 w-5 text-foreground" strokeWidth={2.5} />
      case "quiz":
        return <ListChecks className="h-5 w-5 text-foreground" strokeWidth={2.5} />
      case "collection":
      case "subject":
        return <BookOpen className="h-5 w-5 text-foreground" strokeWidth={2.5} />
      default:
        return <FileText className="h-5 w-5 text-foreground" strokeWidth={2.5} />
    }
  }

  const getTypeColor = (type: SearchResultType) => {
    switch (type) {
      case "document":
        return "bg-[#BAE6FD]"
      case "flashcard":
        return "bg-[#FBCFE8]"
      case "quiz":
        return "bg-[#BBF7D0]"
      case "collection":
      case "subject":
        return "bg-[#FDE68A]"
      default:
        return "bg-card"
    }
  }

  const typeFilters: Array<{ value: SearchResultType | "all"; label: string }> = [
    { value: "all", label: t("all") },
    { value: "document", label: t("documents") },
    { value: "flashcard", label: t("flashcards") },
    { value: "quiz", label: t("quiz") },
    { value: "subject", label: t("subjects") },
  ]

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
            className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm"
          />

          {/* Command Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="fixed left-1/2 top-20 z-50 w-full max-w-2xl -translate-x-1/2"
          >
            <div className="bg-card border-4 border-border shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] rounded-2xl overflow-hidden">
              {/* Header */}
              <div className="px-6 py-4 border-b-4 border-border bg-primary flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary-foreground" strokeWidth={3} />
                  <input
                    autoFocus
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t("placeholder")}
                    className="w-full h-14 pl-12 pr-12 bg-card border-4 border-border rounded-xl font-black uppercase text-foreground placeholder:text-muted-foreground focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:focus:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] focus:-translate-y-1 transition-all"
                  />
                  {query && (
                    <button
                      onClick={() => setQuery("")}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-muted transition-colors"
                    >
                      <X className="h-4 w-4 text-foreground" strokeWidth={3} />
                    </button>
                  )}
                </div>
                <button
                  onClick={() => onOpenChange(false)}
                  className="h-14 w-14 bg-card border-4 border-border rounded-xl flex items-center justify-center hover:bg-muted transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] active:translate-y-[4px] active:shadow-none"
                >
                  <X className="h-5 w-5 text-foreground" strokeWidth={3} />
                </button>
              </div>

              {/* Filters */}
              <div className="px-6 py-3 border-b-4 border-border bg-card flex items-center gap-2 overflow-x-auto">
                {typeFilters.map((filter) => (
                  <button
                    key={filter.value}
                    onClick={() => setSelectedType(filter.value)}
                    className={cn(
                      "px-4 py-2 rounded-lg border-2 border-border font-black uppercase text-sm whitespace-nowrap transition-all",
                      selectedType === filter.value
                        ? "bg-foreground text-background shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
                        : "bg-card text-foreground hover:bg-muted shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)] active:translate-y-[4px] active:shadow-none"
                    )}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              {/* Results */}
              <div className="max-h-96 overflow-y-auto bg-card">
                {isLoading ? (
                  <div className="p-8 text-center">
                    <div className="inline-block h-8 w-8 border-4 border-border border-t-primary rounded-full animate-spin" />
                    <p className="mt-4 font-black uppercase text-muted-foreground">{t("searching")}</p>
                  </div>
                ) : results.length === 0 && query.trim().length >= 2 ? (
                  <div className="p-8 text-center">
                    <p className="font-black uppercase text-muted-foreground">{t("noResults")}</p>
                    <p className="mt-2 text-sm font-bold text-muted-foreground/70">{t("tryDifferentQuery")}</p>
                  </div>
                ) : query.trim().length < 2 ? (
                  <div className="p-8 text-center">
                    <p className="font-black uppercase text-muted-foreground">{t("startTyping")}</p>
                    <p className="mt-2 text-sm font-bold text-muted-foreground/70">{t("minChars")}</p>
                  </div>
                ) : (
                  <div className="p-2">
                    {results.map((result, index) => (
                      <button
                        key={`${result.type}-${result.id}`}
                        onClick={() => handleSelect(result)}
                        className={cn(
                          "w-full p-4 rounded-xl border-2 border-border mb-2 text-left transition-all flex items-center gap-4",
                          index === selectedIndex
                            ? "bg-accent shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] -translate-y-1"
                            : "bg-card hover:bg-muted shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)]"
                        )}
                      >
                        <div
                          className={cn(
                            "h-12 w-12 rounded-xl border-2 border-border flex items-center justify-center shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]",
                            getTypeColor(result.type)
                          )}
                        >
                          {getTypeIcon(result.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-sm uppercase text-foreground truncate">{result.title}</p>
                          {result.description && (
                            <p className="text-xs font-bold text-muted-foreground mt-1 truncate">{result.description}</p>
                          )}
                          {result.subjectName && (
                            <p className="text-xs font-bold text-[#FDE68A] dark:text-[#FDE68A] mt-1 truncate">
                              📚 {result.subjectName}
                            </p>
                          )}
                          {result.metadata?.tags && result.metadata.tags.length > 0 && (
                            <div className="flex gap-1 mt-2 flex-wrap">
                              {result.metadata.tags.slice(0, 3).map((tag, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-0.5 bg-muted border border-border rounded text-xs font-bold uppercase text-muted-foreground"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <ArrowRight className="h-5 w-5 text-foreground shrink-0" strokeWidth={3} />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-3 border-t-4 border-border bg-muted flex items-center justify-between">
                <div className="flex items-center gap-4 text-xs font-bold uppercase text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <kbd className="px-2 py-1 bg-card border-2 border-border rounded font-black text-foreground">↑↓</kbd>
                    <span>{t("navigate")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <kbd className="px-2 py-1 bg-card border-2 border-border rounded font-black text-foreground">↵</kbd>
                    <span>{t("select")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <kbd className="px-2 py-1 bg-card border-2 border-border rounded font-black text-foreground">ESC</kbd>
                    <span>{t("close")}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
