import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"
import { getSupabaseAdmin } from "@/lib/db"

export const dynamic = "force-dynamic"

// GET /api/subjects/[id] - Récupérer une matière spécifique
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { data: collection, error } = await admin
      .from("collections")
      .select("*")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single()

    if (error || !collection) {
      return NextResponse.json({ error: "Matière non trouvée" }, { status: 404 })
    }

    return NextResponse.json(collection)
  } catch (err: any) {
    console.error("[GET /api/subjects/:id] ❌ Exception:", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

// DELETE /api/subjects/[id] - Supprimer une matière
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Vérifier que la matière appartient à l'utilisateur
    const { data: collection, error: fetchError } = await admin
      .from("collections")
      .select("id, title, user_id")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single()

    if (fetchError) {
      // Si l'erreur est "no rows", la collection n'existe pas ou n'appartient pas à l'utilisateur
      if (fetchError.code === "PGRST116" || fetchError.message?.includes("No rows") || fetchError.message?.includes("0 rows")) {
        return NextResponse.json({ error: "Matière non trouvée" }, { status: 404 })
      }
      
      // Pour les autres erreurs, logger et retourner une erreur serveur
      console.error("[DELETE /api/subjects/:id] ❌ Erreur lors de la récupération:", fetchError)
      return NextResponse.json({ error: fetchError.message || "Erreur lors de la récupération" }, { status: 500 })
    }

    if (!collection) {
      return NextResponse.json({ error: "Matière non trouvée" }, { status: 404 })
    }

    console.log("[DELETE /api/subjects/:id] Matière trouvée:", collection.title)
    
    // Supprimer la matière (les documents seront mis à null pour subject_id grâce à on delete set null)
    const { error: deleteError } = await admin
      .from("collections")
      .delete()
      .eq("id", params.id)

    if (deleteError) {
      console.error("[DELETE /api/subjects/:id] ❌ Erreur Supabase lors de la suppression:", deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    console.log("[DELETE /api/subjects/:id] ✅ Matière supprimée avec succès")
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("[DELETE /api/subjects/:id] ❌ Exception:", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

// PATCH /api/subjects/[id] - Mettre à jour une matière
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const body = await request.json()
    const { title, color } = body

    if (!title && !color) {
      return NextResponse.json({ error: "Aucune donnée à mettre à jour" }, { status: 400 })
    }

    const admin = getSupabaseAdmin()
    if (!admin) {
      return NextResponse.json({ error: "Configuration Supabase manquante" }, { status: 500 })
    }

    // Vérifier que la matière appartient à l'utilisateur
    const { data: collection, error: fetchError } = await admin
      .from("collections")
      .select("id")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single()

    if (fetchError || !collection) {
      return NextResponse.json({ error: "Matière non trouvée" }, { status: 404 })
    }

    const updates: any = {}
    if (title) updates.title = title
    if (color) updates.color = color
    updates.updated_at = new Date().toISOString()

    const { data: updatedCollection, error: updateError } = await admin
      .from("collections")
      .update(updates)
      .eq("id", params.id)
      .select()
      .single()

    if (updateError) {
      console.error("[PATCH /api/subjects/:id] ❌ Erreur Supabase:", updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json(updatedCollection)
  } catch (err: any) {
    console.error("[PATCH /api/subjects/:id] ❌ Exception:", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
