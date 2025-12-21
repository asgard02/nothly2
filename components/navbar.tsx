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
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled
        ? "bg-white border-b-4 border-black"
        : "bg-transparent border-b-transparent"
        }`}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between">
          {/* Logo */}
          <Logo size={32} showText={true} href="/" className={scrolled ? "" : "text-black"} />

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            <a
              href="#flow"
              onClick={(event) => handleAnchorNavigation(event, "flow")}
              className="text-sm font-bold uppercase tracking-wider text-black hover:bg-black hover:text-white px-3 py-1 transition-all duration-200 cursor-pointer border-2 border-transparent hover:border-black rounded-lg"
            >
              How it works
            </a>
            <a
              href="#value"
              onClick={(event) => handleAnchorNavigation(event, "value")}
              className="text-sm font-bold uppercase tracking-wider text-black hover:bg-black hover:text-white px-3 py-1 transition-all duration-200 cursor-pointer border-2 border-transparent hover:border-black rounded-lg"
            >
              Value
            </a>
            <a
              href="#audience"
              onClick={(event) => handleAnchorNavigation(event, "audience")}
              className="text-sm font-bold uppercase tracking-wider text-black hover:bg-black hover:text-white px-3 py-1 transition-all duration-200 cursor-pointer border-2 border-transparent hover:border-black rounded-lg"
            >
              Who is it for?
            </a>
            <Link
              href="/login"
              className="text-sm font-bold uppercase tracking-wider text-black hover:bg-black hover:text-white px-3 py-1 transition-all duration-200 border-2 border-transparent hover:border-black rounded-lg"
            >
              Log in
            </Link>
            <Button
              asChild
              size="sm"
              className="bg-black text-white hover:bg-yellow-400 hover:text-black border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-all text-sm font-black uppercase tracking-wide rounded-lg px-6"
            >
              <Link href="/register">
                Start for free
              </Link>
            </Button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              asChild
              size="sm"
              className="bg-black text-white border-2 border-black text-xs font-bold uppercase"
            >
              <Link href="/register">
                Sign up
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  )
}
