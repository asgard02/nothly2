"use client"

import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { ArrowLeft, BookOpen, Star, MoreVertical, FileText, Brain, Sparkles, Plus, ArrowRight, LayoutGrid, List } from "lucide-react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { useSubjects } from "@/lib/hooks/useSubjects"
import { cn } from "@/lib/utils"

export default function FavoritesPage() {
    const { data: subjects = [], isLoading } = useSubjects()

    // Config pour l'animation et couleurs
    const colors = ["bg-[#FDE68A]", "bg-[#FBCFE8]", "bg-[#BAE6FD]", "bg-[#BBF7D0]", "bg-[#DDD6FE]"]

    const favoriteSubjects = subjects.filter((s: any) => s.is_favorite)

    return (
        <div className="h-full p-8 md:p-12 font-sans overflow-y-auto overflow-x-hidden">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6 pb-8 border-b-2 border-black/10">
                <div>
                    <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-black flex items-center gap-4">
                        FAVORITES <span className="text-sm md:text-xl bg-[#FBBF24] text-black border-2 border-black px-4 py-1 rounded-full -rotate-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">{favoriteSubjects.length}</span>
                    </h1>
                </div>
            </div>

            {/* Content Area */}
            {favoriteSubjects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {favoriteSubjects.map((subject: any) => {
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
                                                <div className="bg-[#FBBF24] text-black border-2 border-black p-1 rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                                    <Star className="h-3 w-3" fill="black" strokeWidth={2.5} />
                                                </div>
                                            </div>
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
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    <div className="bg-[#BAE6FD] border-2 border-black rounded-3xl p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden group">
                        <div className="absolute top-4 right-4 animate-spin-slow">
                            <Star className="h-32 w-32 text-black opacity-10" />
                        </div>

                        <h2 className="text-4xl font-black uppercase mb-4 leading-tight">Your Personal<br />Hall of Fame.</h2>
                        <p className="font-bold text-lg mb-8 max-w-md">
                            Pin your most important subjects and documents here for lightning-fast access.
                        </p>

                        <div className="bg-white border-2 border-black rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                            <div className="flex items-center gap-4 mb-4 opacity-50">
                                <div className="h-12 w-12 bg-gray-200 rounded-lg border-2 border-black"></div>
                                <div className="h-4 bg-gray-200 w-32 rounded-full"></div>
                                <div className="ml-auto h-8 w-8 border-2 border-black rounded-full flex items-center justify-center">
                                    <Star className="h-4 w-4" fill="black" />
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 bg-[#FBCFE8] rounded-lg border-2 border-black flex items-center justify-center">
                                    <BookOpen className="h-6 w-6" />
                                </div>
                                <div className="font-black text-xl">Calculus I</div>
                                <div className="ml-auto h-8 w-8 bg-[#FBBF24] border-2 border-black rounded-full flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                    <Star className="h-4 w-4" fill="black" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col justify-center space-y-6">
                        <div className="p-6 border-2 border-black rounded-2xl bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-4">
                            <div className="h-12 w-12 bg-black text-white rounded-xl flex items-center justify-center text-xl font-black">A.</div>
                            <div>
                                <h3 className="font-black text-xl">Star Subjects.</h3>
                                <p className="font-bold text-gray-400 text-sm">Keep your current focus top of mind.</p>
                            </div>
                        </div>

                        <div className="p-6 border-2 border-black rounded-2xl bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-4">
                            <div className="h-12 w-12 bg-black text-white rounded-xl flex items-center justify-center text-xl font-black">B.</div>
                            <div>
                                <h3 className="font-black text-xl">Key Documents.</h3>
                                <p className="font-bold text-gray-400 text-sm">Never lose track of that one cheat sheet.</p>
                            </div>
                        </div>

                        <Link href="/workspace/subjects">
                            <Button className="w-full h-16 rounded-2xl border-2 border-black bg-[#BBF7D0] text-black text-xl font-black uppercase hover:bg-[#86EFAC] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] transition-all active:shadow-none">
                                Browse Subjects <ArrowRight className="ml-2 h-6 w-6" strokeWidth={3} />
                            </Button>
                        </Link>
                    </div>
                </div>
            )}
        </div>
    )
}
