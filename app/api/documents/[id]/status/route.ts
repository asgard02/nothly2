import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"
import { getSupabaseAdmin } from "@/lib/db"

/**
 * GET /api/documents/[id]/status
 * Retourne le statut du document et du job associé (pour polling UI).
 * Léger : pas de chargement des sections/versions.
 */

export const dynamic = "force-dynamic"

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

  const { data: document, error: docError } = await admin
    .from("documents")
    .select("id, status")
    .eq("user_id", user.id)
    .eq("id", documentId)
    .maybeSingle()

  if (docError || !document) {
    return NextResponse.json({ error: "Document introuvable" }, { status: 404 })
  }

  const response: {
    status: string
    progress?: number | null
    error?: string | null
    jobId?: string | null
  } = {
    status: document.status,
  }

  if (document.status === "processing") {
    const { data: job } = await admin
      .from("async_jobs")
      .select("id, status, progress, error")
      .eq("type", "document-generation")
      .eq("status", "running")
      .contains("payload", { documentId })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!job) {
      const { data: pendingJob } = await admin
        .from("async_jobs")
        .select("id, status, progress, error")
        .eq("type", "document-generation")
        .eq("status", "pending")
        .contains("payload", { documentId })
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      const j = pendingJob || job
      if (j) {
        response.jobId = (j as any).id
        response.progress = (j as any).progress ?? 0
        response.error = (j as any).error ?? null
      }
    } else {
      response.jobId = (job as any).id
      response.progress = (job as any).progress ?? 0
      response.error = (job as any).error ?? null
    }
  }

  if (document.status === "failed") {
    const { data: failedJob } = await admin
      .from("async_jobs")
      .select("id, error")
      .eq("type", "document-generation")
      .eq("status", "failed")
      .contains("payload", { documentId })
      .order("finished_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (failedJob) {
      response.error = (failedJob as any).error ?? null
      response.jobId = (failedJob as any).id
    }
  }

  return NextResponse.json(response)
}
