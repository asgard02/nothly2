"use client"

import { Loader2 } from "lucide-react"

export default function WorkspaceLoading() {
  return (
    <div className="flex flex-1 min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" strokeWidth={2.5} />
        <p className="text-sm font-bold uppercase text-muted-foreground">Chargement...</p>
      </div>
    </div>
  )
}
