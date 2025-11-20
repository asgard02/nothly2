import { NextRequest, NextResponse } from "next/server"

import { createServerClient } from "@/lib/supabase-server"
import { getSupabaseAdmin } from "@/lib/db"

export async function GET(_req: NextRequest, { params }: { params: { id: string } | Promise<{ id: string }> }) {
  try {
    // Handle params as Promise (Next.js 15) or direct object (Next.js 14)
    const resolvedParams = params instanceof Promise ? await params : params
    
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

    const collectionId = resolvedParams?.id
    if (!collectionId) {
      return NextResponse.json({ error: "Identifiant de collection manquant" }, { status: 400 })
    }

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

    const [sourcesResult, flashcardsResult, quizResult] = await Promise.allSettled([
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

    const sources = sourcesResult.status === "fulfilled" ? sourcesResult.value.data ?? [] : []
    const flashcards = flashcardsResult.status === "fulfilled" ? flashcardsResult.value.data ?? [] : []
    const quiz = quizResult.status === "fulfilled" ? quizResult.value.data ?? [] : []

    // Log errors but don't fail the request
    if (sourcesResult.status === "rejected") {
      console.error("[GET /api/collections/:id] sources error", sourcesResult.reason)
    }
    if (flashcardsResult.status === "rejected") {
      console.error("[GET /api/collections/:id] flashcards error", flashcardsResult.reason)
    }
    if (quizResult.status === "rejected") {
      console.error("[GET /api/collections/:id] quiz error", quizResult.reason)
    }

    return NextResponse.json({
      ...collection,
      sources,
      flashcards,
      quiz,
    })
  } catch (error: any) {
    console.error("[GET /api/collections/:id] Unexpected error", error)
    return NextResponse.json(
      { error: error?.message || "Erreur serveur lors de la récupération de la collection" },
      { status: 500 }
    )
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } | Promise<{ id: string }> }) {
  try {
    // Handle params as Promise (Next.js 15) or direct object (Next.js 14)
    const resolvedParams = params instanceof Promise ? await params : params
    
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

    const collectionId = resolvedParams?.id
    if (!collectionId) {
      return NextResponse.json({ error: "Identifiant de collection manquant" }, { status: 400 })
    }

    const {
      data: collection,
      error: fetchError,
    } = await admin
      .from("study_collections")
      .select("id, user_id")
      .eq("id", collectionId)
      .maybeSingle()

    if (fetchError) {
      console.error("[DELETE /api/collections/:id] fetch", fetchError)
      return NextResponse.json({ error: "Impossible de récupérer la collection" }, { status: 500 })
    }

    if (!collection || collection.user_id !== user.id) {
      return NextResponse.json({ error: "Collection introuvable" }, { status: 404 })
    }

    const { error: jobsError } = await admin
      .from("async_jobs")
      .delete()
      .eq("user_id", user.id)
      .eq("type", "collection-generation")
      .contains("payload", { collectionId })

    if (jobsError) {
      console.warn("[DELETE /api/collections/:id] jobs cleanup", jobsError)
    }

    const { error: deleteError } = await admin
      .from("study_collections")
      .delete()
      .eq("id", collectionId)
      .eq("user_id", user.id)

    if (deleteError) {
      console.error("[DELETE /api/collections/:id] delete", deleteError)
      return NextResponse.json({ error: "Impossible de supprimer la collection" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[DELETE /api/collections/:id] Unexpected error", error)
    return NextResponse.json(
      { error: error?.message || "Erreur serveur lors de la suppression de la collection" },
      { status: 500 }
    )
  }
}

