"use client"

import { useState } from "react"
import { Search, Brain, Clock, BarChart, ArrowRight, X, Check, Play, AlertTriangle, Sparkles, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { useQuery } from "@tanstack/react-query"

export default function QuizPage() {
    const [activeQuiz, setActiveQuiz] = useState<any | null>(null)
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
    const [selectedOption, setSelectedOption] = useState<number | null>(null)
    const [isAnswerRevealed, setIsAnswerRevealed] = useState(false)
    const [score, setScore] = useState(0)

    // Fetch real study collections
    const { data: studyCollections = [], isLoading } = useQuery({
        queryKey: ["study-collections"],
        queryFn: async () => {
            const res = await fetch("/api/study-subjects")
            if (!res.ok) throw new Error("Failed to load quizzes")
            return res.json()
        }
    })

    // Filter relevant quizzes
    const quizzes = studyCollections.filter((item: any) =>
        item.metadata?.type === 'quiz' || (item.total_quiz && item.total_quiz > 0)
    )

    // Mock Questions for DEMO ONLY (triggered by a special demo button)
    const demoQuiz = {
        title: "NEO-POP DESIGN QUIZ",
        questions: [
            {
                prompt: "WHAT IS THE KEY FEATURE of Neo-Brutalism?",
                options: ["Soft Shadows", "High Contrast & Hard Borders", "Gradient Mesh", "Invisible Text"],
                answer: "High Contrast & Hard Borders"
            }
        ]
    }

    const startQuiz = (quiz: any) => {
        if (quiz === demoQuiz) {
            setActiveQuiz(quiz)
            setCurrentQuestionIndex(0)
            setScore(0)
            setIsAnswerRevealed(false)
            setSelectedOption(null)
            return
        }

        // Fetch full quiz details
        fetchFullQuiz(quiz.id)
    }

    const fetchFullQuiz = async (id: string) => {
        try {
            const res = await fetch(`/api/study-subjects/${id}`)
            if (res.ok) {
                const data = await res.json()
                // Transform data to match our simple execution format
                const formattedQuiz = {
                    title: data.title,
                    questions: data.quiz || data.quizQuestions || [] // Handle schema variations
                }
                setActiveQuiz(formattedQuiz)
                setCurrentQuestionIndex(0)
                setScore(0)
                setIsAnswerRevealed(false)
                setSelectedOption(null)
            }
        } catch (e) {
            console.error(e)
        }
    }

    const handleOptionSelect = (index: number) => {
        if (isAnswerRevealed) return
        setSelectedOption(index)
    }

    const checkAnswer = () => {
        setIsAnswerRevealed(true)
        const currentQuestion = activeQuiz.questions[currentQuestionIndex]
        const selectedText = currentQuestion.options[selectedOption!]

        if (selectedText === currentQuestion.answer) {
            setScore(prev => prev + 1)
        }
    }

    const nextQuestion = () => {
        if (currentQuestionIndex < activeQuiz.questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1)
            setIsAnswerRevealed(false)
            setSelectedOption(null)
        } else {
            // End of quiz
            alert(`Quiz Complete! Score: ${score}/${activeQuiz.questions.length}`)
            setActiveQuiz(null)
        }
    }

    return (
        <div className="h-full flex flex-col p-8 md:p-12 font-sans overflow-y-auto overflow-x-hidden">

            {/* Header */}
            <div className="mb-12 border-b-2 border-black pb-8 flex flex-col md:flex-row justify-between items-end">
                <div>
                    <h1 className="text-5xl md:text-8xl font-black tracking-tighter text-black flex items-center gap-4">
                        Quiz Hub <span className="bg-[#DDD6FE] border-2 border-black rounded-full px-4 text-3xl md:text-5xl rotate-6 inline-block shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">🧠</span>
                    </h1>
                    <p className="font-bold text-gray-500 mt-4 text-lg">
                        Train your brain. No pain, no gain.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
                <div className="md:col-span-3">
                    {/* Quizzes Grid or Empty State */}
                    {isLoading ? (
                        <div className="flex items-center justify-center h-64">
                            <Loader2 className="h-12 w-12 animate-spin text-black" />
                        </div>
                    ) : quizzes.length > 0 ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {quizzes.map((quiz: any, i: number) => (
                                <div key={quiz.id} className="bg-white border-2 border-black rounded-3xl p-8 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all flex flex-col justify-between h-64 relative group overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                        <Brain className="h-32 w-32" />
                                    </div>
                                    <div>
                                        <span className="bg-[#BBF7D0] border-2 border-black px-3 py-1 rounded-full text-xs font-black uppercase mb-4 inline-block">
                                            {quiz.total_quiz || "?"} Questions
                                        </span>
                                        <h3 className="text-2xl font-black uppercase tracking-tight leading-none mb-2">{quiz.title}</h3>
                                        <p className="text-sm font-bold text-gray-400 uppercase">Adding {new Date(quiz.created_at).toLocaleDateString()}</p>
                                    </div>
                                    <button
                                        onClick={() => startQuiz(quiz)}
                                        className="mt-6 w-full py-3 bg-black text-white font-bold rounded-xl border-2 border-transparent hover:bg-[#FBBF24] hover:text-black hover:border-black transition-colors flex items-center justify-center gap-2"
                                    >
                                        START QUIZ <ArrowRight className="h-4 w-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center p-16 bg-white border-2 border-dashed border-black rounded-3xl text-center min-h-[400px] relative overflow-hidden group">

                            {/* Decorative background elements */}
                            <div className="absolute top-10 right-10 w-12 h-12 bg-[#FDE68A] rounded-full border-2 border-black"></div>
                            <div className="absolute bottom-10 left-10 w-16 h-16 bg-[#BAE6FD] border-2 border-black rotate-12"></div>

                            <div className="z-10 bg-[#F3F4F6] p-6 rounded-full border-2 border-black mb-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                                <Brain className="h-12 w-12 text-black" strokeWidth={2} />
                            </div>

                            <h3 className="text-3xl font-black mb-2">It's quiet in here...</h3>
                            <p className="font-bold text-gray-500 max-w-sm mx-auto mb-8">
                                Generate exams from your subjects to populate this area.
                            </p>

                            {/* DEMO BUTTON */}
                            <button
                                onClick={() => startQuiz(demoQuiz)}
                                className="px-8 py-4 bg-[#8B5CF6] text-white font-black uppercase text-lg rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] hover:translate-x-[2px] transition-all active:shadow-none hover:shadow-none hover:bg-[#7C3AED] relative z-20"
                            >
                                <span className="flex items-center gap-3">
                                    <Sparkles className="h-5 w-5 fill-white" />
                                    Launch Pop Demo
                                </span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Recent Scores Sidebar */}
                <div className="hidden md:block">
                    <div className="bg-[#FFF1F2] border-2 border-black rounded-2xl p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                        <h3 className="font-black text-xl mb-6 flex items-center gap-2">
                            <BarChart className="h-6 w-6" />
                            Leaderboard
                        </h3>
                        <div className="font-bold text-sm text-gray-400 py-8 text-center border-2 border-dashed border-black/20 rounded-xl bg-white/50">
                            NO DATA YET
                        </div>
                    </div>
                </div>
            </div>

            {/* Active Quiz Modal */}
            <AnimatePresence>
                {activeQuiz && activeQuiz.questions && activeQuiz.questions.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-black/60 backdrop-blur-sm"
                    >
                        <div className="w-full max-w-5xl h-full md:h-auto md:max-h-[90vh] bg-[#FDF6E3] border-2 border-black rounded-3xl overflow-hidden flex flex-col shadow-[8px_8px_0px_0px_rgba(255,255,255,0.5)]">

                            {/* Modal Header */}
                            <div className="p-6 md:p-8 border-b-2 border-black flex items-center justify-between bg-white">
                                <div className="flex items-center gap-4">
                                    <span className="bg-black text-white px-3 py-1 rounded-lg font-bold text-xs uppercase">Question {currentQuestionIndex + 1} / {activeQuiz.questions.length}</span>
                                    <div className="h-3 w-32 md:w-64 bg-gray-200 rounded-full border-2 border-black overflow-hidden relative">
                                        <motion.div
                                            className="absolute left-0 top-0 bottom-0 bg-[#8B5CF6] h-full"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${((currentQuestionIndex + 1) / activeQuiz.questions.length) * 100}%` }}
                                        />
                                    </div>
                                </div>
                                <button
                                    onClick={() => setActiveQuiz(null)}
                                    className="h-10 w-10 border-2 border-black rounded-lg flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors"
                                >
                                    <X className="h-6 w-6" strokeWidth={3} />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 p-8 md:p-16 overflow-y-auto flex flex-col items-center justify-center">
                                <h2 className="text-3xl md:text-5xl font-black text-center mb-12 text-black leading-tight">
                                    {activeQuiz.questions[currentQuestionIndex].prompt || activeQuiz.questions[currentQuestionIndex].question}
                                </h2>

                                {/* Options Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
                                    {activeQuiz.questions[currentQuestionIndex].options?.map((option: string, i: number) => {
                                        const isSelected = selectedOption === i;
                                        const isCorrect = option === activeQuiz.questions[currentQuestionIndex].answer;

                                        let borderColor = "border-black";
                                        let bgColor = "bg-white";

                                        if (isAnswerRevealed) {
                                            if (isCorrect) {
                                                borderColor = "border-green-600";
                                                bgColor = "bg-green-100";
                                            } else if (isSelected) {
                                                borderColor = "border-red-600";
                                                bgColor = "bg-red-100";
                                            }
                                        } else if (isSelected) {
                                            bgColor = "bg-[#FDE68A]";
                                        }

                                        return (
                                            <button
                                                key={i}
                                                onClick={() => handleOptionSelect(i)}
                                                className="group relative disabled:cursor-not-allowed"
                                                disabled={isAnswerRevealed}
                                            >
                                                <div className={cn("absolute inset-0 bg-black rounded-xl translate-x-1 translate-y-1 transition-transform", isSelected && !isAnswerRevealed && "translate-x-2 translate-y-2")}></div>
                                                <div className={cn(
                                                    "relative border-2 rounded-xl p-6 h-full flex items-center gap-4 transition-all overflow-hidden",
                                                    borderColor,
                                                    bgColor,
                                                    !isAnswerRevealed && "hover:-translate-y-1 hover:-translate-x-1 hover:bg-[#FDE68A]"
                                                )}>
                                                    <div className={cn(
                                                        "h-10 w-10 rounded-lg border-2 border-black flex flex-shrink-0 items-center justify-center font-black bg-white transition-colors",
                                                        isSelected && "bg-black text-white"
                                                    )}>
                                                        {String.fromCharCode(65 + i)}
                                                    </div>
                                                    <span className="text-xl font-bold text-left leading-tight">{option}</span>

                                                    {isAnswerRevealed && isCorrect && <Check className="ml-auto text-green-600 h-6 w-6" strokeWidth={3} />}
                                                    {isAnswerRevealed && isSelected && !isCorrect && <X className="ml-auto text-red-600 h-6 w-6" strokeWidth={3} />}
                                                </div>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="p-6 md:p-8 bg-white border-t-2 border-black flex justify-between items-center">
                                <div className="font-black text-xl">
                                    SCORE: {score}
                                </div>
                                {isAnswerRevealed ? (
                                    <Button onClick={nextQuestion} className="h-14 px-10 rounded-xl border-2 border-black bg-black text-white hover:bg-[#8B5CF6] text-xl font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] active:translate-y-[4px] active:shadow-none transition-all">
                                        {currentQuestionIndex < activeQuiz.questions.length - 1 ? "Next Question" : "Finish Quiz"} <ArrowRight className="ml-3 h-6 w-6" strokeWidth={3} />
                                    </Button>
                                ) : (
                                    <Button onClick={checkAnswer} disabled={selectedOption === null} className="h-14 px-10 rounded-xl border-2 border-black bg-[#FBBF24] text-black hover:bg-[#F59E0B] text-xl font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] active:translate-y-[4px] active:shadow-none transition-all disabled:opacity-50 disabled:shadow-none disabled:translate-y-[4px]">
                                        Check Answer
                                    </Button>
                                )}
                            </div>

                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
