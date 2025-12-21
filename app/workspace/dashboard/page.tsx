"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase-client"
import { Clock, BookOpen, TrendingUp, ArrowRight, Play, FileText, Calendar, Plus, CheckSquare, Sparkles, Smile, Brain, ListChecks } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { useSubjects } from "@/lib/hooks/useSubjects"
import { useDocuments } from "@/lib/hooks/useDocuments"
import { useQuery } from "@tanstack/react-query"

export default function DashboardPage() {
    const [user, setUser] = useState<{ email?: string } | null>(null)
    const { data: subjects = [] } = useSubjects()
    const { data: documents = [] } = useDocuments()

    // Fetch recent study collections (Quizzes / Flashcards)
    const { data: studyCollections = [] } = useQuery({
        queryKey: ["recent-study-collections"],
        queryFn: async () => {
            const res = await fetch("/api/study-subjects")
            if (!res.ok) return []
            return res.json()
        }
    })

    useEffect(() => {
        const supabase = createClient()
        supabase.auth.getUser().then(({ data }) => {
            setUser(data.user)
        })
    }, [])

    const userName = user?.email?.split('@')[0] || "Friend"
    const today = new Date().toLocaleDateString("en-US", { weekday: 'long', month: 'long', day: 'numeric' })
    const hour = new Date().getHours()
    const greeting = hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening"

    // Real Stats
    const activeSubjectsCount = subjects.length
    const totalDocsCount = documents.length
    const dayStreak = 3 // Placeholder

    // Colorful stats with rotated decorative shadows
    const stats = [
        { label: "Docs Added", value: totalDocsCount.toString(), icon: FileText, color: "bg-[#BAE6FD]", shadow: "shadow-[4px_4px_0px_0px_#7DD3FC]" },
        { label: "Subjects", value: activeSubjectsCount.toString(), icon: BookOpen, color: "bg-[#FBCFE8]", shadow: "shadow-[4px_4px_0px_0px_#F9A8D4]" },
        { label: "Streak", value: `${dayStreak} Days`, icon: Sparkles, color: "bg-[#BBF7D0]", shadow: "shadow-[4px_4px_0px_0px_#86EFAC]" },
    ]

    return (
        <div className="h-full p-8 md:p-12 font-sans overflow-y-auto pb-32">

            {/* Pop Greeting Banner */}
            <header className="mb-12 bg-white border-2 border-black rounded-3xl p-8 md:p-12 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#DDD6FE] rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 opacity-50"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#FDE68A] rounded-full blur-[60px] translate-y-1/2 -translate-x-1/2 opacity-50"></div>

                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <span className="bg-black text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(167,139,250,1)]">
                                {today}
                            </span>
                        </div>
                        <h1 className="text-4xl md:text-6xl font-black tracking-tight text-black flex flex-wrap gap-2 items-center">
                            {greeting}, <span className="bg-[#fdba74] px-4 rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] -rotate-2 inline-block text-white">{userName}</span> !
                        </h1>
                        <p className="mt-4 text-black font-semibold text-lg max-w-lg">
                            Ready to crush your study goals today? Let's get moving! 🚀
                        </p>
                    </div>
                </div>
            </header>

            {/* Stats Row */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
                {stats.map((stat, i) => (
                    <div key={i} className={cn("p-6 rounded-2xl border-2 border-black flex flex-col justify-between h-40 transition-transform hover:-translate-y-2 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]", stat.color, "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]")}>
                        <div className="flex justify-between items-start">
                            <div className="p-3 bg-white rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                <stat.icon className="h-6 w-6 text-black" strokeWidth={2.5} />
                            </div>
                        </div>
                        <div>
                            <p className="text-4xl font-black text-black">{stat.value}</p>
                            <p className="font-bold text-sm uppercase tracking-wide text-black/70">{stat.label}</p>
                        </div>
                    </div>
                ))}
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">

                {/* Main Action Area */}
                <div className="lg:col-span-2 space-y-12">

                    {/* Subjects Carousel */}
                    <div className="bg-[#FFFFFF] border-2 border-black rounded-3xl p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-3">
                                <BookOpen className="h-6 w-6 fill-black" strokeWidth={2.5} />
                                Jump Back In
                            </h2>
                            <Link href="/workspace/subjects" className="text-sm font-bold underline hover:text-purple-600">View All</Link>
                        </div>

                        {activeSubjectsCount > 0 ? (
                            <div className="flex gap-6 overflow-x-auto pb-6 pt-4 scrollbar-hide">
                                {[...subjects]
                                    .sort((a: any, b: any) => new Date(b.last_active || 0).getTime() - new Date(a.last_active || 0).getTime())
                                    .slice(0, 5)
                                    .map((subject: any, i: number) => {
                                        const cardColors = ["bg-[#BAE6FD]", "bg-[#FBCFE8]", "bg-[#BBF7D0]", "bg-[#FDE68A]", "bg-[#DDD6FE]"]
                                        const color = cardColors[i % cardColors.length]

                                        return (
                                            <Link href={`/workspace/subjects/${subject.id}`} key={subject.id} className="min-w-[260px] md:min-w-[280px]">
                                                <div className={cn(
                                                    "relative overflow-hidden border-2 border-black rounded-2xl p-6 transition-all duration-300 hover:-translate-y-2 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] h-[180px] flex flex-col justify-between group",
                                                    color
                                                )}>
                                                    <div className="flex justify-between items-center">
                                                        <div className="h-10 w-10 bg-white rounded-lg border-2 border-black flex items-center justify-center shadow-sm group-hover:rotate-12 transition-transform">
                                                            <BookOpen className="h-5 w-5 text-black" strokeWidth={2.5} />
                                                        </div>
                                                        <div className="bg-black/10 px-2 py-1 rounded-md border text-[10px] font-black uppercase text-black/70 border-black/10">
                                                            Subject
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <h3 className="text-xl font-black leading-tight mb-1 line-clamp-1 text-black">{subject.title}</h3>
                                                        <div className="flex items-center justify-between mt-2">
                                                            <p className="text-xs font-bold text-black/60 uppercase group-hover:text-black transition-colors">
                                                                {subject.doc_count || 0} Documents
                                                            </p>
                                                            <div className="h-8 w-8 rounded-full bg-black flex items-center justify-center opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                                                                <ArrowRight className="h-4 w-4 text-white" strokeWidth={3} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </Link>
                                        )
                                    })}
                            </div>
                        ) : (
                            <div className="text-center py-12 bg-[#FDF6E3] border-2 border-dashed border-black rounded-2xl">
                                <h3 className="text-xl font-black mb-2">Nothing here yet! 🐣</h3>
                                <p className="font-medium text-gray-500 mb-6">Create a subject to get the party started.</p>
                                <Link href="/workspace/subjects">
                                    <Button className="h-12 border-2 border-black rounded-xl bg-[#8B5CF6] text-white hover:bg-[#7C3AED] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                        <Plus className="mr-2 h-5 w-5" strokeWidth={3} /> New Subject
                                    </Button>
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Recent Files List */}
                    <div>
                        <h3 className="text-xl font-black uppercase mb-6 flex items-center gap-2">
                            <span className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white text-sm">#</span>
                            Recent Documents
                        </h3>

                        <div className="bg-white border-2 border-black rounded-2xl overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                            {documents.slice(0, 5).map((doc, i) => (
                                <Link href={doc.subject_id ? `/workspace/subjects/${doc.subject_id}` : '/workspace/subjects'} key={i}>
                                    <div className={cn("p-5 flex items-center gap-4 hover:bg-[#F0FDF4] transition-colors cursor-pointer group", i !== documents.slice(0, 5).length - 1 && "border-b-2 border-black")}>
                                        <div className="h-10 w-10 bg-[#BBF7D0] border-2 border-black rounded-lg flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                            <FileText className="h-5 w-5 text-black" strokeWidth={2.5} />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-bold text-black">{doc.title}</h4>
                                            <p className="text-xs font-bold text-gray-400 uppercase">{new Date(doc.created_at).toLocaleDateString()}</p>
                                        </div>
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                            <ArrowRight className="h-5 w-5 text-black" strokeWidth={3} />
                                        </div>
                                    </div>
                                </Link>
                            ))}
                            {documents.length === 0 && (
                                <div className="p-8 text-center text-gray-400 font-bold italic">
                                    No documents found.
                                </div>
                            )}
                            <div className="p-4 bg-gray-50 border-t-2 border-black text-center">
                                <Link href="/workspace/subjects">
                                    <button className="text-xs font-black uppercase hover:underline">View All Documents</button>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar Widget Area */}
                <div className="space-y-8">
                    {/* Recent Quizzes Widget */}
                    <div className="bg-[#FEF08A] border-2 border-black rounded-3xl p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                        <h3 className="font-black text-xl mb-6 flex items-center gap-2">
                            <Brain className="h-6 w-6" />
                            Recent Study Sets
                        </h3>

                        <div className="space-y-4">
                            {studyCollections.slice(0, 3).map((item: any) => (
                                <div key={item.id} className="bg-white border-2 border-black rounded-xl p-4 shadow-sm hover:translate-x-1 transition-transform cursor-pointer">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-[10px] font-black uppercase bg-black text-white px-2 py-0.5 rounded">
                                            {item.metadata?.type || "STUDY"}
                                        </span>
                                        <ArrowRight className="h-4 w-4" />
                                    </div>
                                    <h4 className="font-bold leading-tight">{item.title}</h4>
                                </div>
                            ))}
                            {studyCollections.length === 0 && (
                                <div className="text-center text-sm font-bold text-gray-500 py-4">
                                    No study sets yet.
                                </div>
                            )}
                        </div>
                        <div className="mt-6 pt-4 border-t-2 border-black/10 text-center">
                            <Link href="/workspace/quiz">
                                <button className="text-xs font-black uppercase hover:underline">Go to Quiz Hub</button>
                            </Link>
                        </div>
                    </div>

                    {/* To Do (Mock for now, can be turned into a "What's New" or feature highlight) */}
                    <div className="bg-[#FBCFE8] border-2 border-black rounded-3xl p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] relative rotate-1 hover:rotate-0 transition-transform duration-300">
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white border-2 border-black px-4 py-1 rounded-full text-xs font-black uppercase shadow-sm z-10">PRO TIP</div>
                        <h3 className="font-black text-xl mb-4 text-center mt-2">Keyboard Shortcuts</h3>
                        <div className="text-sm font-bold text-center">
                            Press <span className="bg-white border border-black rounded px-1">Cmd</span> + <span className="bg-white border border-black rounded px-1">K</span> to search
                        </div>
                    </div>
                </div>

            </div>
        </div>
    )
}
