"use client"

import { useState, useRef, useEffect } from "react"
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday, setHours, setMinutes, getHours, getMinutes, addDays, subDays } from "date-fns"
import { fr, enUS } from "date-fns/locale"
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Plus, MoreHorizontal, Sparkles, Trash2, X, ArrowLeft, Wand2, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import Sidebar from "@/components/Sidebar"
import MainContent from "@/components/MainContent"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useCollections } from "@/lib/hooks/useCollections"
import { toast } from "sonner"
import { useTranslations, useLocale } from "next-intl"

// Types pour les événements
interface Event {
    id: string
    title: string
    date: Date // Date et heure de début
    duration: number // Durée en minutes
    type: "exam" | "study" | "deadline"
    color: string
    description?: string
}

// Données simulées initiales
const INITIAL_EVENTS: Event[] = []

export default function CalendarPage() {
    const t = useTranslations("Calendar")
    const locale = useLocale()
    const dateLocale = locale === "fr" ? fr : enUS

    const [view, setView] = useState<"month" | "day">("month")
    const [currentDate, setCurrentDate] = useState(new Date())
    const [selectedDate, setSelectedDate] = useState(new Date())
    const [events, setEvents] = useState<Event[]>(INITIAL_EVENTS)
    const [isLoading, setIsLoading] = useState(true)
    const [isAddEventOpen, setIsAddEventOpen] = useState(false)

    // Charger les événements
    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const response = await fetch("/api/calendar/events")
                if (response.ok) {
                    const data = await response.json()
                    // Convertir les dates string en objets Date
                    const formattedEvents = data.map((e: any) => ({
                        ...e,
                        date: new Date(e.date)
                    }))
                    setEvents(formattedEvents)
                }
            } catch (error) {
                console.error("Erreur chargement événements:", error)
                toast.error("Impossible de charger les événements")
            } finally {
                setIsLoading(false)
            }
        }
        fetchEvents()
    }, [])

    // Generation State
    const [isGenerateOpen, setIsGenerateOpen] = useState(false)
    const [isGenerating, setIsGenerating] = useState(false)
    const [selectedCollectionId, setSelectedCollectionId] = useState("")
    const [planStartDate, setPlanStartDate] = useState(format(new Date(), "yyyy-MM-dd"))
    const [planEndDate, setPlanEndDate] = useState(format(addDays(new Date(), 7), "yyyy-MM-dd"))
    const [planIntensity, setPlanIntensity] = useState("Moyenne")

    const { data: collections } = useCollections()

    // Form state
    const [newEventTitle, setNewEventTitle] = useState("")
    const [newEventType, setNewEventType] = useState<"exam" | "study" | "deadline">("study")
    const [newEventTime, setNewEventTime] = useState("09:00")
    const [newEventDuration, setNewEventDuration] = useState("60")

    // Calcul des jours à afficher (Vue Mois)
    const monthStart = startOfMonth(currentDate)
    const monthEnd = endOfMonth(monthStart)
    const startDate = startOfWeek(monthStart, { locale: dateLocale })
    const endDate = endOfWeek(monthEnd, { locale: dateLocale })

    const calendarDays = eachDayOfInterval({
        start: startDate,
        end: endDate,
    })

    // Navigation
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
        if (view === "day") {
            // Scroll to current time logic could go here
        }
    }

    const handleDayClick = (day: Date) => {
        setSelectedDate(day)
        setView("day")
    }

    const handleAddEvent = async () => {
        if (!newEventTitle.trim()) return

        const [hours, minutes] = newEventTime.split(":").map(Number)
        const eventDate = setMinutes(setHours(selectedDate, hours), minutes)

        const colors = {
            exam: "bg-red-500",
            study: "bg-blue-500",
            deadline: "bg-amber-500"
        }

        try {
            const response = await fetch("/api/calendar/events", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: newEventTitle,
                    date: eventDate,
                    duration: newEventType === "deadline" ? 0 : parseInt(newEventDuration),
                    type: newEventType,
                    color: colors[newEventType]
                })
            })

            if (!response.ok) throw new Error("Erreur lors de la création")

            const savedEvent = await response.json()
            // Convertir la date
            savedEvent.date = new Date(savedEvent.date)

            setEvents([...events, savedEvent])
            setNewEventTitle("")
            setIsAddEventOpen(false)
            toast.success("Événement ajouté")
        } catch (error) {
            console.error(error)
            toast.error("Impossible de créer l'événement")
        }
    }

    const handleDeleteEvent = async (eventId: string, e: React.MouseEvent) => {
        e.stopPropagation()
        if (!confirm("Supprimer cet événement ?")) return

        try {
            const response = await fetch(`/api/calendar/events/${eventId}`, {
                method: "DELETE"
            })

            if (!response.ok) throw new Error("Erreur suppression")

            setEvents(events.filter(e => e.id !== eventId))
            toast.success("Événement supprimé")
        } catch (error) {
            console.error(error)
            toast.error("Impossible de supprimer l'événement")
        }
    }

    const handleGeneratePlan = async () => {
        if (!selectedCollectionId) return

        setIsGenerating(true)
        try {
            const response = await fetch("/api/calendar/generate-plan", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    collectionId: selectedCollectionId,
                    startDate: planStartDate,
                    endDate: planEndDate,
                    intensity: planIntensity
                })
            })

            if (!response.ok) throw new Error(t("errorGeneration"))

            const data = await response.json()

            const newEvents = data.events.map((e: any) => {
                const [hours, minutes] = e.time.split(":").map(Number)
                const date = new Date(e.date)
                date.setHours(hours, minutes)

                return {
                    id: Date.now().toString() + Math.random().toString(),
                    title: e.title,
                    date: date,
                    duration: e.duration,
                    type: e.type,
                    color: e.type === "exam" ? "bg-red-500" : e.type === "deadline" ? "bg-amber-500" : "bg-blue-500",
                    description: e.description
                }
            })

            // Sauvegarder les événements générés
            const savePromises = newEvents.map((e: any) =>
                fetch("/api/calendar/events", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        title: e.title,
                        date: e.date,
                        duration: e.duration,
                        type: e.type,
                        color: e.color,
                        description: e.description
                    })
                }).then(res => res.json())
            )

            const savedEvents = await Promise.all(savePromises)
            // Convertir les dates
            const formattedSavedEvents = savedEvents.map((e: any) => ({
                ...e,
                date: new Date(e.date)
            }))

            setEvents([...events, ...formattedSavedEvents])
            setIsGenerateOpen(false)
            toast.success(t("successMessage"))
        } catch (error) {
            console.error(error)
            toast.error(t("errorMessage"))
        } finally {
            setIsGenerating(false)
        }
    }

    // Filtrer les événements pour la date sélectionnée
    const selectedDateEvents = events.filter(event =>
        isSameDay(event.date, selectedDate)
    )

    // Heures pour la vue jour
    const hours = Array.from({ length: 24 }, (_, i) => i)

    // Week days translation
    // const weekDays = t.raw("weekDays") as string[] // Assuming t.raw works or we map manually
    // Better to use t("weekDays.0"), etc or just hardcode map if array is not supported well in all setups, 
    // but next-intl supports arrays. Let's assume we can map or use date-fns to generate them.
    // Actually, date-fns is better for days of week.
    // But for now, let's use the translation keys if we added them as an array.
    // If next-intl returns array for t('weekDays'), we can use it.
    // However, safely, we can just use date-fns to format the days.

    const weekDays = eachDayOfInterval({
        start: startOfWeek(new Date(), { locale: dateLocale }),
        end: endOfWeek(new Date(), { locale: dateLocale })
    }).map(day => format(day, "EEE", { locale: dateLocale }))


    return (
        <div className="flex h-screen bg-background">
            <Sidebar />
            <MainContent className="bg-background">
                <div className="h-full flex flex-col bg-background overflow-hidden">
                    {/* Header */}
                    <header className="flex items-center justify-between px-8 py-6 border-b border-border/40 bg-background/50 backdrop-blur-xl sticky top-0 z-10">
                        <div className="flex items-center gap-4">
                            {view === "day" && (
                                <button
                                    onClick={() => setView("month")}
                                    className="p-2 rounded-lg hover:bg-muted transition-colors mr-2"
                                >
                                    <ArrowLeft className="h-5 w-5" />
                                </button>
                            )}
                            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                                <CalendarIcon className="h-6 w-6" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight">
                                    {view === "month" ? t("title") : format(selectedDate, "EEEE d MMMM", { locale: dateLocale })}
                                </h1>
                                <p className="text-sm text-muted-foreground">
                                    {view === "month" ? t("subtitleMonth") : t("subtitleDay")}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <Button
                                variant="outline"
                                onClick={() => setIsGenerateOpen(true)}
                                className="flex items-center gap-2 border-indigo-500/20 text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/30"
                            >
                                <Wand2 className="h-4 w-4" />
                                <span className="text-sm font-medium">{t("generatePlan")}</span>
                            </Button>

                            <div className="h-6 w-px bg-border/60 mx-1" />

                            <button
                                onClick={goToToday}
                                className="px-4 py-2 text-sm font-medium rounded-lg border border-border/60 hover:bg-muted transition-colors"
                            >
                                {t("today")}
                            </button>
                            <div className="flex items-center rounded-lg border border-border/60 bg-background p-1">
                                <button onClick={prevPeriod} className="p-1.5 rounded-md hover:bg-muted transition-colors">
                                    <ChevronLeft className="h-4 w-4" />
                                </button>
                                <span className="px-4 text-sm font-semibold min-w-[140px] text-center capitalize">
                                    {view === "month"
                                        ? format(currentDate, "MMMM yyyy", { locale: dateLocale })
                                        : format(selectedDate, "d MMM yyyy", { locale: dateLocale })
                                    }
                                </span>
                                <button onClick={nextPeriod} className="p-1.5 rounded-md hover:bg-muted transition-colors">
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                            <Button
                                onClick={() => setIsAddEventOpen(true)}
                                className="flex items-center gap-2"
                            >
                                <Plus className="h-4 w-4" />
                                <span className="text-sm font-medium">{t("newEvent")}</span>
                            </Button>
                        </div>
                    </header>

                    <div className="flex-1 flex overflow-hidden">
                        {view === "month" ? (
                            // VUE MOIS
                            <>
                                <div className="flex-1 flex flex-col p-6 overflow-y-auto">
                                    <div className="grid grid-cols-7 mb-4">
                                        {weekDays.map((day) => (
                                            <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2 capitalize">
                                                {day}
                                            </div>
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-7 grid-rows-6 gap-4 flex-1 min-h-[600px]">
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
                                                    transition={{ delay: dayIdx * 0.01 }}
                                                    onClick={() => handleDayClick(day)}
                                                    className={cn(
                                                        "relative flex flex-col p-3 rounded-2xl border transition-all cursor-pointer group hover:shadow-md",
                                                        isSelected
                                                            ? "ring-2 ring-primary border-transparent bg-primary/5"
                                                            : "border-border/40 bg-card hover:border-border/80",
                                                        !isCurrentMonth && "opacity-40 bg-muted/30 grayscale"
                                                    )}
                                                >
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className={cn(
                                                            "text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full",
                                                            isTodayDate
                                                                ? "bg-primary text-primary-foreground shadow-sm"
                                                                : "text-foreground"
                                                        )}>
                                                            {format(day, "d")}
                                                        </span>
                                                        {dayEvents.length > 0 && (
                                                            <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md">
                                                                {dayEvents.length}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="flex-1 flex flex-col gap-1.5 overflow-hidden">
                                                        {dayEvents.slice(0, 3).map((event) => (
                                                            <div
                                                                key={event.id}
                                                                className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-background/80 border border-border/20 shadow-sm"
                                                            >
                                                                <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", event.color)} />
                                                                <span className="text-[10px] font-medium truncate leading-tight">
                                                                    {event.title}
                                                                </span>
                                                            </div>
                                                        ))}
                                                        {dayEvents.length > 3 && (
                                                            <span className="text-[10px] text-muted-foreground pl-1">
                                                                +{dayEvents.length - 3} autres
                                                            </span>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            )
                                        })}
                                    </div>
                                </div>

                                {/* Sidebar Détails (Mois) */}
                                <div className="w-80 border-l border-border/40 bg-card/30 backdrop-blur-sm p-6 flex flex-col gap-6 overflow-y-auto">
                                    <div>
                                        <h2 className="text-lg font-semibold mb-1 capitalize">
                                            {format(selectedDate, "EEEE d MMMM", { locale: dateLocale })}
                                        </h2>
                                        <p className="text-sm text-muted-foreground">
                                            {t("eventsScheduled", { count: selectedDateEvents.length })}
                                        </p>
                                    </div>

                                    <div className="space-y-3 flex-1">
                                        {selectedDateEvents.length > 0 ? (
                                            selectedDateEvents.map((event) => (
                                                <div
                                                    key={event.id}
                                                    className="group p-3 rounded-xl border border-border/50 bg-background hover:shadow-md transition-all duration-200"
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className={cn("w-1 h-10 rounded-full mt-1", event.color)} />
                                                        <div className="flex-1 min-w-0">
                                                            <h3 className="text-sm font-medium truncate">{event.title}</h3>
                                                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                                                <Clock className="h-3 w-3" />
                                                                <span>{format(event.date, "HH:mm")}</span>
                                                                {event.duration > 0 && <span>• {event.duration} min</span>}
                                                            </div>
                                                            {event.description && (
                                                                <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                                                                    {event.description}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <button
                                                            onClick={(e) => handleDeleteEvent(event.id, e)}
                                                            className="opacity-0 group-hover:opacity-100 p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center py-10 text-muted-foreground">
                                                <p className="text-sm">{t("noEvents")}</p>
                                                <Button
                                                    variant="link"
                                                    onClick={() => setIsAddEventOpen(true)}
                                                    className="mt-2 text-xs h-auto p-0"
                                                >
                                                    {t("addEvent")}
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        ) : (
                            // VUE JOUR (TIMELINE)
                            <div className="flex-1 overflow-y-auto p-6 relative">
                                <div className="max-w-6xl mx-auto bg-card/50 backdrop-blur-sm rounded-2xl border border-border/40 shadow-sm overflow-hidden relative">
                                    {/* Grille des heures */}
                                    <div className="relative min-h-[1440px]"> {/* 24h * 60px/h */}
                                        {hours.map((hour) => (
                                            <div key={hour} className="flex h-[60px] border-b border-border/30 group">
                                                {/* Colonne Heure */}
                                                <div className="w-20 flex-shrink-0 border-r border-border/30 p-2 text-xs text-muted-foreground font-medium text-right pr-4 group-hover:bg-accent transition-colors">
                                                    {hour.toString().padStart(2, '0')}:00
                                                </div>
                                                {/* Colonne Contenu (Click to add) */}
                                                <div
                                                    className="flex-1 relative group-hover:bg-accent transition-colors cursor-pointer"
                                                    onClick={() => {
                                                        setNewEventTime(`${hour.toString().padStart(2, '0')}:00`)
                                                        setIsAddEventOpen(true)
                                                    }}
                                                />
                                            </div>
                                        ))}

                                        {/* Événements positionnés en absolu */}
                                        {selectedDateEvents.map((event) => {
                                            const startHour = getHours(event.date)
                                            const startMin = getMinutes(event.date)
                                            const top = (startHour * 60) + startMin // 1px par minute
                                            const height = event.duration || 30 // Minimum 30px pour visibilité

                                            return (
                                                <div
                                                    key={event.id}
                                                    className={cn(
                                                        "absolute left-24 right-4 rounded-lg p-3 border shadow-sm cursor-pointer hover:brightness-95 transition-all overflow-hidden",
                                                        event.color.replace("bg-", "bg-").replace("500", "100"),
                                                        event.color.replace("bg-", "border-").replace("500", "200"),
                                                        "dark:bg-opacity-20"
                                                    )}
                                                    style={{
                                                        top: `${top}px`,
                                                        height: `${height}px`,
                                                        minHeight: '40px'
                                                    }}
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        // Edit logic could go here
                                                    }}
                                                >
                                                    <div className="flex justify-between items-start h-full">
                                                        <div className="flex flex-col h-full">
                                                            <div className="flex items-center gap-2">
                                                                <div className={cn("w-2 h-2 rounded-full", event.color)} />
                                                                <span className="text-sm font-semibold text-foreground/90 leading-tight">
                                                                    {event.title}
                                                                </span>
                                                            </div>
                                                            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                                                <Clock className="h-3 w-3" />
                                                                {format(event.date, "HH:mm")} - {format(setMinutes(event.date, getMinutes(event.date) + event.duration), "HH:mm")}
                                                            </div>
                                                            {event.description && (
                                                                <p className="text-xs text-muted-foreground mt-1 line-clamp-1 opacity-80">
                                                                    {event.description}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <button
                                                            onClick={(e) => handleDeleteEvent(event.id, e)}
                                                            className="p-1 text-muted-foreground hover:text-red-500 rounded-md hover:bg-background/50 transition-colors"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            )
                                        })}

                                        {/* Indicateur de l'heure actuelle (si aujourd'hui) */}
                                        {isToday(selectedDate) && (
                                            <div
                                                className="absolute left-20 right-0 border-t-2 border-red-500 z-10 pointer-events-none flex items-center"
                                                style={{ top: `${(getHours(new Date()) * 60) + getMinutes(new Date())}px` }}
                                            >
                                                <div className="w-3 h-3 rounded-full bg-red-500 -ml-1.5" />
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
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>{t("dialogAddTitle")}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">{t("labelTitle")}</label>
                                <Input
                                    placeholder={t("placeholderTitle")}
                                    value={newEventTitle}
                                    onChange={(e) => setNewEventTitle(e.target.value)}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t("labelTime")}</label>
                                    <Input
                                        type="time"
                                        value={newEventTime}
                                        onChange={(e) => setNewEventTime(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t("labelDuration")}</label>
                                    <Input
                                        type="number"
                                        min="15"
                                        step="15"
                                        value={newEventDuration}
                                        onChange={(e) => setNewEventDuration(e.target.value)}
                                        disabled={newEventType === "deadline"}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">{t("labelType")}</label>
                                <div className="flex gap-2">
                                    {[
                                        { id: "exam", label: t("typeExam"), color: "bg-red-500" },
                                        { id: "study", label: t("typeStudy"), color: "bg-blue-500" },
                                        { id: "deadline", label: t("typeDeadline"), color: "bg-amber-500" }
                                    ].map((type) => (
                                        <button
                                            key={type.id}
                                            onClick={() => setNewEventType(type.id as any)}
                                            className={cn(
                                                "flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-all",
                                                newEventType === type.id
                                                    ? "border-primary bg-primary/5 text-primary"
                                                    : "border-border hover:bg-muted"
                                            )}
                                        >
                                            <div className="flex items-center justify-center gap-2">
                                                <div className={cn("w-2 h-2 rounded-full", type.color)} />
                                                {type.label}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">{t("labelDate")}</label>
                                <div className="px-3 py-2 rounded-lg border border-border bg-muted/50 text-sm text-muted-foreground capitalize">
                                    {format(selectedDate, "EEEE d MMMM yyyy", { locale: dateLocale })}
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsAddEventOpen(false)}>{t("cancel")}</Button>
                            <Button onClick={handleAddEvent} disabled={!newEventTitle.trim()}>{t("add")}</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Modal Génération IA */}
                <Dialog open={isGenerateOpen} onOpenChange={setIsGenerateOpen}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-indigo-500" />
                                {t("dialogGenerateTitle")}
                            </DialogTitle>
                            <DialogDescription>
                                {t("dialogGenerateDesc")}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">{t("labelCollection")}</label>
                                <select
                                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                                    value={selectedCollectionId}
                                    onChange={(e) => setSelectedCollectionId(e.target.value)}
                                >
                                    <option value="">{t("selectCollection")}</option>
                                    {collections?.map(c => (
                                        <option key={c.id} value={c.id}>{c.title}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t("labelStart")}</label>
                                    <Input
                                        type="date"
                                        value={planStartDate}
                                        onChange={(e) => setPlanStartDate(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t("labelEnd")}</label>
                                    <Input
                                        type="date"
                                        value={planEndDate}
                                        onChange={(e) => setPlanEndDate(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">{t("labelIntensity")}</label>
                                <div className="flex gap-2">
                                    {[t("intensityLight"), t("intensityMedium"), t("intensityIntense")].map((level) => (
                                        <button
                                            key={level}
                                            onClick={() => setPlanIntensity(level)}
                                            className={cn(
                                                "flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-all",
                                                planIntensity === level
                                                    ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300"
                                                    : "border-border hover:bg-muted"
                                            )}
                                        >
                                            {level}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsGenerateOpen(false)}>{t("cancel")}</Button>
                            <Button
                                onClick={handleGeneratePlan}
                                disabled={!selectedCollectionId || isGenerating}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        {t("generating")}
                                    </>
                                ) : (
                                    <>
                                        <Wand2 className="mr-2 h-4 w-4" />
                                        {t("generate")}
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
