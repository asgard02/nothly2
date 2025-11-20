import { useCallback, useEffect, useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import type { Note } from "./useNotes"

export type SaveStatus = "idle" | "saving" | "saved" | "error"

interface UseAutoSaveProps {
  noteId: string
  initialTitle: string
  initialContent: string
  enabled?: boolean
}

export function useAutoSave({
  noteId,
  initialTitle,
  initialContent,
  enabled = true,
}: UseAutoSaveProps) {
  const [title, setTitle] = useState(initialTitle)
  const [content, setContent] = useState(initialContent)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle")

  const queryClient = useQueryClient()
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastSavedRef = useRef({ title: initialTitle, content: initialContent })
  const isSavingRef = useRef(false)

  // Synchroniser les valeurs initiales
  useEffect(() => {
    setTitle(initialTitle)
    setContent(initialContent)
    lastSavedRef.current = { title: initialTitle, content: initialContent }
  }, [initialTitle, initialContent])

  // Fonction de sauvegarde optimisée
  const saveToServer = useCallback(async (titleToSave: string, contentToSave: string) => {
    if (isSavingRef.current) return
    if (!enabled || !noteId) return

    // Vérifier si quelque chose a changé
    if (
      titleToSave === lastSavedRef.current.title &&
      contentToSave === lastSavedRef.current.content
    ) {
      return
    }

    try {
      isSavingRef.current = true
      setSaveStatus("saving")

      // Mise à jour optimiste du cache React Query (clé corrigée : "note" au singulier)
      queryClient.setQueryData<Note>(["note", noteId], (old) =>
        old
          ? {
            ...old,
            title: titleToSave,
            content: contentToSave,
            updated_at: new Date().toISOString(),
          }
          : {
            id: noteId,
            title: titleToSave,
            content: contentToSave,
            user_id: "",
            updated_at: new Date().toISOString(),
          }
      )

      const res = await fetch(`/api/notes/${noteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: titleToSave,
          content: contentToSave,
        }),
        keepalive: true, // ⚡ Optimisation : garder la connexion ouverte pour de meilleures perfs
      })

      if (!res.ok) {
        throw new Error("Erreur lors de la sauvegarde")
      }

      lastSavedRef.current = { title: titleToSave, content: contentToSave }
      setSaveStatus("saved")

      // Invalider le cache pour rafraîchir la liste des notes
      queryClient.invalidateQueries({ queryKey: ["notes"] })

      // Repasser à idle après 2 secondes
      setTimeout(() => {
        setSaveStatus("idle")
      }, 2000)
    } catch (error) {
      console.error("Erreur sauvegarde:", error)
      setSaveStatus("error")

      // Revenir à l'état sauvegardé en cas d'erreur
      setTimeout(() => {
        setSaveStatus("idle")
      }, 3000)
    } finally {
      isSavingRef.current = false
    }
  }, [enabled, noteId, queryClient])

  // Auto-save avec debounce
  useEffect(() => {
    if (!enabled || !noteId) return

    // Annuler le timeout précédent
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // ⚡ Déclencher la sauvegarde après 300ms d'inactivité (optimisé pour réactivité)
    saveTimeoutRef.current = setTimeout(() => {
      saveToServer(title, content)
    }, 300)

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [title, content, noteId, enabled, saveToServer])

  // Sauvegarde avant fermeture de page (avec sendBeacon)
  useEffect(() => {
    if (!enabled || !noteId) return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Vérifier s'il y a des modifications non sauvegardées
      const hasUnsavedChanges =
        title !== lastSavedRef.current.title ||
        content !== lastSavedRef.current.content

      if (hasUnsavedChanges) {
        // Sauvegarder avec sendBeacon (plus fiable que fetch pour beforeunload)
        const data = JSON.stringify({
          title,
          content,
          updated_at: new Date().toISOString(),
        })

        // Utiliser sendBeacon pour une sauvegarde garantie
        const blob = new Blob([data], { type: "application/json" })
        navigator.sendBeacon(`/api/notes/${noteId}/beacon`, blob)

        // Afficher un message d'avertissement (optionnel)
        e.preventDefault()
        e.returnValue = ""
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
    }
  }, [title, content, noteId, enabled])

  // Sauvegarde immédiate (utile pour forcer une sauvegarde)
  const saveNow = () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    saveToServer(title, content)
  }

  return {
    title,
    setTitle,
    content,
    setContent,
    saveStatus,
    saveNow,
  }
}

