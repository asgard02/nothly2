import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"
import { getSupabaseAdmin } from "@/lib/db"

export const dynamic = "force-dynamic"

// POST /api/flashcards/progress - Sauvegarder la progression d'une flashcard
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { flashcardId, quality } = body // quality: 'easy' | 'medium' | 'hard'

    if (!flashcardId || !quality) {
      return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 })
    }

    // Récupérer les stats existantes
    const { data: existingStats } = await admin
      .from("flashcard_stats")
      .select("*")
      .eq("flashcard_id", flashcardId)
      .eq("user_id", user.id)
      .single()

    let box = existingStats?.box || 1
    let nextReview = new Date()

    // Algorithme Leitner simplifié
    // Box 1: 1 jour
    // Box 2: 3 jours
    // Box 3: 7 jours
    // Box 4: 14 jours
    // Box 5: 30 jours

    if (quality === 'easy') {
      box = Math.min(5, box + 1)
    } else if (quality === 'medium') {
      // On garde la même boîte ou on recule légèrement
      box = Math.max(1, box) 
    } else { // hard
      box = 1 // Retour à la case départ
    }

    const daysToAdd = [0, 1, 3, 7, 14, 30][box] || 1
    nextReview.setDate(nextReview.getDate() + daysToAdd)

    if (existingStats) {
      await admin
        .from("flashcard_stats")
        .update({
          box,
          last_reviewed_at: new Date().toISOString(),
          next_review_at: nextReview.toISOString(),
          difficulty: quality,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingStats.id)
    } else {
      await admin
        .from("flashcard_stats")
        .insert({
          user_id: user.id,
          flashcard_id: flashcardId,
          box,
          last_reviewed_at: new Date().toISOString(),
          next_review_at: nextReview.toISOString(),
          difficulty: quality,
        })
    }

    return NextResponse.json({ success: true, box, nextReview })

  } catch (err: any) {
    console.error("[POST /api/flashcards/progress] ❌ Exception:", err)
    return NextResponse.json({ error: "Erreur serveur", details: err.message }, { status: 500 })
  }
}

// GET /api/flashcards/progress - Récupérer les stats
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

    const admin = getSupabaseAdmin()
    if (!admin) {
      return NextResponse.json({ error: "Configuration Supabase manquante" }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const studySubjectId = searchParams.get("studySubjectId") || searchParams.get("studyCollectionId")

    if (!studySubjectId) {
      return NextResponse.json({ error: "studySubjectId manquant" }, { status: 400 })
    }

    // 1. Récupérer les IDs des flashcards de cette collection
    const { data: flashcards } = await admin
      .from("study_collection_flashcards")
      .select("id")
      .eq("collection_id", studySubjectId)

    const flashcardIds = flashcards?.map(f => f.id) || []

    if (flashcardIds.length === 0) {
      return NextResponse.json({ stats: [] })
    }

    // 2. Récupérer les stats pour ces flashcards
    const { data: stats } = await admin
      .from("flashcard_stats")
      .select("*")
      .eq("user_id", user.id)
      .in("flashcard_id", flashcardIds)

    return NextResponse.json({ stats: stats || [] })

  } catch (err: any) {
    console.error("[GET /api/flashcards/progress] ❌ Exception:", err)
    return NextResponse.json({ error: "Erreur serveur", details: err.message }, { status: 500 })
  }
}
