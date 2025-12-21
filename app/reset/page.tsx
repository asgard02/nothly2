"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase-client"

export default function ResetPage() {
    const router = useRouter()
    const supabase = createClient()
    const [status, setStatus] = useState("Cleaning up...")

    useEffect(() => {
        const cleanup = async () => {
            try {
                // 1. Clear Supabase Session
                await supabase.auth.signOut()
            } catch (e) {
                console.warn("Supabase signout failed (expected if session invalid)", e)
            }

            // 2. Clear Local Storage
            localStorage.clear()

            // 3. Clear Session Storage
            sessionStorage.clear()

            // 4. Nuke Cookies (Client side attempt)
            document.cookie.split(";").forEach((c) => {
                document.cookie = c
                    .replace(/^ +/, "")
                    .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/")
            })

            setStatus("✅ Cleaned! Redirecting...")

            // 5. Hard Reload to Login
            setTimeout(() => {
                window.location.href = "/login"
            }, 1000)
        }

        cleanup()
    }, [])

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="p-8 bg-white rounded-xl shadow-lg text-center">
                <h1 className="text-2xl font-bold mb-4">Réinitialisation...</h1>
                <p className="text-gray-600">{status}</p>
            </div>
        </div>
    )
}
