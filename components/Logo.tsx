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
    <div className={`flex items-center ${className}`}>
      <span
        className="font-black italic tracking-tighter"
        style={{ fontSize: size }}
      >
        {showText ? "nothly." : "n."}
      </span>
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

