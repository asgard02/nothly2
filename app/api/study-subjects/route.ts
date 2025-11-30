import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"
import { getSupabaseAdmin } from "@/lib/db"

export const dynamic = "force-dynamic"

// GET /api/study-subjects - Récupérer toutes les study_collections de l'utilisateur
export async function GET() {
  try {
    const supabase = await createServerClient()
    if (!supabase) {
      return NextResponse.json({ error: "Configuration Supabase manquante" }, { status: 500 })
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const admin = getSupabaseAdmin()
    if (!admin) {
      return NextResponse.json({ error: "Configuration Supabase manquante" }, { status: 500 })
    }

    // Récupérer les study_collections
    const { data: collections, error } = await admin
      .from("study_collections")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })

    console.log("[GET /api/study-subjects] ✅ Study collections trouvées:", collections?.length || 0)

    if (error) {
      console.error("[GET /api/study-subjects] ❌ Erreur Supabase:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!collections || collections.length === 0) {
      return NextResponse.json([])
    }

    return NextResponse.json(collections)
  } catch (err: any) {
    console.error("[GET /api/study-subjects] ❌ Exception:", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}




