import { createHash } from "crypto"

import { NextRequest, NextResponse } from "next/server"
import pdfParse from "pdf-parse"

import { createServerClient } from "@/lib/supabase-server"
import { getSupabaseAdmin } from "@/lib/db"
import { getStorageBucket } from "@/lib/storage"

const DOCUMENTS_BUCKET =
  process.env.GCP_STORAGE_BUCKET || process.env.SUPABASE_DOCUMENTS_BUCKET || "documents"

async function ensureBucket() {
  try {
    const bucket = getStorageBucket(DOCUMENTS_BUCKET)
    const [exists] = await bucket.exists()
    if (!exists) {
      await bucket.create()
    }
  } catch (error) {
    console.error("[ensureBucket] Unable to ensure GCS bucket", error)
    throw error
  }
}

export async function GET(req: NextRequest) {
  const supabase = await createServerClient()
  if (!supabase) {
    console.error("[GET /api/documents] ❌ Supabase client not configured")
    return NextResponse.json({ error: "Configuration Supabase manquante" }, { status: 500 })
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    console.error("[GET /api/documents] ❌ Non authentifié", authError?.message)
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
  }

  const admin = getSupabaseAdmin()
  if (!admin) {
    console.error("[GET /api/documents] ❌ Supabase admin client not configured")
    return NextResponse.json({ error: "Configuration Supabase manquante" }, { status: 500 })
  }

  const { data, error } = await admin
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
        storage_path,
        page_count,
        document_sections:document_sections (
          id,
          heading,
          order_index
        )
      ),
      current_version:document_versions!documents_current_version_fk (
        id,
        processed_at,
        storage_path,
        page_count,
        document_sections:document_sections (
          id,
          heading,
          order_index
        )
      )
    `
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[GET /api/documents] ❌ Erreur Supabase", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const normalized = (data ?? []).map((document) => ({
    ...document,
    tags: Array.isArray((document as any).tags) ? (document as any).tags : [],
  }))

  return NextResponse.json(normalized)
}

export async function POST(req: NextRequest) {
  let documentId: string | null = null
  let adminClient: ReturnType<typeof getSupabaseAdmin> | null = null
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
    adminClient = admin
    if (!admin) {
      return NextResponse.json({ error: "Configuration Supabase manquante" }, { status: 500 })
    }

    await ensureBucket()

    if (user.email) {
      await admin
        .from("users")
        .upsert(
          {
            id: user.id,
            email: user.email,
          },
          { onConflict: "id" }
        )
    }

    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const manualTitle = formData.get("title")?.toString()
    const manualText = formData.get("text")?.toString()
    const tagsInput = formData.get("tags")?.toString() ?? ""
    const tags =
      tagsInput
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
        .filter((value, index, self) => self.indexOf(value) === index) ?? []

    if (!file && !manualText) {
      return NextResponse.json(
        { error: "Veuillez fournir un PDF ou du texte brut." },
        { status: 400 }
      )
    }

    if (file && file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Seuls les fichiers PDF sont acceptés." }, { status: 400 })
    }

    const originalFilename = file?.name || "document.txt"
    const title = manualTitle || originalFilename.replace(/\.[a-zA-Z0-9]+$/, "")

    const { data: document, error: insertDocError } = await admin
      .from("documents")
      .insert({
        user_id: user.id,
        title,
        original_filename: originalFilename,
        status: "processing",
        tags,
      })
      .select("id, title")
      .single()

    if (insertDocError || !document) {
      console.error("[POST /api/documents] insert document", insertDocError)
      throw new Error(insertDocError?.message || "Impossible de créer le document")
    }

    documentId = document.id

    let objectPath: string | null = null
    let payloadManualText: string | null = null
    let checksum: string | null = null
    let pageCount = 0

    if (file) {
      const buffer = Buffer.from(await file.arrayBuffer())
      const filePath = `${user.id}/${documentId}/${Date.now()}-${originalFilename}`
      checksum = createHash("sha256").update(buffer).digest("hex")

      try {
        const bucket = getStorageBucket(DOCUMENTS_BUCKET)
        const remoteFile = bucket.file(filePath)
        await remoteFile.save(buffer, {
          resumable: false,
          contentType: file.type || "application/octet-stream",
          metadata: {
            metadata: {
              userId: user.id,
              documentId,
              originalFilename,
            },
          },
        })
      } catch (uploadError: any) {
        console.error("[POST /api/documents] upload GCS", uploadError)
        throw new Error(uploadError?.message || "Erreur lors du téléversement vers GCS")
      }

      try {
        if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
          const pdfInfo = await pdfParse(buffer)
          pageCount = pdfInfo.numpages ?? 0
        }
      } catch (parseError) {
        console.warn("[POST /api/documents] pdf parse failed", parseError)
        pageCount = 0
      }

      objectPath = filePath
    }

    if (!objectPath && manualText) {
      payloadManualText = manualText.trim()
      checksum = createHash("sha256").update(payloadManualText).digest("hex")
    }

    const { data: version, error: versionError } = await admin
      .from("document_versions")
      .insert({
        document_id: documentId,
        storage_path: objectPath ? `${DOCUMENTS_BUCKET}/${objectPath}` : null,
        page_count: pageCount,
        raw_text: payloadManualText ?? "",
        checksum: checksum ?? createHash("sha256").update(`${documentId}-${Date.now()}`).digest("hex"),
      })
      .select("id")
      .single()

    if (versionError || !version) {
      console.error("[POST /api/documents] insert version", versionError)
      throw new Error(versionError?.message || "Impossible de créer la version du document")
    }

    await admin
      .from("documents")
      .update({
        status: "ready",
        current_version_id: version.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", documentId)

    return NextResponse.json({
      documentId,
      status: "ready",
    })
  } catch (error: any) {
    console.error("[POST /api/documents]", error)
    const message = error?.message || "Erreur serveur"

    if (documentId && adminClient) {
      await adminClient
        .from("documents")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("id", documentId)
    }

    return NextResponse.json({ error: message }, { status: 500 })
  }
}
