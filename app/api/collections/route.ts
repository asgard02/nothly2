import { NextRequest, NextResponse } from "next/server"

import { createServerClient } from "@/lib/supabase-server"
import { getSupabaseAdmin } from "@/lib/db"
import { createJob } from "@/lib/jobs"
import type { CollectionGenerationJobPayload, CollectionGenerationSource } from "@/lib/collections/processor"

function ensureArray(value: unknown): string[] {
  if (!value) return []
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry).trim()).filter(Boolean)
  }
  return String(value)
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function pickLatestVersion(document: any) {
  if (document.current_version) {
    return document.current_version
  }
  const versions = document.document_versions ?? []
  if (!versions.length) return null
  return versions.slice().sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).pop()
}

export async function GET(req: NextRequest) {
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
    console.error("[GET /api/collections] Admin client is null - SUPABASE_SERVICE_ROLE_KEY not configured")
    return NextResponse.json({ error: "Configuration serveur invalide" }, { status: 500 })
  }
  const db = admin

  const { data, error } = await db
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
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[GET /api/collections] Supabase error", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
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
    console.error("[POST /api/collections] Admin client is null - SUPABASE_SERVICE_ROLE_KEY not configured")
    return NextResponse.json({ error: "Configuration serveur invalide" }, { status: 500 })
  }
  const db = admin

  let body: any = null
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 })
  }

  const rawTags = ensureArray(body?.tags)
  if (rawTags.length === 0) {
    return NextResponse.json({ error: "Merci de sélectionner au moins un tag" }, { status: 400 })
  }

  const title =
    typeof body?.title === "string" && body.title.trim()
      ? body.title.trim()
      : `Collection ${new Date().toLocaleString("fr-FR")}`

  const { data: documents, error: documentsError } = await db
    .from("documents")
    .select(
      `
      id,
      title,
      tags,
      status,
      current_version_id,
      current_version:document_versions!documents_current_version_fk (
        id,
        storage_path,
        raw_text,
        created_at
      ),
      document_versions:document_versions!document_versions_document_id_fkey (
        id,
        storage_path,
        raw_text,
        created_at
      )
    `
    )
    .eq("user_id", user.id)
    .overlaps("tags", rawTags)

  if (documentsError) {
    console.error("[POST /api/collections] documents ERROR:", {
      error: documentsError,
      code: documentsError.code,
      message: documentsError.message,
      details: documentsError.details,
      hint: documentsError.hint,
      tags: rawTags,
    })
    return NextResponse.json({ error: "Impossible de récupérer les supports" }, { status: 500 })
  }

  console.log("[POST /api/collections] documents found:", documents?.length || 0)

  const sources: Array<{ document: any; version: any }> = []

  for (const document of documents ?? []) {
    const version = pickLatestVersion(document)
    if (!version) continue

    if (!version.storage_path && !version.raw_text) {
      continue
    }

    sources.push({ document, version })
  }

  if (sources.length === 0) {
    return NextResponse.json({ error: "Aucun support trouvé pour les tags sélectionnés" }, { status: 400 })
  }

  const { data: collection, error: collectionError } = await db
    .from("study_collections")
    .insert({
      user_id: user.id,
      title,
      tags: rawTags,
      status: "processing",
      total_sources: sources.length,
    })
    .select("id")
    .single()

  if (collectionError || !collection) {
    console.error("[POST /api/collections] insert collection", collectionError)
    return NextResponse.json({ error: "Impossible de créer la collection" }, { status: 500 })
  }

  const sourceRows = sources.map(({ document, version }) => ({
    collection_id: collection.id,
    document_id: document.id,
    document_version_id: version.id,
    title: document.title,
    tags: document.tags ?? [],
    text_length: 0,
  }))

  const { error: insertSourcesError } = await db.from("study_collection_sources").insert(sourceRows)

  if (insertSourcesError) {
    console.error("[POST /api/collections] insert sources", insertSourcesError)
    await db.from("study_collections").delete().eq("id", collection.id)
    return NextResponse.json({ error: "Impossible d'enregistrer les sources de la collection" }, { status: 500 })
  }

  const jobPayload: CollectionGenerationJobPayload = {
    collectionId: collection.id,
    userId: user.id,
    title,
    tags: rawTags,
    sources: sources.map(({ document, version }) => {
      const prepared: CollectionGenerationSource = {
        documentId: document.id,
        documentVersionId: version.id,
        storagePath: version.storage_path ?? "",
        title: document.title,
        tags: document.tags ?? [],
        rawText: version.raw_text ?? null,
      }
      return prepared
    }),
  }

  const job = await createJob({
    userId: user.id,
    type: "collection-generation",
    payload: jobPayload,
    client: db,
  })

  return NextResponse.json({
    collectionId: collection.id,
    jobId: job.id,
    status: "processing",
  })
}

