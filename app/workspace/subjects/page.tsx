"use client"

import { Button } from "@/components/ui/button"
import { Play, Star, BookOpen, MoreVertical, LayoutGrid, List, Plus, Trash2, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useSubjects, useDeleteSubject, useUpdateSubject } from "@/lib/hooks/useSubjects"
import Link from "next/link"
import { useState } from "react"
import { cn } from "@/lib/utils"

import { CreateSubjectDialog } from "@/components/workspace/CreateSubjectDialog"
import DeleteSubjectDialog from "@/components/DeleteSubjectDialog"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { useTranslations, useFormatter } from "next-intl"

export default function SubjectsPage() {
    const t = useTranslations("Subjects")
    const format = useFormatter()
    const { data: subjects = [], isLoading } = useSubjects()
    const deleteSubjectMutation = useDeleteSubject()
    const updateSubjectMutation = useUpdateSubject()
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
    const [searchQuery, setSearchQuery] = useState('')
    const [isCreateSubjectOpen, setIsCreateSubjectOpen] = useState(false)
    const [subjectToDelete, setSubjectToDelete] = useState<any>(null)

    const handleDeleteConfirm = async () => {
        if (!subjectToDelete) return

        try {
            await deleteSubjectMutation.mutateAsync(subjectToDelete.id)
            setSubjectToDelete(null)
        } catch (error) {
            console.error("Error deleting subject:", error)
        }
    }

    const handleToggleFavorite = (subject: any) => {
        updateSubjectMutation.mutate({
            id: subject.id,
            is_favorite: !subject.is_favorite
        })
    }

    // Neo-Brutalism Colors for rotation
    const colors = ["bg-[#FDE68A]", "bg-[#FBCFE8]", "bg-[#BAE6FD]", "bg-[#BBF7D0]", "bg-[#DDD6FE]"]

    const filteredSubjects = subjects.filter((s: any) =>
        s.title.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="h-full p-8 md:p-12 font-sans overflow-y-auto overflow-x-hidden">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
                <div>
                    <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-foreground flex items-center gap-4">
                        {t('title')} <span className="text-2xl md:text-4xl bg-[#FBCFE8] border-2 border-border rounded-full w-16 h-16 flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] rotate-12 text-foreground">{subjects.length}</span>
                    </h1>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto">
                    <Input
                        placeholder={t('searchPlaceholder')}
                        className="w-full md:w-64 border-2 border-border shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-none transition-all uppercase font-bold"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <div className="hidden md:flex bg-card border-2 border-border rounded-xl p-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
                        <button onClick={() => setViewMode('grid')} className={cn("p-2 rounded-lg transition-colors border-2 border-transparent", viewMode === 'grid' ? "bg-foreground text-background" : "hover:bg-muted text-foreground")}>
                            <LayoutGrid className="h-5 w-5" strokeWidth={2.5} />
                        </button>
                        <button onClick={() => setViewMode('list')} className={cn("p-2 rounded-lg transition-colors border-2 border-transparent", viewMode === 'list' ? "bg-foreground text-background" : "hover:bg-muted text-foreground")}>
                            <List className="h-5 w-5" strokeWidth={2.5} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Loading State */}
            {isLoading && (
                <div className="flex flex-col items-center justify-center py-24">
                    <div className="bg-card border-2 border-border rounded-3xl p-12 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)]">
                        <div className="flex flex-col items-center gap-6">
                            <div className="relative">
                                <div className="w-16 h-16 rounded-full border-4 border-border/10"></div>
                                <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-border border-t-transparent animate-spin"></div>
                            </div>
                            <p className="text-xl font-black uppercase text-foreground">{t('loading')}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Empty State */}
            {!isLoading && filteredSubjects.length === 0 && (
                <div className="relative flex items-center justify-center min-h-[500px] px-4">
                    {/* Decorative Background Elements */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className="absolute top-10 left-10 w-24 h-24 bg-[#FBCFE8] rounded-full border-2 border-border opacity-20 animate-pulse"></div>
                        <div className="absolute bottom-10 right-10 w-32 h-32 bg-[#BAE6FD] rounded-full border-2 border-border opacity-20 animate-pulse" style={{ animationDelay: '1s' }}></div>
                        <div className="absolute top-1/3 right-1/3 w-20 h-20 bg-[#BBF7D0] rounded-full border-2 border-border opacity-20 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                    </div>

                    {/* Main Content - Horizontal Layout */}
                    <div className="relative bg-card border-4 border-border rounded-3xl shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] dark:shadow-[12px_12px_0px_0px_rgba(255,255,255,1)] max-w-5xl w-full overflow-hidden">
                        {/* Top Accent Bar */}
                        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#FBBF24] via-[#FBCFE8] to-[#BAE6FD]"></div>

                        <div className="flex flex-col md:flex-row items-center gap-8 p-12">
                            {/* Left Side - Icon */}
                            <div className="flex-shrink-0">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-[#DDD6FE] rounded-full blur-2xl opacity-40 animate-pulse"></div>
                                    <div className="relative bg-gradient-to-br from-[#DDD6FE] to-[#BAE6FD] p-10 rounded-3xl border-4 border-border shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] hover:scale-105 transition-transform duration-300">
                                        <BookOpen className="h-20 w-20 text-foreground" strokeWidth={2.5} />
                                    </div>
                                </div>
                            </div>

                            {/* Right Side - Content */}
                            <div className="flex-1 text-center md:text-left">
                                <h2 className="text-4xl md:text-5xl font-black uppercase mb-3 tracking-tight text-foreground">
                                    {t('noSubjectsTitle')}
                                </h2>
                                <p className="text-lg font-bold text-muted-foreground mb-2">
                                    {t('noSubjectsSubtitle')}
                                </p>
                                <p className="text-base font-medium text-muted-foreground mb-6 leading-relaxed max-w-xl">
                                    {t('noSubjectsDesc')}
                                </p>

                                {/* CTA Button */}
                                <Button
                                    onClick={() => setIsCreateSubjectOpen(true)}
                                    className="group h-14 px-8 rounded-xl border-4 border-border bg-accent hover:bg-accent/90 text-foreground text-lg font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] hover:-translate-y-0.5 transition-all duration-200 active:translate-y-1 active:shadow-none uppercase mb-6"
                                >
                                    <Plus className="mr-2 h-6 w-6 group-hover:rotate-90 transition-transform duration-300" strokeWidth={3} />
                                    {t('createFirstSubject')}
                                </Button>

                                {/* Quick Tips - Horizontal */}
                                <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                                    {[
                                        { icon: "📚", text: t('tips.upload') },
                                        { icon: "🤖", text: t('tips.ai') },
                                        { icon: "⚡", text: t('tips.flash') },
                                        { icon: "🎯", text: t('tips.quiz') }
                                    ].map((tip, i) => (
                                        <div
                                            key={i}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-card border-2 border-border rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] hover:-translate-y-0.5 transition-all"
                                        >
                                            <span className="text-base">{tip.icon}</span>
                                            <span className="text-xs font-bold text-foreground">{tip.text}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Grid View */}
            {!isLoading && viewMode === 'grid' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredSubjects.map((subject: any) => {
                        // Use stored color if available and valid (starts with bg-), otherwise fallback to deterministic hash
                        const savedColor = subject.color && subject.color.startsWith('bg-') ? subject.color : null
                        const colorIndex = subject.id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0)
                        const color = savedColor || colors[colorIndex % colors.length]

                        return (
                            <Link href={`/workspace/subjects/${subject.id}`} key={subject.id}>
                                <div className={cn("bg-card border-2 border-border rounded-3xl p-6 h-64 flex flex-col justify-between shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] hover:-translate-y-2 hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[10px_10px_0px_0px_rgba(255,255,255,1)] transition-all duration-200 ease-out group relative overflow-hidden")}>
                                    {/* Decorative Blob */}
                                    <div className={cn("absolute -right-8 -top-8 w-32 h-32 rounded-full border-2 border-border opacity-100 transition-transform duration-300 group-hover:scale-110", color)}></div>

                                    <div className="relative z-10">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-2">
                                                <div className="bg-foreground text-background px-3 py-1 rounded-lg text-xs font-black uppercase">
                                                    {subject.created_at ? format.dateTime(new Date(subject.created_at), { dateStyle: 'medium' }) : t('noDate')}
                                                </div>
                                                {subject.is_favorite && (
                                                    <div className="bg-accent text-foreground border-2 border-border p-1 rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
                                                        <Star className="h-3 w-3" fill="currentColor" strokeWidth={2.5} />
                                                    </div>
                                                )}
                                            </div>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild onClick={(e) => {
                                                    e.preventDefault()
                                                    e.stopPropagation()
                                                }}>
                                                    <button className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-black/5 transition-colors focus:outline-none focus:ring-2 focus:ring-black">
                                                        <MoreVertical className="h-5 w-5" strokeWidth={2.5} />
                                                    </button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-48 border-2 border-border shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] p-0 bg-card rounded-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
                                                    <DropdownMenuItem
                                                        className="p-3 hover:bg-yellow-50 focus:bg-yellow-50 text-black font-bold uppercase cursor-pointer flex items-center gap-2"
                                                        onClick={(e) => {
                                                            e.preventDefault()
                                                            e.stopPropagation()
                                                            handleToggleFavorite(subject)
                                                        }}
                                                    >
                                                        <Star className={cn("h-4 w-4", subject.is_favorite && "fill-black")} />
                                                        {subject.is_favorite ? t('unfavorite') : t('favorite')}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        className="p-3 hover:bg-red-50 focus:bg-red-50 text-red-600 font-bold uppercase cursor-pointer flex items-center gap-2"
                                                        onClick={(e) => {
                                                            e.preventDefault()
                                                            e.stopPropagation()
                                                            setSubjectToDelete(subject)
                                                        }}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                        {t('delete')}
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                        <h3 className="text-3xl font-black leading-none tracking-tight uppercase line-clamp-3 mb-2 break-words text-foreground">
                                            {subject.title}
                                        </h3>
                                    </div>

                                    <div className="relative z-10 flex items-center justify-between mt-auto pt-4 border-t-2 border-border/5">
                                        <span className="font-bold text-sm text-muted-foreground uppercase">{subject.doc_count || 0} {t('docs')}</span>
                                        <div className="h-10 w-10 bg-foreground rounded-full flex items-center justify-center text-background group-hover:bg-accent group-hover:text-foreground transition-colors border-2 border-transparent group-hover:border-border">
                                            <ArrowRight className="h-5 w-5" strokeWidth={3} />
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        )
                    })}
                    {/* Create New Card - Only show when there are existing subjects */}
                    {filteredSubjects.length > 0 && (
                                                    <button onClick={() => setIsCreateSubjectOpen(true)} className="border-4 border-dashed border-border/20 rounded-3xl p-6 h-64 flex flex-col items-center justify-center gap-4 hover:border-border hover:bg-muted/50 transition-all duration-200 ease-out group">
                            <div className="h-16 w-16 rounded-full bg-[#BBF7D0] border-2 border-border flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] group-hover:scale-110 transition-transform">
                                <Plus className="h-8 w-8 text-foreground" strokeWidth={3} />
                            </div>
                            <span className="font-black text-xl uppercase text-foreground">{t('createNew')}</span>
                        </button>
                    )}
                </div>
            )}

            {/* List View */}
            {!isLoading && viewMode === 'list' && (
                <div className="flex flex-col gap-4">
                    {filteredSubjects.map((subject: any) => {
                        // Use stored color if available and valid (starts with bg-), otherwise fallback to deterministic hash
                        const savedColor = subject.color && subject.color.startsWith('bg-') ? subject.color : null
                        const colorIndex = subject.id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0)
                        const color = savedColor || colors[colorIndex % colors.length]

                        return (
                            <Link href={`/workspace/subjects/${subject.id}`} key={subject.id}>
                                <div className="bg-card border-2 border-border rounded-xl p-4 flex items-center justify-between shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)] transition-all duration-200 ease-out group">
                                    <div className="flex items-center gap-4">
                                        <div className={cn("w-12 h-12 rounded-full border-2 border-border flex items-center justify-center font-black text-lg text-foreground", color)}>
                                            {subject.title.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="font-black text-xl uppercase flex items-center gap-2 text-foreground">
                                                {subject.title}
                                                {subject.is_favorite && (
                                                    <div className="bg-accent border-2 border-border p-1 rounded-full shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
                                                        <Star className="h-2 w-2" fill="currentColor" strokeWidth={2.5} />
                                                    </div>
                                                )}
                                            </h3>
                                            <p className="text-xs font-bold text-muted-foreground uppercase">{subject.doc_count || 0} {t('docs')} • {subject.created_at ? format.dateTime(new Date(subject.created_at), { dateStyle: 'medium' }) : t('noDate')}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild onClick={(e) => {
                                                e.preventDefault()
                                                e.stopPropagation()
                                            }}>
                                                <button className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-border text-foreground">
                                                    <MoreVertical className="h-5 w-5" strokeWidth={2.5} />
                                                </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-48 border-2 border-border shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] p-0 bg-card rounded-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
                                                <DropdownMenuItem
                                                    className="p-3 hover:bg-accent/20 focus:bg-accent/20 text-foreground font-bold uppercase cursor-pointer flex items-center gap-2"
                                                    onClick={(e) => {
                                                        e.preventDefault()
                                                        e.stopPropagation()
                                                        handleToggleFavorite(subject)
                                                    }}
                                                >
                                                    <Star className={cn("h-4 w-4", subject.is_favorite && "fill-current")} />
                                                    {subject.is_favorite ? t('unfavorite') : t('favorite')}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    className="p-3 hover:bg-destructive/10 focus:bg-destructive/10 text-destructive font-bold uppercase cursor-pointer flex items-center gap-2"
                                                    onClick={(e) => {
                                                        e.preventDefault()
                                                        e.stopPropagation()
                                                        setSubjectToDelete(subject)
                                                    }}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                    {t('delete')}
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                        <div className="h-10 w-10 bg-foreground rounded-full flex items-center justify-center text-background group-hover:bg-accent group-hover:text-foreground transition-colors border-2 border-transparent group-hover:border-border">
                                            <ArrowRight className="h-5 w-5" strokeWidth={3} />
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        )
                    })}
                    {/* Create New List Item - Only show when there are existing subjects */}
                    {filteredSubjects.length > 0 && (
                        <button onClick={() => setIsCreateSubjectOpen(true)} className="border-2 border-dashed border-border/20 rounded-xl p-4 flex items-center justify-center gap-4 hover:border-border hover:bg-muted/50 transition-all duration-200 ease-out group">
                            <Plus className="h-6 w-6 text-muted-foreground group-hover:text-foreground" strokeWidth={3} />
                            <span className="font-black text-lg uppercase text-muted-foreground group-hover:text-foreground">{t('createFirstSubject')}</span>
                        </button>
                    )}
                </div>
            )}

            <CreateSubjectDialog open={isCreateSubjectOpen} onOpenChange={setIsCreateSubjectOpen} />

            <DeleteSubjectDialog
                isOpen={!!subjectToDelete}
                onClose={() => setSubjectToDelete(null)}
                onConfirm={handleDeleteConfirm}
                subjectTitle={subjectToDelete?.title || ''}
                isDeleting={deleteSubjectMutation.isPending}
            />
        </div>
    )
}

function ArrowRight(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
        </svg>
    )
}
