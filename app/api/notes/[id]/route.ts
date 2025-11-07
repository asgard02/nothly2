import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"
import { getSupabaseAdmin } from "@/lib/db"

// GET /api/notes/[id] - Récupère une note spécifique
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createServerClient()
  if (!supabase) {
    console.error("[GET /api/notes/:id] ❌ Supabase public client not configured")
    return NextResponse.json(
      { error: "Configuration Supabase manquante" },
      { status: 500 }
    )
  }
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
  }

  const supabaseAdmin = getSupabaseAdmin()

  if (!supabaseAdmin) {
    console.error("[GET /api/notes/:id] ❌ Supabase admin client not configured")
    return NextResponse.json(
      { error: "Configuration Supabase manquante" },
      { status: 500 }
    )
  }

  const { data, error } = await supabaseAdmin
    .from("notes")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: "Note non trouvée" }, { status: 404 })
  }

  return NextResponse.json(data)
}

// PATCH /api/notes/[id] - Crée ou met à jour une note (UPSERT idempotent)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createServerClient()
  if (!supabase) {
    console.error("[PATCH /api/notes/:id] ❌ Supabase public client not configured")
    return NextResponse.json(
      { error: "Configuration Supabase manquante" },
      { status: 500 }
    )
  }
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
  }

  const body = await request.json()
  const { title, content } = body

  // ⚡ UPSERT idempotent : Crée si n'existe pas, met à jour sinon
  // Cela permet de créer la note au premier edit (pas de note "vide" inutile)
  // updated_at sera géré automatiquement par le trigger PostgreSQL
  const supabaseAdmin = getSupabaseAdmin()

  if (!supabaseAdmin) {
    console.error("[PATCH /api/notes/:id] ❌ Supabase admin client not configured")
    return NextResponse.json(
      { error: "Configuration Supabase manquante" },
      { status: 500 }
    )
  }

  const { data, error } = await supabaseAdmin
    .from("notes")
    .upsert(
      {
        id: params.id, // Utilise l'ID fourni (peut être un UUID local)
        user_id: user.id,
        title: title ?? "Nouvelle note",
        content: content ?? "",
        // updated_at sera mis à jour automatiquement par le trigger
      },
      {
        onConflict: "id", // En cas de conflit sur l'ID, faire un UPDATE
      }
    )
    .select("id, title, content, user_id, updated_at")
    .single()

  if (error) {
    return NextResponse.json(
      { error: error.message || "Erreur lors de la sauvegarde" },
      { status: 500 }
    )
  }

  // Retourner les données dans le format attendu
  return NextResponse.json({
    id: data.id,
    title: data.title,
    content: data.content,
    updated_at: data.updated_at,
  })
}

// DELETE /api/notes/[id] - Supprime une note
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createServerClient()
  if (!supabase) {
    console.error("[DELETE /api/notes/:id] ❌ Supabase public client not configured")
    return NextResponse.json(
      { error: "Configuration Supabase manquante" },
      { status: 500 }
    )
  }
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
  }

  const supabaseAdmin = getSupabaseAdmin()

  if (!supabaseAdmin) {
    console.error("[DELETE /api/notes/:id] ❌ Supabase admin client not configured")
    return NextResponse.json(
      { error: "Configuration Supabase manquante" },
      { status: 500 }
    )
  }

  const { error } = await supabaseAdmin
    .from("notes")
    .delete()
    .eq("id", params.id)
    .eq("user_id", user.id)

  if (error) {
    console.error("Erreur lors de la suppression:", error)
    return NextResponse.json({ error: "Note non trouvée" }, { status: 404 })
  }

  return NextResponse.json({ success: true, message: "Note supprimée" })
}

