"use client"

import NextImage from "next/image"
import Link from "next/link"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

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
  const { theme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Détermine le thème actif
  const isDark = mounted && (resolvedTheme === "dark" || theme === "dark")

  // Utilise le logo approprié selon le thème
  // Tu peux créer logo-light.png et logo-dark.png plus tard
  const logoSrc = "/logo-nothly.png"
  // const logoSrc = isDark ? "/logo-light.png" : "/logo-nothly.png"

  const logoElement = (
    <div className={`flex items-center gap-2 ${className}`}>
      <NextImage
        src={logoSrc}
        alt="Notlhy logo"
        width={size}
        height={size}
        className="rounded-xl transition-transform duration-300 hover:rotate-6 hover:scale-105 object-contain"
        priority
      />
      {showText && (
        <span className="text-lg font-semibold text-gray-800 dark:text-white tracking-tight">
          Notlhy
        </span>
      )}
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="group transition-transform hover:scale-105">
        {logoElement}
      </Link>
    )
  }

  return logoElement
}

