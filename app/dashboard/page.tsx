import { redirect } from "next/navigation"
import Sidebar from "@/components/Sidebar"
import ChatButton from "@/components/ChatButton"
import DashboardClient from "@/components/DashboardClient"
import { createServerClient } from "@/lib/supabase-server"

export const dynamic = "force-dynamic" // ⚙️ empêche le cache SSR (utile pour auth dynamique)

export default async function DashboardPage() {
  try {
    // --- 1️⃣ Création client Supabase côté serveur ---
    const supabase = await createServerClient()

    // --- 2️⃣ Récupération utilisateur ---
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    // --- 3️⃣ Gestion des erreurs Supabase ---
    if (error) {
      console.error("❌ Erreur Supabase:", error.message)
      redirect("/login")
    }

    // --- 4️⃣ Redirection si non authentifié ---
    if (!user) {
      console.warn("⚠️ Aucun utilisateur connecté → redirection vers /login")
      redirect("/login")
    }

    // --- 5️⃣ Si tout va bien → afficher le dashboard ---
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />

        {/* Contenu principal avec marge pour la sidebar */}
        <div className="flex-1 ml-64 overflow-y-auto">
          <DashboardClient />
        </div>

        {/* Bouton de chat IA flottant */}
        <ChatButton />
      </div>
    )
  } catch (error: any) {
    // --- 6️⃣ Gestion des erreurs inattendues ---
    console.error("💥 Erreur inattendue dans DashboardPage:", error)
    console.error("Message:", error?.message)
    console.error("Stack:", error?.stack)
    
    // En cas d'erreur, on redirige vers login
    // Note: redirect() lance une exception, donc on ne peut pas faire de cleanup après
    redirect("/login")
  }
}
