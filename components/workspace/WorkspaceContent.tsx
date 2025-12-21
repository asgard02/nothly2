"use client"

import { useSidebar } from "@/components/providers/SidebarProvider"
import { cn } from "@/lib/utils"

export default function WorkspaceContent({
    children,
}: {
    children: React.ReactNode
}) {
    const { isOpen } = useSidebar()

    return (
        <main
            className={cn(
                "flex-1 p-4 h-screen overflow-hidden transition-all duration-300 ease-in-out",
                isOpen ? "ml-80" : "ml-24"
            )}
        >
            <div className="h-full w-full bg-white border-2 border-black rounded-3xl overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative">
                {children}
            </div>
        </main>
    )
}
