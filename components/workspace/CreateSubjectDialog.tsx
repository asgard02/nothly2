"use client"

import { useState } from "react"
import { X, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useCreateSubject } from "@/lib/hooks/useSubjects"
import { useTranslations } from "next-intl"

interface CreateSubjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateSubjectDialog({
  open,
  onOpenChange
}: CreateSubjectDialogProps) {
  const t = useTranslations("CreateCollectionDialog")
  const [title, setTitle] = useState("")
  const [selectedColor, setSelectedColor] = useState("bg-[#FDE68A]")
  const createSubject = useCreateSubject()

  // Neo-Brutalism Colors matching SubjectsPage
  const colorOptions = [
    "bg-[#FDE68A]", // Yellow
    "bg-[#FBCFE8]", // Pink
    "bg-[#BAE6FD]", // Blue
    "bg-[#BBF7D0]", // Green
    "bg-[#DDD6FE]", // Purple
    "bg-[#FDBA74]", // Orange
  ]

  const handleCreate = async () => {
    if (!title.trim() || createSubject.isPending) return

    try {
      await createSubject.mutateAsync({
        title: title.trim(),
        color: selectedColor,
      })
      setTitle("")
      setSelectedColor("bg-[#FDE68A]")
      onOpenChange(false)
    } catch (error) {
      console.error("Erreur lors de la création:", error)
    }
  }

  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200 ease-out"
        onClick={() => onOpenChange(false)}
      />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative z-50 w-full max-w-md bg-card border-2 border-border rounded-3xl p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] animate-in zoom-in-95 slide-in-from-bottom-2 duration-200 ease-out"
      >
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-black text-foreground uppercase tracking-tight">{t("title")}</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="p-2 rounded-xl border-2 border-transparent hover:bg-foreground hover:text-background hover:border-border transition-all"
          >
            <X className="h-6 w-6 text-foreground" strokeWidth={3} />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="text-sm font-bold text-foreground mb-2 block uppercase tracking-wide">
              {t("nameLabel")}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && title.trim() && !createSubject.isPending) {
                  handleCreate()
                }
              }}
              placeholder={t("namePlaceholder")}
              className="w-full rounded-xl border-2 border-border bg-card px-4 py-3 text-lg font-bold text-foreground placeholder:text-muted-foreground focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:focus:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] focus:-translate-y-1 focus:-translate-x-1 transition-all"
              autoFocus
            />
          </div>

          <div>
            <label className="text-sm font-bold text-foreground mb-3 block uppercase tracking-wide">
              {t("colorLabel")}
            </label>
            <div className="grid grid-cols-6 gap-3">
              {colorOptions.map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={cn(
                    "h-10 w-10 rounded-full border-2 transition-all relative overflow-hidden",
                    selectedColor === color
                      ? "border-border scale-110 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
                      : "border-border/20 hover:border-border hover:scale-105"
                  )}
                >
                  <div className={cn("absolute inset-0 opacity-100", color)} />
                  {selectedColor === color && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Check className="h-4 w-4 text-foreground" strokeWidth={3} />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-4 mt-8 pt-6 border-t-2 border-border/10">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={createSubject.isPending}
            className="text-muted-foreground font-bold hover:text-foreground hover:bg-muted rounded-xl"
          >
            {t("cancel")}
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!title.trim() || createSubject.isPending}
            className="h-12 px-6 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground border-2 border-border shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] hover:translate-y-[2px] active:translate-y-[4px] active:shadow-none transition-all font-black uppercase tracking-wide"
          >
            {createSubject.isPending ? t("creating") : t("create")}
          </Button>
        </div>
      </div>
    </div>
  )
}

