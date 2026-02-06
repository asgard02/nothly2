"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertCircle, RefreshCw, LayoutDashboard } from "lucide-react"

export default function WorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Workspace error:", error)
  }, [error])

  return (
    <div className="flex flex-1 min-h-screen items-center justify-center p-6 bg-background">
      <div className="max-w-md w-full rounded-2xl border-2 border-border bg-card p-8 text-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mb-4">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <h1 className="text-2xl font-black uppercase text-foreground mb-2">
          Erreur dans l'espace de travail
        </h1>
        <p className="text-muted-foreground mb-6">
          {error.message || "Une erreur inattendue s'est produite."}
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground/70 mb-4 font-mono">
            ID: {error.digest}
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={reset} className="font-bold">
            <RefreshCw className="h-4 w-4 mr-2" />
            Réessayer
          </Button>
          <Button
            variant="outline"
            onClick={() => window.location.href = "/workspace/dashboard"}
            className="font-bold"
          >
            <LayoutDashboard className="h-4 w-4 mr-2" />
            Dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}
