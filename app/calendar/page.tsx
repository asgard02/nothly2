"use client"

import { useState, useEffect } from "react"
import Sidebar from "@/components/Sidebar"
import MainContent from "@/components/MainContent"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Calendar as CalendarIcon, Plus, ChevronLeft, ChevronRight, Clock, Trash2, Wand2, Sparkles, Loader2, ArrowLeft, ListChecks, Check, X } from "lucide-react"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isToday, isSameMonth, startOfWeek, endOfWeek, getHours, getMinutes, setMinutes, addDays, subDays } from "date-fns"
import { fr } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { useTranslations } from "next-intl"
import { useSubjects } from "@/lib/hooks/useSubjects"
import { toast } from "@/components/CustomToast"

const dateLocale = fr

type CalendarEvent = {
    id: string
    title: string
    date: Date
    type: "exam" | "study" | "deadline"
    duration: number
    description?: string
    color: string
}

type CalendarTodo = {
    id: string
    title: string
    date: string
    completed: boolean
    created_at: string
}

export default function CalendarPage() {
    const t = useTranslations("Calendar")
    const [currentDate, setCurrentDate] = useState(new Date())
    const [selectedDate, setSelectedDate] = useState(new Date())
    const [view, setView] = useState<"month" | "day">("month")
    const [events, setEvents] = useState<CalendarEvent[]>([])
    const [isAddEventOpen, setIsAddEventOpen] = useState(false)

    useEffect(() => {
        const fetchEvents = async () => {
            const response = await fetch("/api/calendar/events")
            if (response.ok) {
                const data = await response.json()
                const formattedEvents = data.map((e: any) => ({
                    ...e,
                    date: new Date(e.date)
                }))
                setEvents(formattedEvents)
            }
        }
        fetchEvents()
    }, [])

    const [isGenerateOpen, setIsGenerateOpen] = useState(false)
    const [isGenerating, setIsGenerating] = useState(false)
    const [selectedSubjectId, setSelectedSubjectId] = useState("")
    const [planStartDate, setPlanStartDate] = useState(format(new Date(), "yyyy-MM-dd"))
    const [planEndDate, setPlanEndDate] = useState(format(addDays(new Date(), 14), "yyyy-MM-dd"))
    const [planIntensity, setPlanIntensity] = useState(t("intensityMedium"))
    const [studyHourStart, setStudyHourStart] = useState("08:00")
    const [studyHourEnd, setStudyHourEnd] = useState("20:00")

    const { data: subjects } = useSubjects()

    const [newEventTitle, setNewEventTitle] = useState("")
    const [newEventType, setNewEventType] = useState<"exam" | "study" | "deadline">("study")
    const [newEventTime, setNewEventTime] = useState("09:00")
    const [newEventDuration, setNewEventDuration] = useState("60")

    // Todos state
    const [todos, setTodos] = useState<CalendarTodo[]>([])
    const [isAddingTodo, setIsAddingTodo] = useState(false)
    const [newTodoText, setNewTodoText] = useState("")
    const [isAddTodoOpen, setIsAddTodoOpen] = useState(false)

    // Fetch todos for selected date
    useEffect(() => {
        const fetchTodos = async () => {
            const dateStr = format(selectedDate, "yyyy-MM-dd")
            try {
                const response = await fetch(`/api/calendar/todos?date=${dateStr}`)
                if (response.ok) {
                    const data = await response.json()
                    setTodos(data)
                }
            } catch (error) {
                console.error("Error fetching todos:", error)
            }
        }
        fetchTodos()
    }, [selectedDate])

    const handleAddTodo = async () => {
        const title = newTodoText.trim()
        if (!title) return
        setIsAddingTodo(true)
        const dateStr = format(selectedDate, "yyyy-MM-dd")
        try {
            const response = await fetch("/api/calendar/todos", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title, date: dateStr })
            })
            if (!response.ok) {
                const errorData = await response.text()
                console.error("Todo creation failed:", errorData)
                throw new Error("Error creating todo")
            }
            const savedTodo = await response.json()
            setTodos(prev => [...prev, savedTodo])
            setNewTodoText("")
            setIsAddTodoOpen(false)
        } catch (error) {
            console.error("Error:", error)
            toast.error(t("eventError"))
        } finally {
            setIsAddingTodo(false)
        }
    }

    const handleToggleTodo = async (todoId: string, completed: boolean) => {
        try {
            const response = await fetch(`/api/calendar/todos/${todoId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ completed: !completed })
            })
            if (!response.ok) throw new Error("Error updating todo")
            setTodos(todos.map(t => t.id === todoId ? { ...t, completed: !completed } : t))
        } catch (error) {
            console.error("Error:", error)
        }
    }

    const handleDeleteTodo = async (todoId: string) => {
        try {
            const response = await fetch(`/api/calendar/todos/${todoId}`, {
                method: "DELETE"
            })
            if (!response.ok) throw new Error("Error deleting todo")
            setTodos(todos.filter(t => t.id !== todoId))
        } catch (error) {
            console.error("Error:", error)
        }
    }

    // Complete an event = remove it from calendar
    const handleCompleteEvent = async (eventId: string) => {
        try {
            const response = await fetch(`/api/calendar/events/${eventId}`, {
                method: "DELETE"
            })
            if (!response.ok) throw new Error("Error deleting event")
            setEvents(events.filter(e => e.id !== eventId))
            toast.success(t("todoEventDone"))
        } catch (error) {
            console.error("Error:", error)
            toast.error(t("eventError"))
        }
    }

    const selectedDateEvents = events.filter(event =>
        isSameDay(event.date, selectedDate)
    )

    const completedTodoCount = todos.filter(t => t.completed).length
    const totalItems = selectedDateEvents.length + todos.length
    const completedItems = completedTodoCount

    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(monthStart)
    const startDate = startOfWeek(monthStart, { locale: dateLocale })
    const endDate = endOfWeek(monthEnd, { locale: dateLocale })

    const calendarDays = eachDayOfInterval({
        start: startDate,
        end: endDate,
    })

    const calendarWeeks = calendarDays.length / 7

    const nextPeriod = () => {
        if (view === "month") setCurrentDate(addMonths(currentDate, 1))
        else setSelectedDate(addDays(selectedDate, 1))
    }

    const prevPeriod = () => {
        if (view === "month") setCurrentDate(subMonths(currentDate, 1))
        else setSelectedDate(subDays(selectedDate, 1))
    }

    const goToToday = () => {
        const today = new Date()
        setCurrentDate(today)
        setSelectedDate(today)
    }

    const handleDayClick = (day: Date) => {
        if (isSameDay(day, selectedDate)) {
            setView("day")
        } else {
            setSelectedDate(day)
        }
    }

    const getEventColor = (type: string) => {
        switch (type) {
            case "exam":
                return "bg-[#F472B6]"
            case "study":
                return "bg-[#BAE6FD]"
            case "deadline":
                return "bg-[#FDE68A]"
            default:
                return "bg-gray-200"
        }
    }

    const handleAddEvent = async () => {
        if (!newEventTitle.trim()) return

        const [hours, minutes] = newEventTime.split(":").map(Number)
        const eventDate = new Date(selectedDate)
        eventDate.setHours(hours, minutes, 0, 0)

        const newEvent: Omit<CalendarEvent, "id"> = {
            title: newEventTitle,
            date: eventDate,
            type: newEventType,
            duration: parseInt(newEventDuration) || 60,
            color: getEventColor(newEventType)
        }

        try {
            const response = await fetch("/api/calendar/events", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newEvent)
            })

            if (!response.ok) throw new Error("Erreur lors de la création")

            const savedEvent = await response.json()
            savedEvent.date = new Date(savedEvent.date)

            setEvents([...events, savedEvent])
            setNewEventTitle("")
            setNewEventType("study")
            setNewEventTime("09:00")
            setNewEventDuration("60")
            setIsAddEventOpen(false)
            toast.success(t("eventAdded"))
        } catch (error) {
            console.error("Erreur:", error)
            toast.error(t("eventError"))
        }
    }

    const handleDeleteEvent = async (eventId: string, e: React.MouseEvent) => {
        e.stopPropagation()
        try {
            const response = await fetch(`/api/calendar/events/${eventId}`, {
                method: "DELETE"
            })

            if (!response.ok) throw new Error("Erreur lors de la suppression")

            setEvents(events.filter(event => event.id !== eventId))
            toast.success(t("eventDeleted"))
        } catch (error) {
            console.error("Erreur:", error)
            toast.error(t("eventError"))
        }
    }

    const handleGeneratePlan = async () => {
        if (!selectedSubjectId) return

        setIsGenerating(true)
        try {
            const response = await fetch("/api/calendar/generate-plan", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    subjectId: selectedSubjectId,
                    startDate: planStartDate,
                    endDate: planEndDate,
                    intensity: planIntensity,
                    studyHourStart,
                    studyHourEnd
                })
            })

            if (!response.ok) throw new Error("Erreur lors de la génération")

            const { events: newEvents } = await response.json()

            // Combine date + time fields properly and apply colors
            newEvents.forEach((e: any) => {
                const dateStr = typeof e.date === "string" ? e.date.split("T")[0] : e.date
                if (e.time) {
                    const [h, m] = e.time.split(":").map(Number)
                    const d = new Date(dateStr)
                    d.setHours(h, m, 0, 0)
                    e.date = d
                } else {
                    e.date = new Date(dateStr)
                }
                e.color = getEventColor(e.type)
                if (e.type === "deadline") {
                    e.duration = 0
                }
            })

            const savePromises = newEvents.map((e: any) =>
                fetch("/api/calendar/events", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(e)
                }).then(res => {
                    if (!res.ok) throw new Error("Erreur lors de la sauvegarde")
                    return res.json()
                })
            )

            const savedEvents = await Promise.all(savePromises)
            const formattedSavedEvents = savedEvents.map((e: any) => ({
                ...e,
                date: new Date(e.date)
            }))

            setEvents([...events, ...formattedSavedEvents])
            setIsGenerateOpen(false)
            toast.success(t("planGenerated"))
        } catch (error) {
            console.error("Erreur:", error)
            toast.error(t("planError"))
        } finally {
            setIsGenerating(false)
        }
    }

    const hours = Array.from({ length: 24 }, (_, i) => i)

    const weekDays = eachDayOfInterval({
        start: startOfWeek(new Date(), { locale: dateLocale }),
        end: endOfWeek(new Date(), { locale: dateLocale })
    })

    return (
        <div className="flex h-screen bg-background">
            <Sidebar />
            <MainContent className="p-4">
                <div className="h-full bg-card border-2 border-border rounded-3xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] overflow-hidden flex flex-col">
                    {/* Header */}
                    <header className="flex items-center justify-between px-8 py-5 border-b-2 border-border">
                        <div className="flex items-center gap-4">
                            {view === "day" && (
                                <button
                                    onClick={() => setView("month")}
                                    className="p-2.5 rounded-xl border-2 border-border bg-card hover:bg-[#BAE6FD] hover:-translate-y-0.5 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
                                >
                                    <ArrowLeft className="h-4 w-4 text-foreground" strokeWidth={2.5} />
                                </button>
                            )}
                            <div className="p-2.5 rounded-xl bg-[#BBF7D0] border-2 border-border shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
                                <CalendarIcon className="h-5 w-5 text-foreground" strokeWidth={2.5} />
                            </div>
                            <div>
                                <h1 suppressHydrationWarning className="text-xl font-black text-foreground tracking-tight">
                                    {view === "month" ? t("title") : format(selectedDate, "EEEE d MMMM", { locale: dateLocale })}
                                </h1>
                                <p suppressHydrationWarning className="text-sm font-semibold text-muted-foreground capitalize">
                                    {view === "month"
                                        ? format(currentDate, "MMMM yyyy", { locale: dateLocale })
                                        : format(selectedDate, "d MMMM yyyy", { locale: dateLocale })
                                    }
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setIsGenerateOpen(true)}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-border bg-[#FBCFE8] text-foreground hover:-translate-y-0.5 transition-all font-bold text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]"
                            >
                                <Wand2 className="h-4 w-4" strokeWidth={2.5} />
                                {t("generatePlan")}
                            </button>

                            <div className="h-8 w-px bg-border" />

                            <button
                                onClick={goToToday}
                                className="px-4 py-2.5 text-sm font-bold rounded-xl border-2 border-border bg-card text-foreground hover:bg-accent hover:-translate-y-0.5 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
                            >
                                {t("today")}
                            </button>

                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={prevPeriod}
                                    className="p-2.5 rounded-xl border-2 border-border bg-card hover:bg-[#BAE6FD] hover:-translate-y-0.5 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
                                >
                                    <ChevronLeft className="h-4 w-4 text-foreground" strokeWidth={2.5} />
                                </button>
                                <div className="px-4 py-2.5 border-2 border-border bg-card rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] min-w-[140px] text-center">
                                    <span suppressHydrationWarning className="text-sm font-bold text-foreground capitalize">
                                        {view === "month"
                                            ? format(currentDate, "MMMM yyyy", { locale: dateLocale })
                                            : format(selectedDate, "d MMM", { locale: dateLocale })
                                        }
                                    </span>
                                </div>
                                <button
                                    onClick={nextPeriod}
                                    className="p-2.5 rounded-xl border-2 border-border bg-card hover:bg-[#BAE6FD] hover:-translate-y-0.5 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
                                >
                                    <ChevronRight className="h-4 w-4 text-foreground" strokeWidth={2.5} />
                                </button>
                            </div>

                            <button
                                onClick={() => setIsAddEventOpen(true)}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-border bg-primary text-primary-foreground hover:bg-primary/90 hover:-translate-y-0.5 transition-all font-bold text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]"
                            >
                                <Plus className="h-4 w-4" strokeWidth={2.5} />
                                {t("newEvent")}
                            </button>
                        </div>
                    </header>

                    {/* Content: calendar/day view + todo panel side by side */}
                    <div className="flex-1 flex min-h-0">
                        {/* Left side: Calendar or Day view */}
                        <div className="flex-1 min-w-0 overflow-hidden">
                            {view === "month" ? (
                                <div className="h-full flex flex-col p-5">
                                    {/* Week Days Header */}
                                    <div className="grid grid-cols-7 gap-2 mb-2">
                                        {weekDays.map((day) => (
                                            <div key={day.toString()} className="text-center py-2.5">
                                                <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                                                    {format(day, "EEE", { locale: dateLocale })}
                                                </span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Calendar Grid - fills remaining space */}
                                    <div
                                        className="grid grid-cols-7 gap-2 flex-1 min-h-0"
                                        style={{ gridTemplateRows: `repeat(${calendarWeeks}, 1fr)` }}
                                    >
                                        {calendarDays.map((day, dayIdx) => {
                                            const isSelected = isSameDay(day, selectedDate)
                                            const isCurrentMonth = isSameMonth(day, currentDate)
                                            const isTodayDate = isToday(day)
                                            const dayEvents = events.filter(event => isSameDay(event.date, day))

                                            return (
                                                <motion.div
                                                    key={day.toString()}
                                                    initial={{ opacity: 0, scale: 0.95 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    transition={{ delay: dayIdx * 0.004, duration: 0.2 }}
                                                    onClick={() => handleDayClick(day)}
                                                    className={cn(
                                                        "relative flex flex-col p-3 rounded-2xl border-2 transition-all cursor-pointer overflow-hidden group",
                                                        isSelected
                                                            ? "border-border bg-accent/40 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] -translate-y-0.5"
                                                            : isTodayDate
                                                                ? "border-primary bg-primary/5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] hover:-translate-y-0.5"
                                                                : "border-border/40 bg-card hover:border-border hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:-translate-y-0.5",
                                                        !isCurrentMonth && "opacity-35"
                                                    )}
                                                >
                                                    {/* Day number */}
                                                    <div className="flex items-center justify-between mb-1.5">
                                                        <span className={cn(
                                                            "text-sm font-bold w-7 h-7 flex items-center justify-center rounded-lg transition-colors",
                                                            isTodayDate
                                                                ? "bg-primary text-primary-foreground"
                                                                : isSelected
                                                                    ? "bg-foreground text-background"
                                                                    : "text-foreground group-hover:bg-muted"
                                                        )}>
                                                            {format(day, "d")}
                                                        </span>
                                                        {dayEvents.length > 0 && (
                                                            <span className={cn(
                                                                "text-[10px] font-black px-1.5 py-0.5 rounded-md border",
                                                                dayEvents.some(e => e.type === "exam")
                                                                    ? "bg-[#F472B6] text-foreground border-border"
                                                                    : dayEvents.some(e => e.type === "deadline")
                                                                        ? "bg-[#FDE68A] text-foreground border-border"
                                                                        : "bg-[#BAE6FD] text-foreground border-border"
                                                            )}>
                                                                {dayEvents.length}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Events */}
                                                    <div className="flex-1 flex flex-col gap-1 overflow-hidden">
                                                        {dayEvents.slice(0, 3).map((event) => (
                                                            <div
                                                                key={event.id}
                                                                className={cn(
                                                                    "px-2 py-1 rounded-lg text-[11px] font-bold truncate border border-border/50",
                                                                    event.color
                                                                )}
                                                            >
                                                                {event.title}
                                                            </div>
                                                        ))}
                                                        {dayEvents.length > 3 && (
                                                            <span className="text-[10px] font-bold text-muted-foreground px-1">
                                                                +{dayEvents.length - 3} {t("others")}
                                                            </span>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            )
                                        })}
                                    </div>
                                </div>
                            ) : (
                                /* Day View */
                                <div className="h-full overflow-y-auto p-5">
                                    <div className="max-w-5xl mx-auto bg-card rounded-2xl border-2 border-border shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] overflow-hidden">
                                        <div className="relative min-h-[1440px]">
                                            {hours.map((hour) => (
                                                <div key={hour} className="flex h-[60px] border-b border-border/20 group hover:bg-muted/30 transition-colors">
                                                    <div className="w-20 flex-shrink-0 border-r border-border/20 p-2 text-xs text-muted-foreground font-bold text-right pr-4 pt-0">
                                                        {hour.toString().padStart(2, '0')}:00
                                                    </div>
                                                    <div
                                                        className="flex-1 relative cursor-pointer"
                                                        onClick={() => {
                                                            setNewEventTime(`${hour.toString().padStart(2, '0')}:00`)
                                                            setIsAddEventOpen(true)
                                                        }}
                                                    />
                                                </div>
                                            ))}

                                            {selectedDateEvents.map((event) => {
                                                const startHour = getHours(event.date)
                                                const startMin = getMinutes(event.date)
                                                const top = (startHour * 60) + startMin
                                                const height = event.duration || 30

                                                return (
                                                    <div
                                                        key={event.id}
                                                        className={cn(
                                                            "absolute left-24 right-4 rounded-xl p-3 border-2 border-border cursor-pointer hover:-translate-y-0.5 transition-all overflow-hidden",
                                                            event.color,
                                                            "shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]"
                                                        )}
                                                        style={{
                                                            top: `${top}px`,
                                                            height: `${height}px`,
                                                            minHeight: '50px'
                                                        }}
                                                    >
                                                        <div className="flex justify-between items-start h-full">
                                                            <div className="flex flex-col flex-1 min-w-0">
                                                                <span className="text-sm font-black text-foreground truncate">
                                                                    {event.title}
                                                                </span>
                                                                <div className="text-xs text-foreground/70 font-semibold mt-1 flex items-center gap-1">
                                                                    <Clock className="h-3 w-3" />
                                                                    {format(event.date, "HH:mm")} - {format(setMinutes(event.date, getMinutes(event.date) + event.duration), "HH:mm")}
                                                                </div>
                                                                {event.description && (
                                                                    <p className="text-xs text-foreground/60 mt-1 line-clamp-1">
                                                                        {event.description}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            <button
                                                                onClick={(e) => handleDeleteEvent(event.id, e)}
                                                                className="p-1.5 text-foreground/60 hover:text-red-500 rounded-lg hover:bg-card/50 transition-colors ml-2"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                )
                                            })}

                                            {/* Current time indicator */}
                                            {isToday(selectedDate) && (
                                                <div
                                                    className="absolute left-20 right-0 border-t-2 border-red-500 z-10 pointer-events-none flex items-center"
                                                    style={{ top: `${(getHours(new Date()) * 60) + getMinutes(new Date())}px` }}
                                                >
                                                    <div className="w-3 h-3 rounded-full bg-red-500 -ml-1.5 shadow-sm" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right side: Todo Panel (always visible in both views) */}
                        <div className="w-80 min-w-[320px] border-l-2 border-border flex flex-col bg-muted/20">
                            {/* Todo Header */}
                            <div className="px-5 pt-5 pb-3">
                                <div className="flex items-center gap-3 mb-1">
                                    <div className="p-2 rounded-xl bg-[#DDD6FE] border-2 border-border shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
                                        <ListChecks className="h-4 w-4 text-foreground" strokeWidth={2.5} />
                                    </div>
                                    <h3 className="text-base font-black text-foreground tracking-tight">{t("todoTitle")}</h3>
                                </div>
                                <p suppressHydrationWarning className="text-xs font-semibold text-muted-foreground capitalize ml-11">
                                    {format(selectedDate, "EEEE d MMMM", { locale: dateLocale })}
                                </p>

                                {/* Progress */}
                                {totalItems > 0 && (
                                    <div className="mt-3 ml-11">
                                        <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground mb-1.5">
                                            <span>{completedItems} {t("todoCompleted")}</span>
                                            <span>{totalItems - completedItems} {t("todoRemaining")}</span>
                                        </div>
                                        <div className="h-2 bg-border/30 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-[#BBF7D0] rounded-full transition-all duration-500"
                                                style={{ width: `${totalItems > 0 ? (completedItems / totalItems) * 100 : 0}%` }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Scrollable content */}
                            <div className="flex-1 overflow-y-auto px-5 pb-5">
                                {/* Calendar Events Section */}
                                <div className="mb-4">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                                        {t("todoEventsSection")} ({selectedDateEvents.length})
                                    </span>
                                    <div className="mt-2 space-y-2">
                                        {selectedDateEvents.length === 0 ? (
                                            <p className="text-xs text-muted-foreground/60 font-medium py-2">{t("todoNoEvents")}</p>
                                        ) : (
                                            [...selectedDateEvents]
                                                .sort((a, b) => a.date.getTime() - b.date.getTime())
                                                .map((event) => (
                                                <motion.div
                                                    key={`event-${event.id}`}
                                                    initial={{ opacity: 0, x: 10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    className="group flex items-start gap-3 p-3 rounded-xl border-2 border-border bg-card shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] transition-all"
                                                >
                                                    <button
                                                        onClick={() => handleCompleteEvent(event.id)}
                                                        className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-md border-2 border-border hover:bg-[#BBF7D0] flex items-center justify-center transition-all"
                                                        title={t("todoEventDone")}
                                                    >
                                                    </button>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <div className={cn("w-2 h-2 rounded-full flex-shrink-0", event.color)} />
                                                            <span className="text-sm font-bold text-foreground truncate">{event.title}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1 mt-1 text-[11px] text-muted-foreground font-semibold">
                                                            <Clock className="h-3 w-3" />
                                                            <span>{format(event.date, "HH:mm")} - {format(setMinutes(event.date, getMinutes(event.date) + event.duration), "HH:mm")}</span>
                                                            <span className="ml-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-muted border border-border/50">
                                                                {event.type}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* Separator */}
                                <div className="border-t-2 border-dashed border-border/30 mb-4" />

                                {/* Manual Todos Section */}
                                <div>
                                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                                        {t("todoTasksSection")}
                                    </span>

                                    {/* Add Todo Button */}
                                    <div className="mt-2 mb-3">
                                        <button
                                            type="button"
                                            onClick={() => setIsAddTodoOpen(true)}
                                            className="w-full flex items-center gap-2 h-10 px-3 border-2 border-dashed border-border/60 rounded-xl text-sm font-medium text-muted-foreground bg-card/50 hover:border-border hover:bg-card hover:text-foreground hover:-translate-y-0.5 transition-all hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
                                        >
                                            <Plus className="h-4 w-4" strokeWidth={2.5} />
                                            {t("todoPlaceholder")}
                                        </button>
                                    </div>

                                    {/* Manual Todo List */}
                                    {todos.length === 0 ? (
                                        <p className="text-xs text-muted-foreground/60 font-medium py-2">{t("todoEmptyHint")}</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {todos.map((todo) => (
                                                <motion.div
                                                    key={todo.id}
                                                    initial={{ opacity: 0, x: 10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    className={cn(
                                                        "group flex items-start gap-3 p-3 rounded-xl border-2 transition-all",
                                                        todo.completed
                                                            ? "border-border/30 bg-muted/30"
                                                            : "border-border bg-card shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
                                                    )}
                                                >
                                                    <button
                                                        onClick={() => handleToggleTodo(todo.id, todo.completed)}
                                                        className={cn(
                                                            "mt-0.5 flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all",
                                                            todo.completed
                                                                ? "bg-[#BBF7D0] border-border"
                                                                : "border-border hover:bg-muted"
                                                        )}
                                                    >
                                                        {todo.completed && <Check className="h-3 w-3 text-foreground" strokeWidth={3} />}
                                                    </button>
                                                    <span className={cn(
                                                        "flex-1 text-sm font-semibold leading-tight",
                                                        todo.completed
                                                            ? "line-through text-muted-foreground/50"
                                                            : "text-foreground"
                                                    )}>
                                                        {todo.title}
                                                    </span>
                                                    <button
                                                        onClick={() => handleDeleteTodo(todo.id)}
                                                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all flex-shrink-0"
                                                    >
                                                        <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                                                    </button>
                                                </motion.div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Empty state when absolutely nothing */}
                                {selectedDateEvents.length === 0 && todos.length === 0 && (
                                    <div className="flex flex-col items-center justify-center py-8 text-center">
                                        <div className="p-3 rounded-2xl bg-muted/50 border-2 border-dashed border-border/40 mb-3">
                                            <ListChecks className="h-6 w-6 text-muted-foreground/50" strokeWidth={2} />
                                        </div>
                                        <p className="text-sm font-bold text-muted-foreground">{t("todoEmpty")}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Modal Ajout Événement */}
                <Dialog open={isAddEventOpen} onOpenChange={setIsAddEventOpen}>
                    <DialogContent className="sm:max-w-md border-2 border-border rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] bg-card">
                        <DialogHeader>
                            <DialogTitle className="text-lg font-black text-foreground">{t("dialogAddTitle")}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-foreground">{t("labelTitle")}</label>
                                <Input
                                    placeholder={t("placeholderTitle")}
                                    value={newEventTitle}
                                    onChange={(e) => setNewEventTitle(e.target.value)}
                                    className="border-2 border-border rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-foreground">{t("labelTime")}</label>
                                    <Input
                                        type="time"
                                        value={newEventTime}
                                        onChange={(e) => setNewEventTime(e.target.value)}
                                        className="border-2 border-border rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-foreground">{t("labelDuration")}</label>
                                    <Input
                                        type="number"
                                        min="15"
                                        step="15"
                                        value={newEventDuration}
                                        onChange={(e) => setNewEventDuration(e.target.value)}
                                        disabled={newEventType === "deadline"}
                                        className="border-2 border-border rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-foreground">{t("labelType")}</label>
                                <div className="flex gap-2">
                                    {[
                                        { id: "exam", label: t("typeExam"), color: "bg-[#F472B6]" },
                                        { id: "study", label: t("typeStudy"), color: "bg-[#BAE6FD]" },
                                        { id: "deadline", label: t("typeDeadline"), color: "bg-[#FDE68A]" }
                                    ].map((type) => (
                                        <button
                                            key={type.id}
                                            onClick={() => setNewEventType(type.id as any)}
                                            className={cn(
                                                "flex-1 px-3 py-2.5 rounded-xl text-xs font-black border-2 transition-all",
                                                newEventType === type.id
                                                    ? `border-border ${type.color} shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] -translate-y-0.5`
                                                    : "border-border bg-card hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:-translate-y-0.5"
                                            )}
                                        >
                                            {type.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-foreground">{t("labelDate")}</label>
                                <div className="px-4 py-2.5 rounded-xl border-2 border-border bg-muted text-sm font-semibold text-foreground capitalize shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
                                    {format(selectedDate, "EEEE d MMMM yyyy", { locale: dateLocale })}
                                </div>
                            </div>
                        </div>
                        <DialogFooter className="gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setIsAddEventOpen(false)}
                                className="border-2 border-border rounded-xl font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:-translate-y-0.5"
                            >
                                {t("cancel")}
                            </Button>
                            <Button
                                onClick={handleAddEvent}
                                disabled={!newEventTitle.trim()}
                                className="border-2 border-border rounded-xl bg-primary text-primary-foreground font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:-translate-y-0.5 hover:bg-primary/90"
                            >
                                {t("add")}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Modal Génération IA */}
                <Dialog open={isGenerateOpen} onOpenChange={setIsGenerateOpen}>
                    <DialogContent className="sm:max-w-md border-2 border-border rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] bg-card">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-lg font-black text-foreground">
                                <Sparkles className="h-5 w-5 text-secondary" strokeWidth={2.5} />
                                {t("dialogGenerateTitle")}
                            </DialogTitle>
                            <DialogDescription className="font-semibold text-muted-foreground">
                                {t("dialogGenerateDesc")}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-foreground">{t("labelCollection")}</label>
                                <select
                                    className="w-full px-4 py-2.5 rounded-xl border-2 border-border bg-card text-sm font-semibold text-foreground shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
                                    value={selectedSubjectId}
                                    onChange={(e) => setSelectedSubjectId(e.target.value)}
                                >
                                    <option value="">{t("selectCollection")}</option>
                                    {subjects?.map(c => (
                                        <option key={c.id} value={c.id}>{c.title}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-foreground">{t("labelStart")}</label>
                                    <Input
                                        type="date"
                                        value={planStartDate}
                                        onChange={(e) => setPlanStartDate(e.target.value)}
                                        className="border-2 border-border rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-foreground">{t("labelEnd")}</label>
                                    <Input
                                        type="date"
                                        value={planEndDate}
                                        onChange={(e) => setPlanEndDate(e.target.value)}
                                        className="border-2 border-border rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-foreground">{t("labelIntensity")}</label>
                                <div className="flex gap-2">
                                    {[t("intensityLight"), t("intensityMedium"), t("intensityIntense")].map((level) => (
                                        <button
                                            key={level}
                                            onClick={() => setPlanIntensity(level)}
                                            className={cn(
                                                "flex-1 px-3 py-2.5 rounded-xl text-xs font-black border-2 transition-all",
                                                planIntensity === level
                                                    ? "border-border bg-[#BAE6FD] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] -translate-y-0.5"
                                                    : "border-border bg-card hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:-translate-y-0.5"
                                            )}
                                        >
                                            {level}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-foreground">{t("labelStudyHours")}</label>
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 flex items-center gap-2">
                                        <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">{t("studyHoursFrom")}</span>
                                        <Input
                                            type="time"
                                            value={studyHourStart}
                                            onChange={(e) => setStudyHourStart(e.target.value)}
                                            className="border-2 border-border rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
                                        />
                                    </div>
                                    <div className="flex-1 flex items-center gap-2">
                                        <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">{t("studyHoursTo")}</span>
                                        <Input
                                            type="time"
                                            value={studyHourEnd}
                                            onChange={(e) => setStudyHourEnd(e.target.value)}
                                            className="border-2 border-border rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <DialogFooter className="gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setIsGenerateOpen(false)}
                                className="border-2 border-border rounded-xl font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:-translate-y-0.5"
                            >
                                {t("cancel")}
                            </Button>
                            <Button
                                onClick={handleGeneratePlan}
                                disabled={!selectedSubjectId || isGenerating}
                                className="border-2 border-border rounded-xl bg-secondary text-secondary-foreground font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:-translate-y-0.5"
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" strokeWidth={2.5} />
                                        {t("generating")}
                                    </>
                                ) : (
                                    <>
                                        <Wand2 className="mr-2 h-4 w-4" strokeWidth={2.5} />
                                        {t("generate")}
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
                {/* Modal Ajout Tâche */}
                <Dialog open={isAddTodoOpen} onOpenChange={(open) => {
                    setIsAddTodoOpen(open)
                    if (!open) setNewTodoText("")
                }}>
                    <DialogContent className="sm:max-w-sm border-2 border-border rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] bg-card">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-lg font-black text-foreground">
                                <ListChecks className="h-5 w-5 text-[#DDD6FE]" strokeWidth={2.5} />
                                {t("todoDialogTitle")}
                            </DialogTitle>
                            <DialogDescription className="font-semibold text-muted-foreground">
                                {t("todoDialogDesc")}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-foreground">{t("todoLabelName")}</label>
                                <Input
                                    placeholder={t("todoPlaceholderName")}
                                    value={newTodoText}
                                    onChange={(e) => setNewTodoText(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault()
                                            handleAddTodo()
                                        }
                                    }}
                                    autoFocus
                                    className="border-2 border-border rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-foreground">{t("labelDate")}</label>
                                <div className="px-4 py-2.5 rounded-xl border-2 border-border bg-muted text-sm font-semibold text-foreground capitalize shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
                                    {format(selectedDate, "EEEE d MMMM yyyy", { locale: dateLocale })}
                                </div>
                            </div>
                        </div>
                        <DialogFooter className="gap-2">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setIsAddTodoOpen(false)
                                    setNewTodoText("")
                                }}
                                className="border-2 border-border rounded-xl font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:-translate-y-0.5"
                            >
                                {t("cancel")}
                            </Button>
                            <Button
                                onClick={handleAddTodo}
                                disabled={!newTodoText.trim() || isAddingTodo}
                                className="border-2 border-border rounded-xl bg-[#BBF7D0] text-foreground font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:-translate-y-0.5 hover:bg-[#A7F3D0]"
                            >
                                {isAddingTodo ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" strokeWidth={2.5} />
                                        {t("todoAdd")}
                                    </>
                                ) : (
                                    <>
                                        <Plus className="mr-2 h-4 w-4" strokeWidth={2.5} />
                                        {t("todoAdd")}
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </MainContent>
        </div>
    )
}
