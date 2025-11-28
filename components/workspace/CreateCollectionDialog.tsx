"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useCreateCollection } from "@/lib/hooks/useCollections"
import { useTranslations } from "next-intl"

interface CreateCollectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateCollectionDialog({
  open,
  onOpenChange
}: CreateCollectionDialogProps) {
  const t = useTranslations("CreateCollectionDialog")
  const [title, setTitle] = useState("")
  const [selectedColor, setSelectedColor] = useState("from-blue-500/20 via-blue-400/10 to-purple-500/20")
  const createCollection = useCreateCollection()

  const colorOptions = [
    "from-blue-500/20 via-blue-400/10 to-purple-500/20",
    "from-emerald-500/20 via-teal-400/10 to-cyan-500/20",
    "from-amber-500/20 via-orange-400/10 to-red-500/20",
    "from-pink-500/20 via-rose-400/10 to-fuchsia-500/20",
    "from-indigo-500/20 via-purple-400/10 to-pink-500/20",
    "from-green-500/20 via-emerald-400/10 to-teal-500/20",
  ]

  const handleCreate = async () => {
    if (!title.trim() || createCollection.isPending) return

    try {
      await createCollection.mutateAsync({
        title: title.trim(),
        color: selectedColor,
      })
      setTitle("")
      setSelectedColor("from-blue-500/20 via-blue-400/10 to-purple-500/20")
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
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-200 ease-out"
        onClick={() => onOpenChange(false)}
      />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative z-50 w-full max-w-md rounded-2xl border border-border/40 bg-card/95 backdrop-blur-md p-6 shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-2 duration-200 ease-out"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold">{t("title")}</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              {t("nameLabel")}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && title.trim() && !createCollection.isPending) {
                  handleCreate()
                }
              }}

              placeholder={t("namePlaceholder")}
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              autoFocus
            />
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground mb-3 block">
              {t("colorLabel")}
            </label>
            <div className="grid grid-cols-6 gap-2">
              {colorOptions.map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={cn(
                    "h-10 rounded-lg border-2 transition-all",
                    selectedColor === color
                      ? "border-primary scale-110 shadow-md"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <div className={cn("h-full w-full rounded-md bg-gradient-to-br", color)} />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-border/40">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={createCollection.isPending}
          >
            {t("cancel")}
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!title.trim() || createCollection.isPending}
            className="rounded-full"
          >
            {createCollection.isPending ? t("creating") : t("create")}
          </Button>
        </div>
      </div>
    </div>
  )
}

