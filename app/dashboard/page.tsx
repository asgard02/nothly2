import { redirect } from "next/navigation"
import Sidebar from "@/components/Sidebar"
import ChatButton from "@/components/ChatButton"
import DashboardClient from "@/components/DashboardClient"
import { createServerClient } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      redirect("/login")
    }

    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex-1 ml-64 overflow-y-auto">
          <DashboardClient />
        </div>
        <ChatButton />
      </div>
    )
  } catch (error: any) {
    // Si c'est une erreur de redirection, la laisser passer
    if (error?.digest?.includes('NEXT_REDIRECT')) {
      throw error
    }
    // Sinon, rediriger vers login
    redirect("/login")
  }
}
