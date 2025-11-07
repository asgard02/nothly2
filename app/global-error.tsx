"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle, RefreshCw } from "lucide-react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log l'erreur globale
    console.error("Global error:", error)
  }, [error])

  return (
    <html lang="fr">
      <body>
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center border-2 border-red-200">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Erreur critique
            </h1>
            
            <p className="text-gray-600 mb-4">
              Une erreur critique s'est produite. Veuillez rafraîchir la page.
            </p>

            {error.digest && (
              <p className="text-xs text-gray-400 mb-6 font-mono">
                ID: {error.digest}
              </p>
            )}

            <Button
              onClick={reset}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Réessayer
            </Button>
          </div>
        </div>
      </body>
    </html>
  )
}






