"use client"

import { useEffect, useRef } from "react"

export function AntigravityBackground() {
    return (
        <div className="fixed inset-0 z-[-1] overflow-hidden bg-background pointer-events-none">
            {/* Background Gradients/Blobs */}
            <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-500/20 rounded-full blur-[120px] mix-blend-screen animate-blob" />
            <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-purple-500/20 rounded-full blur-[100px] mix-blend-screen animate-blob animation-delay-2000" />
            <div className="absolute bottom-0 left-1/3 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[130px] mix-blend-screen animate-blob animation-delay-4000" />

            {/* Grid overlay for texture */}
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.02]" />
        </div>
    )
}
