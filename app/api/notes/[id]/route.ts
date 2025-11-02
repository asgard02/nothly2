import { NextRequest, NextResponse } from "next/server"
import { getUser } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/db"

// GET /api/notes/[id] - Récupère une note spécifique
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getUser()
  
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
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

// PATCH /api/notes/[id] - Met à jour une note
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getUser()
  
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
  }

  const body = await request.json()
  const { title, content } = body

  const { data, error } = await supabaseAdmin
    .from("notes")
    .update({
      title,
      content,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.id)
    .eq("user_id", user.id)
    .select()
    .single()

  if (error || !data) {
    console.error("Erreur lors de la mise à jour:", error)
    return NextResponse.json({ error: "Note non trouvée" }, { status: 404 })
  }

  return NextResponse.json(data)
}

// DELETE /api/notes/[id] - Supprime une note
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getUser()
  
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
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

