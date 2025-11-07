import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"
import { getSupabaseAdmin } from "@/lib/db"

// GET /api/notes/recent - Récupère les 5 dernières notes
export async function GET() {
  try {
    console.log("[GET /api/notes/recent] 📥 Début de la requête")
    
    const supabase = await createServerClient()
    if (!supabase) {
      console.error("[GET /api/notes/recent] ❌ Supabase public client not configured")
      return NextResponse.json(
        { error: "Configuration Supabase manquante" },
        { status: 500 }
      )
    }
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error("[GET /api/notes/recent] ❌ Non authentifié")
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    console.log("[GET /api/notes/recent] ✅ User authentifié:", user.email)

    // Récupérer les 5 dernières notes
    const supabaseAdmin = getSupabaseAdmin()

    if (!supabaseAdmin) {
      console.error("[GET /api/notes/recent] ❌ Supabase admin client not configured")
      return NextResponse.json(
        { error: "Configuration Supabase manquante" },
        { status: 500 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from("notes")
      .select("id, title, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(5)

    if (error) {
      console.error("[GET /api/notes/recent] ❌ Erreur Supabase:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log("[GET /api/notes/recent] ✅ Notes récentes:", data?.length || 0)
    return NextResponse.json(data || [])
  } catch (err: any) {
    console.error("[GET /api/notes/recent] ❌ Exception:", err.message)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

