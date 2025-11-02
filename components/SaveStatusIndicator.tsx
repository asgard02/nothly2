"use client"

import { Loader2, Check, AlertCircle } from "lucide-react"
import type { SaveStatus } from "@/lib/hooks/useAutoSave"

interface SaveStatusIndicatorProps {
  status: SaveStatus
}

export default function SaveStatusIndicator({ status }: SaveStatusIndicatorProps) {
  if (status === "idle") return null

  return (
    <div
      className={`flex items-center gap-2 text-sm font-medium transition-all duration-200 ${
        status === "saving"
          ? "text-[#64748B]"
          : status === "saved"
          ? "text-green-600"
          : "text-red-500"
      }`}
    >
      {status === "saving" && (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Sauvegarde...</span>
        </>
      )}
      {status === "saved" && (
        <>
          <Check className="h-4 w-4" />
          <span>Sauvegardé</span>
        </>
      )}
      {status === "error" && (
        <>
          <AlertCircle className="h-4 w-4" />
          <span>Erreur de sauvegarde</span>
        </>
      )}
    </div>
  )
}

