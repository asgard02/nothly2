import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/db"

// POST /api/notes/[id]/beacon - Sauvegarde via sendBeacon (avant fermeture page)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { title, content, updated_at } = body

    // Utiliser supabaseAdmin pour contourner l'authentification
    // (car sendBeacon peut ne pas inclure les cookies correctement)
    const { error } = await supabaseAdmin
      .from("notes")
      .update({
        title,
        content,
        updated_at: updated_at || new Date().toISOString(),
      })
      .eq("id", params.id)

    if (error) {
      console.error("Erreur beacon:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (err: any) {
    console.error("Erreur beacon:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

