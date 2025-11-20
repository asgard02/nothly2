import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"
import { getSupabaseAdmin } from "@/lib/db"
import { getStorageBucket } from "@/lib/storage"

const DOCUMENTS_BUCKET = process.env.SUPABASE_DOCUMENTS_BUCKET || "documents"

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
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

  const documentId = params.id

  const { data: document, error } = await admin
    .from("documents")
    .select(
      `
      id,
      title,
      original_filename,
      status,
      tags,
      created_at,
      updated_at,
      current_version_id,
      document_versions:document_versions!document_versions_document_id_fkey (
        id,
        created_at,
        processed_at,
        page_count,
        document_sections (
          id,
          order_index,
          heading,
          content,
          revision_notes (payload, tokens_used, generated_at),
          quiz_sets (
            id,
            recommended_duration_minutes,
            tokens_used,
            quiz_questions (
              id,
              question_type,
              prompt,
              options,
              answer,
              explanation,
              tags,
              order_index
            )
          )
        )
      ),
      current_version:document_versions!documents_current_version_fk (
        id,
        processed_at,
        page_count,
        document_sections (
          id,
          order_index,
          heading,
          content,
          revision_notes (payload, tokens_used, generated_at),
          quiz_sets (
            id,
            recommended_duration_minutes,
            tokens_used,
            quiz_questions (
              id,
              question_type,
              prompt,
              options,
              answer,
              explanation,
              tags,
              order_index
            )
          )
        )
      )
    `
    )
    .eq("user_id", user.id)
    .eq("id", documentId)
    .maybeSingle()

  if (error) {
    console.error("[GET /api/documents/:id]", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!document) {
    return NextResponse.json({ error: "Document introuvable" }, { status: 404 })
  }

  const normalized = {
    ...document,
    tags: Array.isArray((document as any).tags) ? (document as any).tags : [],
  }

  return NextResponse.json(normalized)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createServerClient()
  if (!supabase) {
    console.error("[DELETE /api/documents/:id] ❌ Supabase client not configured")
    return NextResponse.json({ error: "Configuration Supabase manquante" }, { status: 500 })
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    console.error("[DELETE /api/documents/:id] ❌ Non authentifié", authError?.message)
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
  }

  const admin = getSupabaseAdmin()
  if (!admin) {
    console.error("[DELETE /api/documents/:id] ❌ Supabase admin client not configured")
    return NextResponse.json({ error: "Configuration Supabase manquante" }, { status: 500 })
  }

  const documentId = params.id

  const {
    data: document,
    error: fetchError,
  } = await admin
    .from("documents")
    .select(
      `
      id,
      user_id,
      document_versions:document_versions!document_versions_document_id_fkey (
        id,
        storage_path
      )
    `
    )
    .eq("id", documentId)
    .maybeSingle()

  if (fetchError) {
    console.error("[DELETE /api/documents/:id] ❌ Erreur Supabase (select)", fetchError)
    return NextResponse.json({ error: "Erreur lors de la récupération du document" }, { status: 500 })
  }

  if (!document || document.user_id !== user.id) {
    return NextResponse.json({ error: "Document introuvable" }, { status: 404 })
  }

  const storagePathsByBucket = new Map<string, Set<string>>()

  for (const version of document.document_versions ?? []) {
    const storagePath = version.storage_path as string | null
    if (!storagePath) continue

    const [bucket, ...objectParts] = storagePath.split("/")
    const objectPath = objectParts.join("/")

    if (!bucket || !objectPath) continue

    const normalizedBucket = bucket || DOCUMENTS_BUCKET
    if (!storagePathsByBucket.has(normalizedBucket)) {
      storagePathsByBucket.set(normalizedBucket, new Set())
    }

    storagePathsByBucket.get(normalizedBucket)!.add(objectPath)
  }

  const gcpProjectId = process.env.GCP_PROJECT_ID

  for (const [bucket, pathsSet] of storagePathsByBucket.entries()) {
    const paths = Array.from(pathsSet)
    if (paths.length === 0) continue

    let gcsHandled = false
    if (gcpProjectId) {
      try {
        const gcsBucket = getStorageBucket(bucket)
        await Promise.all(
          paths.map(async (objectPath) => {
            try {
              await gcsBucket.file(objectPath).delete({ ignoreNotFound: true })
            } catch (error) {
              console.warn("[DELETE /api/documents/:id] ⚠️ GCS suppression partielle", {
                bucket,
                objectPath,
                error,
              })
              throw error
            }
          })
        )
        gcsHandled = true
      } catch (error) {
        console.warn("[DELETE /api/documents/:id] ⚠️ Échec suppression GCS, tentative Supabase", {
          bucket,
          paths,
          error,
        })
      }
    }

    if (!gcsHandled) {
      const { error: removeError } = await admin.storage.from(bucket).remove(paths)
      if (removeError) {
        console.error("[DELETE /api/documents/:id] ❌ Erreur suppression storage", removeError)
        return NextResponse.json(
          { error: "Impossible de supprimer les fichiers associés au document" },
          { status: 500 }
        )
      }
    }
  }

  const { error: deleteError } = await admin
    .from("documents")
    .delete()
    .eq("id", documentId)
    .eq("user_id", user.id)

  if (deleteError) {
    console.error("[DELETE /api/documents/:id] ❌ Erreur Supabase (delete)", deleteError)
    return NextResponse.json({ error: "Impossible de supprimer le document" }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
