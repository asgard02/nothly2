import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdmin } from "@/lib/db"
import { createServerClient } from "@supabase/ssr"

export const dynamic = "force-dynamic"

// POST /api/notes/[id]/beacon - Sauvegarde via sendBeacon (avant fermeture page)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Vérification de l'authentification
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("[POST /api/notes/:id/beacon] ❌ Supabase config missing")
      return NextResponse.json(
        { error: "Configuration manquante" },
        { status: 500 }
      )
    }

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll() {
          // Pas besoin de set cookies pour cette route
        },
      },
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error("[POST /api/notes/:id/beacon] ❌ Non authentifié")
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { title, content, updated_at } = body

    const supabaseAdmin = getSupabaseAdmin()

    if (!supabaseAdmin) {
      console.error("[POST /api/notes/:id/beacon] ❌ Supabase admin client not configured")
      return NextResponse.json(
        { error: "Configuration Supabase manquante" },
        { status: 500 }
      )
    }

    // Vérification de propriété: s'assurer que la note appartient à l'utilisateur
    const { data: note, error: fetchError } = await supabaseAdmin
      .from("notes")
      .select("user_id")
      .eq("id", params.id)
      .single()

    if (fetchError || !note) {
      console.error("[POST /api/notes/:id/beacon] ❌ Note non trouvée")
      return NextResponse.json(
        { error: "Note non trouvée" },
        { status: 404 }
      )
    }

    if (note.user_id !== user.id) {
      console.error("[POST /api/notes/:id/beacon] ❌ Accès non autorisé")
      return NextResponse.json(
        { error: "Accès non autorisé" },
        { status: 403 }
      )
    }

    // Mise à jour autorisée
    const { error } = await supabaseAdmin
      .from("notes")
      .update({
        title,
        content,
        updated_at: updated_at || new Date().toISOString(),
      })
      .eq("id", params.id)
      .eq("user_id", user.id) // Double protection

    if (error) {
      console.error("[POST /api/notes/:id/beacon] Erreur update:", error.message)
      return NextResponse.json({ error: "Erreur lors de la sauvegarde" }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (err: any) {
    console.error("[POST /api/notes/:id/beacon] Exception:", err.message)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

