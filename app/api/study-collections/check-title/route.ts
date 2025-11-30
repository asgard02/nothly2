import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"
import { getSupabaseAdmin } from "@/lib/db"

export const dynamic = "force-dynamic"

// GET /api/study-collections/check-title?title=...&type=...&collectionId=...
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const title = searchParams.get("title")
    const type = searchParams.get("type") // flashcard, quiz, summary
    const collectionId = searchParams.get("collectionId") // Pour la collection parente (optionnel)

    if (!title || !type) {
      return NextResponse.json({ error: "Titre et type requis" }, { status: 400 })
    }

    const admin = getSupabaseAdmin()
    if (!admin) {
      return NextResponse.json({ error: "Configuration Supabase manquante" }, { status: 500 })
    }

    // Vérifier si un titre existe déjà pour cet utilisateur et ce type
    const { data: existing, error } = await admin
      .from("study_collections")
      .select("id, title")
      .eq("user_id", user.id)
      .eq("title", title)
      .eq("type", type)
      .maybeSingle()

    if (error) {
      console.error("[GET /api/study-collections/check-title] Error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      exists: !!existing,
      title: title,
      type: type,
      existingId: existing?.id || null
    })
  } catch (err: any) {
    console.error("[GET /api/study-collections/check-title] Exception:", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
