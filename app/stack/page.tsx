import { redirect } from "next/navigation"
import Sidebar from "@/components/Sidebar"
import ChatButton from "@/components/ChatButton"
import DocumentStack from "@/components/DocumentStack"
import { createServerClient } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"

export default async function StackPage() {
  try {
    const supabase = await createServerClient()

    if (!supabase) {
      redirect("/login")
    }

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      redirect("/login")
    }

    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="ml-64 flex-1 overflow-y-auto">
          <DocumentStack />
        </div>
        <ChatButton />
      </div>
    )
  } catch (error: any) {
    if (error?.digest?.includes("NEXT_REDIRECT")) {
      throw error
    }
    redirect("/login")
  }
}

