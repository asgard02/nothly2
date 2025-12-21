"use client"

import { Button } from "@/components/ui/button"
import { Play, Star, BookOpen, MoreVertical, LayoutGrid, List, Plus, Trash2 } from "lucide-react"
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

export default function SubjectsPage() {
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
                    <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-black flex items-center gap-4">
                        My Subjects <span className="text-2xl md:text-4xl bg-[#FBCFE8] border-2 border-black rounded-full w-16 h-16 flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] rotate-12">{subjects.length}</span>
                    </h1>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto">
                    <Input
                        placeholder="SEARCH..."
                        className="w-full md:w-64 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:translate-x-[2px] focus:translate-y-[2px] focus:shadow-none transition-all uppercase font-bold"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <div className="hidden md:flex bg-white border-2 border-black rounded-xl p-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        <button onClick={() => setViewMode('grid')} className={cn("p-2 rounded-lg transition-colors border-2 border-transparent", viewMode === 'grid' ? "bg-black text-white" : "hover:bg-gray-100")}>
                            <LayoutGrid className="h-5 w-5" strokeWidth={2.5} />
                        </button>
                        <button onClick={() => setViewMode('list')} className={cn("p-2 rounded-lg transition-colors border-2 border-transparent", viewMode === 'list' ? "bg-black text-white" : "hover:bg-gray-100")}>
                            <List className="h-5 w-5" strokeWidth={2.5} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Empty State */}
            {!isLoading && filteredSubjects.length === 0 && (
                <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed border-black rounded-3xl bg-white/50">
                    <div className="bg-[#DDD6FE] p-6 rounded-full border-2 border-black mb-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                        <BookOpen className="h-12 w-12 text-black" strokeWidth={2} />
                    </div>
                    <h3 className="text-2xl font-black uppercase mb-2">No subjects found</h3>
                    <p className="font-bold text-gray-500 mb-8">Create your first subject to get started!</p>
                    <Button onClick={() => setIsCreateSubjectOpen(true)} className="h-14 px-8 rounded-xl border-2 border-black bg-[#FBBF24] text-black hover:bg-[#F59E0B] text-lg font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] transition-all active:shadow-none">
                        <Plus className="mr-2 h-6 w-6" strokeWidth={3} /> Create New Subject
                    </Button>
                </div>
            )}

            {/* Grid View */}
            {viewMode === 'grid' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {filteredSubjects.map((subject: any) => {
                        // Use stored color if available and valid (starts with bg-), otherwise fallback to deterministic hash
                        const savedColor = subject.color && subject.color.startsWith('bg-') ? subject.color : null
                        const colorIndex = subject.id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0)
                        const color = savedColor || colors[colorIndex % colors.length]

                        return (
                            <Link href={`/workspace/subjects/${subject.id}`} key={subject.id}>
                                <div className={cn("bg-white border-2 border-black rounded-3xl p-6 h-64 flex flex-col justify-between shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-2 hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] transition-all duration-200 ease-out group relative overflow-hidden")}>
                                    {/* Decorative Blob */}
                                    <div className={cn("absolute -right-8 -top-8 w-32 h-32 rounded-full border-2 border-black opacity-100 transition-transform duration-300 group-hover:scale-110", color)}></div>

                                    <div className="relative z-10">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-2">
                                                <div className="bg-black text-white px-3 py-1 rounded-lg text-xs font-black uppercase">
                                                    {subject.created_at ? new Date(subject.created_at).toLocaleDateString() : 'No Date'}
                                                </div>
                                                {subject.is_favorite && (
                                                    <div className="bg-[#FBBF24] text-black border-2 border-black p-1 rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                                        <Star className="h-3 w-3" fill="black" strokeWidth={2.5} />
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
                                                <DropdownMenuContent align="end" className="w-48 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-0 bg-white rounded-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
                                                    <DropdownMenuItem
                                                        className="p-3 hover:bg-yellow-50 focus:bg-yellow-50 text-black font-bold uppercase cursor-pointer flex items-center gap-2"
                                                        onClick={(e) => {
                                                            e.preventDefault()
                                                            e.stopPropagation()
                                                            handleToggleFavorite(subject)
                                                        }}
                                                    >
                                                        <Star className={cn("h-4 w-4", subject.is_favorite && "fill-black")} />
                                                        {subject.is_favorite ? "Unfavorite" : "Favorite"}
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
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                        <h3 className="text-3xl font-black leading-none tracking-tight uppercase line-clamp-3 mb-2 break-words">
                                            {subject.title}
                                        </h3>
                                    </div>

                                    <div className="relative z-10 flex items-center justify-between mt-auto pt-4 border-t-2 border-black/5">
                                        <span className="font-bold text-sm text-gray-500 uppercase">{subject.doc_count || 0} Docs</span>
                                        <div className="h-10 w-10 bg-black rounded-full flex items-center justify-center text-white group-hover:bg-[#FBBF24] group-hover:text-black transition-colors border-2 border-transparent group-hover:border-black">
                                            <ArrowRight className="h-5 w-5" strokeWidth={3} />
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        )
                    })}
                    {/* Create New Card */}
                    <button onClick={() => setIsCreateSubjectOpen(true)} className="border-4 border-dashed border-black/20 rounded-3xl p-6 h-64 flex flex-col items-center justify-center gap-4 hover:border-black hover:bg-[#F0FDF4] transition-all duration-200 ease-out group">
                        <div className="h-16 w-16 rounded-full bg-[#BBF7D0] border-2 border-black flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] group-hover:scale-110 transition-transform">
                            <Plus className="h-8 w-8 text-black" strokeWidth={3} />
                        </div>
                        <span className="font-black text-xl uppercase">Create New</span>
                    </button>
                </div>
            )}

            {/* List View */}
            {viewMode === 'list' && (
                <div className="flex flex-col gap-4">
                    {filteredSubjects.map((subject: any) => {
                        // Use stored color if available and valid (starts with bg-), otherwise fallback to deterministic hash
                        const savedColor = subject.color && subject.color.startsWith('bg-') ? subject.color : null
                        const colorIndex = subject.id.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0)
                        const color = savedColor || colors[colorIndex % colors.length]

                        return (
                            <Link href={`/workspace/subjects/${subject.id}`} key={subject.id}>
                                <div className="bg-white border-2 border-black rounded-xl p-4 flex items-center justify-between shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all duration-200 ease-out group">
                                    <div className="flex items-center gap-4">
                                        <div className={cn("w-12 h-12 rounded-full border-2 border-black flex items-center justify-center font-black text-lg", color)}>
                                            {subject.title.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="font-black text-xl uppercase flex items-center gap-2">
                                                {subject.title}
                                                {subject.is_favorite && (
                                                    <div className="bg-[#FBBF24] border-2 border-black p-1 rounded-full shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                                        <Star className="h-2 w-2" fill="black" strokeWidth={2.5} />
                                                    </div>
                                                )}
                                            </h3>
                                            <p className="text-xs font-bold text-gray-500 uppercase">{subject.doc_count || 0} Docs • {subject.created_at ? new Date(subject.created_at).toLocaleDateString() : 'No Date'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild onClick={(e) => {
                                                e.preventDefault()
                                                e.stopPropagation()
                                            }}>
                                                <button className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-black/5 transition-colors focus:outline-none focus:ring-2 focus:ring-black">
                                                    <MoreVertical className="h-5 w-5" strokeWidth={2.5} />
                                                </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-48 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-0 bg-white rounded-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
                                                <DropdownMenuItem
                                                    className="p-3 hover:bg-yellow-50 focus:bg-yellow-50 text-black font-bold uppercase cursor-pointer flex items-center gap-2"
                                                    onClick={(e) => {
                                                        e.preventDefault()
                                                        e.stopPropagation()
                                                        handleToggleFavorite(subject)
                                                    }}
                                                >
                                                    <Star className={cn("h-4 w-4", subject.is_favorite && "fill-black")} />
                                                    {subject.is_favorite ? "Unfavorite" : "Favorite"}
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
                                                    Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                        <div className="h-10 w-10 bg-black rounded-full flex items-center justify-center text-white group-hover:bg-[#FBBF24] group-hover:text-black transition-colors border-2 border-transparent group-hover:border-black">
                                            <ArrowRight className="h-5 w-5" strokeWidth={3} />
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        )
                    })}
                    {/* Create New List Item */}
                    <button onClick={() => setIsCreateSubjectOpen(true)} className="border-2 border-dashed border-black/20 rounded-xl p-4 flex items-center justify-center gap-4 hover:border-black hover:bg-[#F0FDF4] transition-all duration-200 ease-out group">
                        <Plus className="h-6 w-6 text-black/50 group-hover:text-black" strokeWidth={3} />
                        <span className="font-black text-lg uppercase text-black/50 group-hover:text-black">Create New Subject</span>
                    </button>
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
