"use client"

import { useSidebar } from "@/components/providers/SidebarProvider"
import { cn } from "@/lib/utils"

interface MainContentProps {
  children: React.ReactNode
  className?: string
}

export default function MainContent({ children, className }: MainContentProps) {
  const { isOpen } = useSidebar()

  return (
    <div
      className={cn(
        "flex-1 h-screen overflow-hidden transition-all duration-300 ease-in-out",
        isOpen ? "ml-64" : "ml-20",
        className
      )}
    >
      {children}
    </div>
  )
}

