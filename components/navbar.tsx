"use client"

import Link from "next/link"
import Logo from "@/components/Logo"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
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

  const handleFeaturesClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    
    if (pathname === "/") {
      // Si on est déjà sur la page d'accueil, scroll smooth
      const featuresSection = document.getElementById("features")
      if (featuresSection) {
        // Offset pour la navbar fixe
        const offset = 80
        const elementPosition = featuresSection.getBoundingClientRect().top
        const offsetPosition = elementPosition + window.pageYOffset - offset

        window.scrollTo({
          top: offsetPosition,
          behavior: "smooth"
        })
      }
    } else {
      // Si on est sur une autre page, rediriger
      router.push("/#features")
    }
  }

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
              href="#features"
              onClick={handleFeaturesClick}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200 cursor-pointer"
            >
              Fonctionnalités
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

