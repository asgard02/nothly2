import { NextRequest, NextResponse } from "next/server"

import { createServerClient } from "@/lib/supabase-server"
import { getSupabaseAdmin } from "@/lib/db"

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
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

  const collectionId = params.id

  const { data: collection, error: collectionError } = await admin
    .from("study_collections")
    .select(
      `
      id,
      title,
      tags,
      status,
      total_sources,
      total_flashcards,
      total_quiz,
      prompt_tokens,
      completion_tokens,
      metadata,
      created_at,
      updated_at
    `
    )
    .eq("id", collectionId)
    .eq("user_id", user.id)
    .maybeSingle()

  if (collectionError) {
    console.error("[GET /api/collections/:id] collection", collectionError)
    return NextResponse.json({ error: "Impossible de récupérer la collection" }, { status: 500 })
  }

  if (!collection) {
    return NextResponse.json({ error: "Collection introuvable" }, { status: 404 })
  }

  const [{ data: sources }, { data: flashcards }, { data: quiz }] = await Promise.all([
    admin
      .from("study_collection_sources")
      .select("id, document_id, document_version_id, title, tags, text_length, created_at")
      .eq("collection_id", collectionId)
      .order("created_at", { ascending: true }),
    admin
      .from("study_collection_flashcards")
      .select("id, question, answer, tags, order_index")
      .eq("collection_id", collectionId)
      .order("order_index", { ascending: true }),
    admin
      .from("study_collection_quiz_questions")
      .select("id, question_type, prompt, options, answer, explanation, tags, order_index")
      .eq("collection_id", collectionId)
      .order("order_index", { ascending: true }),
  ])

  return NextResponse.json({
    ...collection,
    sources: sources ?? [],
    flashcards: flashcards ?? [],
    quiz: quiz ?? [],
  })
}

