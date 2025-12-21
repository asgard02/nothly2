"use client"

import { useState, useEffect } from "react"
import Sidebar from "@/components/Sidebar"
import MainContent from "@/components/MainContent"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Calendar as CalendarIcon, Plus, ChevronLeft, ChevronRight, Clock, Trash2, Wand2, Sparkles, Loader2, ArrowLeft } from "lucide-react"
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

    const { data: subjects } = useSubjects()

    const [newEventTitle, setNewEventTitle] = useState("")
    const [newEventType, setNewEventType] = useState<"exam" | "study" | "deadline">("study")
    const [newEventTime, setNewEventTime] = useState("09:00")
    const [newEventDuration, setNewEventDuration] = useState("60")

    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(monthStart)
    const startDate = startOfWeek(monthStart, { locale: dateLocale })
    const endDate = endOfWeek(monthEnd, { locale: dateLocale })

    const calendarDays = eachDayOfInterval({
        start: startDate,
        end: endDate,
    })

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
        setSelectedDate(day)
        setView("day")
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
            const response = await fetch(`/api/calendar/events?id=${eventId}`, {
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
                    intensity: planIntensity
                })
            })

            if (!response.ok) throw new Error("Erreur lors de la génération")

            const { events: newEvents } = await response.json()

            newEvents.forEach((e: any) => {
                e.date = new Date(e.date)
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

    const selectedDateEvents = events.filter(event =>
        isSameDay(event.date, selectedDate)
    )

    const hours = Array.from({ length: 24 }, (_, i) => i)

    const weekDays = eachDayOfInterval({
        start: startOfWeek(new Date(), { locale: dateLocale }),
        end: endOfWeek(new Date(), { locale: dateLocale })
    })


    return (
        <div className="flex h-screen bg-[#FDF6E3]">
            <Sidebar />
            <MainContent className="bg-[#FDF6E3]">
                <div className="h-full flex flex-col overflow-hidden">
                    {/* Header */}
                    <header className="flex items-center justify-between px-6 py-4 border-b-2 border-black bg-[#FDF6E3]/80 backdrop-blur-sm">
                        <div className="flex items-center gap-3">
                            {view === "day" && (
                                <button
                                    onClick={() => setView("month")}
                                    className="p-2 rounded-lg border-2 border-black bg-white hover:bg-[#BAE6FD] hover:-translate-y-0.5 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                                >
                                    <ArrowLeft className="h-4 w-4 text-black" strokeWidth={2.5} />
                                </button>
                            )}
                            <div className="p-2 rounded-lg bg-[#BAE6FD] border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                <CalendarIcon className="h-5 w-5 text-black" strokeWidth={2.5} />
                            </div>
                            <div>
                                <h1 suppressHydrationWarning className="text-xl font-bold text-black">
                                    {view === "month" ? t("title") : format(selectedDate, "EEEE d MMMM", { locale: dateLocale })}
                                </h1>
                                <p suppressHydrationWarning className="text-sm font-medium text-gray-700">
                                    {view === "month"
                                        ? format(currentDate, "MMMM yyyy", { locale: dateLocale })
                                        : format(selectedDate, "d MMMM yyyy", { locale: dateLocale })
                                    }
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setIsGenerateOpen(true)}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-black bg-[#F472B6] text-black hover:-translate-y-0.5 transition-all font-semibold text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                            >
                                <Wand2 className="h-4 w-4" strokeWidth={2.5} />
                                {t("generatePlan")}
                            </button>

                            <div className="h-6 w-px bg-black" />

                            <button
                                onClick={goToToday}
                                className="px-3 py-2 text-sm font-semibold rounded-lg border-2 border-black bg-white text-black hover:bg-[#FDE68A] hover:-translate-y-0.5 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                            >
                                {t("today")}
                            </button>

                            <div className="flex items-center gap-1">
                                <button
                                    onClick={prevPeriod}
                                    className="p-2 rounded-lg border-2 border-black bg-white hover:bg-[#BAE6FD] hover:-translate-y-0.5 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                                >
                                    <ChevronLeft className="h-4 w-4 text-black" strokeWidth={2.5} />
                                </button>
                                <div className="px-3 py-2 border-2 border-black bg-white rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] min-w-[130px] text-center">
                                    <span suppressHydrationWarning className="text-sm font-semibold text-black">
                                        {view === "month"
                                            ? format(currentDate, "MMMM yyyy", { locale: dateLocale })
                                            : format(selectedDate, "d MMM", { locale: dateLocale })
                                        }
                                    </span>
                                </div>
                                <button
                                    onClick={nextPeriod}
                                    className="p-2 rounded-lg border-2 border-black bg-white hover:bg-[#BAE6FD] hover:-translate-y-0.5 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                                >
                                    <ChevronRight className="h-4 w-4 text-black" strokeWidth={2.5} />
                                </button>
                            </div>

                            <button
                                onClick={() => setIsAddEventOpen(true)}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-black bg-[#8B5CF6] text-white hover:bg-[#7C3AED] hover:-translate-y-0.5 transition-all font-semibold text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                            >
                                <Plus className="h-4 w-4" strokeWidth={2.5} />
                                {t("newEvent")}
                            </button>
                        </div>
                    </header>

                    <div className="flex-1 overflow-hidden">
                        {view === "month" ? (
                            <div className="h-full flex flex-col p-6 overflow-y-auto">
                                {/* Week Days Header */}
                                <div className="grid grid-cols-7 gap-3 mb-3">
                                    {weekDays.map((day) => (
                                        <div key={day.toString()} className="text-center">
                                            <div className="bg-black text-white py-2 rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                                <span className="text-xs font-bold uppercase">{format(day, "EEE", { locale: dateLocale })}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Calendar Grid */}
                                <div className="grid grid-cols-7 gap-3 flex-1">
                                    {calendarDays.map((day, dayIdx) => {
                                        const isSelected = isSameDay(day, selectedDate)
                                        const isCurrentMonth = isSameMonth(day, currentDate)
                                        const isTodayDate = isToday(day)
                                        const dayEvents = events.filter(event => isSameDay(event.date, day))

                                        return (
                                            <motion.div
                                                key={day.toString()}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: dayIdx * 0.003 }}
                                                onClick={() => handleDayClick(day)}
                                                className={cn(
                                                    "relative flex flex-col p-2.5 rounded-lg border-2 transition-all cursor-pointer min-h-[100px]",
                                                    isSelected
                                                        ? "border-black bg-[#FDE68A] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] -translate-y-0.5"
                                                        : "border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5",
                                                    !isCurrentMonth && "opacity-50"
                                                )}
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className={cn(
                                                        "text-sm font-bold w-6 h-6 flex items-center justify-center rounded-full",
                                                        isTodayDate
                                                            ? "bg-black text-white"
                                                            : "text-black"
                                                    )}>
                                                        {format(day, "d")}
                                                    </span>
                                                    {dayEvents.length > 0 && (
                                                        <span className="text-[10px] font-bold text-white bg-[#F472B6] px-1.5 py-0.5 rounded-full border border-black">
                                                            {dayEvents.length}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex-1 flex flex-col gap-1 overflow-hidden">
                                                    {dayEvents.slice(0, 3).map((event) => (
                                                        <div
                                                            key={event.id}
                                                            className={cn(
                                                                "px-1.5 py-1 rounded border border-black text-[10px] font-semibold truncate",
                                                                event.color
                                                            )}
                                                        >
                                                            {event.title}
                                                        </div>
                                                    ))}
                                                    {dayEvents.length > 3 && (
                                                        <span className="text-[9px] font-semibold text-gray-600 px-1">
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
                            <div className="h-full overflow-y-auto p-6">
                                <div className="max-w-5xl mx-auto bg-white rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                                    <div className="relative min-h-[1440px]">
                                        {hours.map((hour) => (
                                            <div key={hour} className="flex h-[60px] border-b border-gray-200 group hover:bg-gray-50 transition-colors">
                                                <div className="w-16 flex-shrink-0 border-r border-gray-200 p-2 text-xs text-gray-600 font-semibold text-right pr-3">
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
                                                        "absolute left-20 right-4 rounded-lg p-3 border-2 border-black cursor-pointer hover:-translate-y-0.5 transition-all overflow-hidden",
                                                        event.color,
                                                        "shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                                                    )}
                                                    style={{
                                                        top: `${top}px`,
                                                        height: `${height}px`,
                                                        minHeight: '50px'
                                                    }}
                                                >
                                                    <div className="flex justify-between items-start h-full">
                                                        <div className="flex flex-col flex-1 min-w-0">
                                                            <span className="text-sm font-bold text-black truncate">
                                                                {event.title}
                                                            </span>
                                                            <div className="text-xs text-black font-medium mt-1 flex items-center gap-1">
                                                                <Clock className="h-3 w-3" />
                                                                {format(event.date, "HH:mm")} - {format(setMinutes(event.date, getMinutes(event.date) + event.duration), "HH:mm")}
                                                            </div>
                                                            {event.description && (
                                                                <p className="text-xs text-black/70 mt-1 line-clamp-1">
                                                                    {event.description}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <button
                                                            onClick={(e) => handleDeleteEvent(event.id, e)}
                                                            className="p-1.5 text-black hover:text-red-600 rounded transition-colors ml-2"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            )
                                        })}

                                        {isToday(selectedDate) && (
                                            <div
                                                className="absolute left-16 right-0 border-t-2 border-red-500 z-10 pointer-events-none flex items-center"
                                                style={{ top: `${(getHours(new Date()) * 60) + getMinutes(new Date())}px` }}
                                            >
                                                <div className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-1.5" />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>


                {/* Modal Ajout Événement */}
                <Dialog open={isAddEventOpen} onOpenChange={setIsAddEventOpen}>
                    <DialogContent className="sm:max-w-md border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white">
                        <DialogHeader>
                            <DialogTitle className="text-lg font-bold">{t("dialogAddTitle")}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-black">{t("labelTitle")}</label>
                                <Input
                                    placeholder={t("placeholderTitle")}
                                    value={newEventTitle}
                                    onChange={(e) => setNewEventTitle(e.target.value)}
                                    className="border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-black">{t("labelTime")}</label>
                                    <Input
                                        type="time"
                                        value={newEventTime}
                                        onChange={(e) => setNewEventTime(e.target.value)}
                                        className="border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-black">{t("labelDuration")}</label>
                                    <Input
                                        type="number"
                                        min="15"
                                        step="15"
                                        value={newEventDuration}
                                        onChange={(e) => setNewEventDuration(e.target.value)}
                                        disabled={newEventType === "deadline"}
                                        className="border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-black">{t("labelType")}</label>
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
                                                "flex-1 px-3 py-2 rounded-lg text-xs font-bold border-2 transition-all",
                                                newEventType === type.id
                                                    ? `border-black ${type.color} shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] -translate-y-0.5`
                                                    : "border-black bg-white hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5"
                                            )}
                                        >
                                            {type.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-black">{t("labelDate")}</label>
                                <div className="px-3 py-2 rounded-lg border-2 border-black bg-gray-100 text-sm font-medium text-black capitalize shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                    {format(selectedDate, "EEEE d MMMM yyyy", { locale: dateLocale })}
                                </div>
                            </div>
                        </div>
                        <DialogFooter className="gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setIsAddEventOpen(false)}
                                className="border-2 border-black rounded-lg font-semibold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5"
                            >
                                {t("cancel")}
                            </Button>
                            <Button
                                onClick={handleAddEvent}
                                disabled={!newEventTitle.trim()}
                                className="border-2 border-black rounded-lg bg-[#8B5CF6] text-white font-semibold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 hover:bg-[#7C3AED]"
                            >
                                {t("add")}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Modal Génération IA */}
                <Dialog open={isGenerateOpen} onOpenChange={setIsGenerateOpen}>
                    <DialogContent className="sm:max-w-md border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                                <Sparkles className="h-5 w-5 text-[#F472B6]" strokeWidth={2.5} />
                                {t("dialogGenerateTitle")}
                            </DialogTitle>
                            <DialogDescription className="font-medium text-gray-600">
                                {t("dialogGenerateDesc")}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-black">{t("labelCollection")}</label>
                                <select
                                    className="w-full px-3 py-2 rounded-lg border-2 border-black bg-white text-sm font-medium shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
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
                                    <label className="text-sm font-semibold text-black">{t("labelStart")}</label>
                                    <Input
                                        type="date"
                                        value={planStartDate}
                                        onChange={(e) => setPlanStartDate(e.target.value)}
                                        className="border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-black">{t("labelEnd")}</label>
                                    <Input
                                        type="date"
                                        value={planEndDate}
                                        onChange={(e) => setPlanEndDate(e.target.value)}
                                        className="border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-black">{t("labelIntensity")}</label>
                                <div className="flex gap-2">
                                    {[t("intensityLight"), t("intensityMedium"), t("intensityIntense")].map((level) => (
                                        <button
                                            key={level}
                                            onClick={() => setPlanIntensity(level)}
                                            className={cn(
                                                "flex-1 px-3 py-2 rounded-lg text-xs font-bold border-2 transition-all",
                                                planIntensity === level
                                                    ? "border-black bg-[#BAE6FD] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] -translate-y-0.5"
                                                    : "border-black bg-white hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5"
                                            )}
                                        >
                                            {level}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <DialogFooter className="gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setIsGenerateOpen(false)}
                                className="border-2 border-black rounded-lg font-semibold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5"
                            >
                                {t("cancel")}
                            </Button>
                            <Button
                                onClick={handleGeneratePlan}
                                disabled={!selectedSubjectId || isGenerating}
                                className="border-2 border-black rounded-lg bg-[#F472B6] text-black font-semibold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5"
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
            </MainContent >
        </div >
    )
}
