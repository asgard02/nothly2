import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase-server"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  try {
    const supabase = await createServerClient()

    if (!supabase) {
      redirect("/login")
    }

    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      redirect("/login")
    }

    // Nouvelle redirection vers l'espace de travail unifié
    redirect("/workspace")
  } catch (error: any) {
    if (error?.digest?.includes('NEXT_REDIRECT')) {
      throw error
    }
    redirect("/login")
  }
}
