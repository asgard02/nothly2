"use client"

import Link from "next/link"

interface LogoProps {
  size?: number
  showText?: boolean
  href?: string | null
  className?: string
}

export default function Logo({
  size = 32,
  showText = true,
  href = "/",
  className = "",
}: LogoProps) {
  const logoElement = (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Petit badge coloré - style dashboard */}
      <div
        className="rounded-md bg-gradient-to-br from-nothly-blue to-nothly-violet shadow-sm"
        style={{ width: size * 0.4, height: size * 0.4 }}
      />
      
      {showText && (
        <span 
          className="text-lg font-bold tracking-tight bg-gradient-to-r from-nothly-blue to-nothly-violet bg-clip-text text-transparent"
          style={{ fontSize: size * 0.65 }}
        >
          Notlhy
        </span>
      )}
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="transition-transform hover:scale-[1.02] active:scale-95">
        {logoElement}
      </Link>
    )
  }

  return logoElement
}

