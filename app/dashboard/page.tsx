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

    redirect("/stack")
  } catch (error: any) {
    // Si c'est une erreur de redirection, la laisser passer
    if (error?.digest?.includes('NEXT_REDIRECT')) {
      throw error
    }
    // Sinon, rediriger vers login
    redirect("/login")
  }
}
