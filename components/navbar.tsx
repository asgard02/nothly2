"use client"

import Link from "next/link"
import Logo from "@/components/Logo"
import { Button } from "@/components/ui/button"
import { useState, useEffect, useCallback } from "react"
import { useRouter, usePathname } from "next/navigation"

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const handleAnchorNavigation = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>, targetId: string) => {
      event.preventDefault()

      const navigateToAnchor = (id: string) => {
        const section = document.getElementById(id)
        if (!section) return
        const offset = 88
        const elementPosition = section.getBoundingClientRect().top
        const offsetPosition = elementPosition + window.pageYOffset - offset
        window.scrollTo({ top: offsetPosition, behavior: "smooth" })
      }

      if (pathname === "/") {
        navigateToAnchor(targetId)
      } else {
        router.push(`/#${targetId}`)
      }
    },
    [pathname, router]
  )

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-background/80 backdrop-blur-md border-b border-border shadow-sm"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between">
          {/* Logo */}
          <Logo size={32} showText={true} href="/" />

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            <a
              href="#flux"
              onClick={(event) => handleAnchorNavigation(event, "flux")}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200 cursor-pointer"
            >
              Flux
            </a>
            <a
              href="#valeur"
              onClick={(event) => handleAnchorNavigation(event, "valeur")}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200 cursor-pointer"
            >
              Valeur
            </a>
            <a
              href="#cibles"
              onClick={(event) => handleAnchorNavigation(event, "cibles")}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200 cursor-pointer"
            >
              Cibles
            </a>
            <Link
              href="/pricing"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200"
            >
              Tarifs
            </Link>
            <Link
              href="/login"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200"
            >
              Connexion
            </Link>
            <Link href="/register">
              <Button
                size="sm"
                className="bg-gradient-to-r from-nothly-blue to-nothly-violet text-white rounded-full px-6 transition-all duration-200 hover:scale-105 shadow-sm hover:shadow-md"
              >
                Commencer gratuitement
              </Button>
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Link href="/register">
              <Button
                size="sm"
                className="bg-gradient-to-r from-nothly-blue to-nothly-violet text-white rounded-full px-4 text-xs"
              >
                Commencer
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}

