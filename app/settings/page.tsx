"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function SettingsPage() {
  const router = useRouter()

  useEffect(() => {
    router.push("/settings/profile")
  }, [router])

  return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-muted-foreground">Redirection...</p>
    </div>
  )
}

