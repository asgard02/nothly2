import { NextRequest, NextResponse } from "next/server"

import { getSupabaseAdmin } from "@/lib/db"
import { createServerClient } from "@/lib/supabase-server"

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createServerClient()
  if (!supabase) {
    console.error("[GET /api/jobs/:id] ❌ Supabase public client not configured")
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
    console.error("[GET /api/jobs/:id] ❌ Supabase admin client not configured")
    return NextResponse.json({ error: "Configuration Supabase manquante" }, { status: 500 })
  }

  const { data, error } = await admin
    .from("async_jobs")
    .select(
      "id, user_id, type, status, progress, result, error, payload, created_at, updated_at, started_at, finished_at"
    )
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: "Tâche non trouvée" }, { status: 404 })
  }

  const isTerminal = ["succeeded", "failed", "cancelled"].includes(data.status)

  return NextResponse.json({
    id: data.id,
    type: data.type,
    status: data.status,
    progress: data.progress ?? 0,
    result: data.result,
    error: data.error,
    payload: data.payload,
    created_at: data.created_at,
    updated_at: data.updated_at,
    started_at: data.started_at,
    finished_at: data.finished_at,
    isTerminal,
  })
}

