import { createHash } from "crypto"

import { NextRequest, NextResponse } from "next/server"
import pdfParse from "pdf-parse"

import { createServerClient } from "@/lib/supabase-server"
import { getSupabaseAdmin } from "@/lib/db"
import { getBucket } from "@/lib/server/gcs"
import { withRateLimit } from "@/lib/rate-limit"

const DOCUMENTS_BUCKET =
  process.env.GCS_BUCKET ?? process.env.GCP_STORAGE_BUCKET ?? process.env.SUPABASE_DOCUMENTS_BUCKET ?? "nothly-storage"

export const dynamic = "force-dynamic"

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

  try {
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
      collection_id,
      collections!documents_collection_id_fkey (
        is_archived
      ),
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
      console.error("[GET /api/documents] ❌ Détails:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        user_id: user.id,
        user_email: user.email,
      })
      return NextResponse.json({ error: error.message || "Erreur lors de la récupération des documents" }, { status: 500 })
  }

  // Filtrer les documents des collections archivées
  const filtered = (data ?? []).filter((doc: any) => {
    // Garder les documents sans collection (pour compatibilité)
    if (!doc.collections) return true
    // Exclure les documents des collections archivées
    return !doc.collections.is_archived
  })

  const normalized = filtered.map((document) => {
    // Supprimer le champ collections de la réponse
    const { collections, ...rest } = document as any
    return {
      ...rest,
      tags: Array.isArray(rest.tags) ? rest.tags : [],
    }
  })

  return NextResponse.json(normalized)
  } catch (err: any) {
    console.error("[GET /api/documents] ❌ Exception:", err)
    console.error("[GET /api/documents] ❌ Stack:", err.stack)
    
    // Vérifier si c'est une erreur Google Storage
    if (err?.message?.includes("invalid_grant") || err?.message?.includes("account not found") || err?.message?.includes("Google Cloud Storage")) {
      return NextResponse.json({ 
        error: "Google Cloud Storage configuration error",
        message: "The service account key is invalid. Please check your GCP_SERVICE_ACCOUNT_KEY in .env.local",
        details: process.env.NODE_ENV === 'development' ? err?.message : undefined
      }, { status: 500 })
    }
    
    return NextResponse.json({ 
      error: err?.message || "Erreur serveur lors de la récupération des documents",
      details: process.env.NODE_ENV === 'development' ? err?.stack : undefined
    }, { status: 500 })
  }

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

    // Rate limiting pour les uploads (protection contre l'abus de stockage)
    const rateLimitResponse = await withRateLimit(req, "upload", user.id)
    if (rateLimitResponse) return rateLimitResponse

    const admin = getSupabaseAdmin()
    adminClient = admin
    if (!admin) {
      return NextResponse.json({ error: "Configuration Supabase manquante" }, { status: 500 })
    }

    // Créer/mettre à jour l'utilisateur dans la table users si elle existe
    if (user.email) {
      try {
      await admin
        .from("users")
        .upsert(
          {
            id: user.id,
            email: user.email,
          },
          { onConflict: "id" }
        )
      } catch (usersError: any) {
        // Si la table users n'existe pas ou erreur, on continue quand même
        console.warn("[POST /api/documents] ⚠️ Erreur upsert users (non bloquant):", usersError?.message)
      }
    }

    let formData: FormData
    try {
      formData = await req.formData()
    } catch (formError: unknown) {
      const msg = formError instanceof Error ? formError.message : String(formError)
      const isAbort =
        (formError as { name?: string })?.name === "AbortError" ||
        (msg.includes("stream") && (msg.includes("destroyed") || msg.includes("aborted")))
      if (isAbort) {
        console.warn("[POST /api/documents] Client disconnected before formData parsed:", msg)
        return new NextResponse(null, { status: 499 }) // Client Closed Request
      }
      throw formError
    }
    const file = formData.get("file") as File | null
    const manualTitle = formData.get("title")?.toString()
    const manualText = formData.get("text")?.toString()
    const tagsInput = formData.get("tags")?.toString() ?? ""
    const collectionId = formData.get("collection_id")?.toString() || formData.get("subject_id")?.toString()
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

    // Les tags ne sont plus obligatoires si on upload dans une collection
    if (tags.length === 0 && !collectionId) {
      return NextResponse.json(
        { error: "Au moins un tag est requis pour importer un document, ou spécifiez une collection." },
        { status: 400 }
      )
    }

    if (file && file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Seuls les fichiers PDF sont acceptés." }, { status: 400 })
    }

    const originalFilename = file?.name || "document.txt"
    const title = manualTitle || originalFilename.replace(/\.[a-zA-Z0-9]+$/, "")

    const documentData: Record<string, any> = {
      user_id: user.id,
      title,
      original_filename: originalFilename,
      status: "processing",
    }

    // Ajouter les tags seulement s'ils existent
    if (tags.length > 0) {
      documentData.tags = tags
    }

    // Ajouter la collection_id si fournie
    if (collectionId) {
      documentData.collection_id = collectionId
    }

    const { data: document, error: insertDocError } = await admin
      .from("documents")
      .insert(documentData)
      .select("id, title")
      .single()

    // Si l'erreur est due à une colonne manquante, informer l'utilisateur
    if (insertDocError) {
      const errorMessage = insertDocError.message || ""
      if (errorMessage.includes("collection_id") || errorMessage.includes("column")) {
        console.error("[POST /api/documents] ❌ Collection column missing:", insertDocError)
        return NextResponse.json(
          { 
            error: "La colonne collection_id n'existe pas dans la base de données.",
            details: "Exécutez le fichier supabase-add-collections.sql dans l'éditeur SQL de Supabase pour ajouter le support des collections."
          },
          { status: 500 }
        )
      }
      console.error("[POST /api/documents] insert document", insertDocError)
      throw new Error(insertDocError?.message || "Impossible de créer le document")
    }

    if (!document) {
      throw new Error("Impossible de créer le document")
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
        const bucket = getBucket(DOCUMENTS_BUCKET)
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

        if (uploadError?.code === "ERR_OSSL_UNSUPPORTED" || uploadError?.message?.includes("DECODER routines::unsupported")) {
          throw new Error(
            "Google Cloud Storage: OpenSSL compatibility error. " +
            "Ensure GOOGLE_APPLICATION_CREDENTIALS points to a valid key file, or run with: NODE_OPTIONS=--openssl-legacy-provider npm run dev"
          )
        }
        if (uploadError?.message?.includes("invalid_grant") || uploadError?.message?.includes("account not found")) {
          console.error("[POST /api/documents] ❌ Google Storage authentication error - service account invalid")
          throw new Error(
            "Google Cloud Storage authentication failed. " +
            "Please check your GCP_SERVICE_ACCOUNT_KEY or key file. " +
            "The service account key may be invalid, expired, or the account may have been deleted."
          )
        }
        if (uploadError?.message?.includes("stream was destroyed") || uploadError?.message?.includes("write after")) {
          throw new Error("Upload was interrupted. Please try again.")
        }

        throw new Error(uploadError?.message || "Erreur lors du téléversement vers GCS")
      }

      try {
        if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
          const pdfInfo = await pdfParse(buffer)
          pageCount = pdfInfo.numpages ?? 0
          // Extraire le texte du PDF et le stocker
          if (pdfInfo.text && pdfInfo.text.trim().length > 0) {
            // Sanitize text to remove null bytes which Postgres hates
            payloadManualText = pdfInfo.text.replace(/\x00/g, "").trim()
            console.log(`[POST /api/documents] Texte extrait du PDF: ${payloadManualText.length} caractères`)
          } else {
            console.warn("[POST /api/documents] PDF parsé mais aucun texte extrait (peut être un PDF scanné)")
          }
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
    
    // Si on a du texte extrait du PDF, créer le checksum
    if (payloadManualText && !checksum) {
      checksum = createHash("sha256").update(payloadManualText).digest("hex")
    }

    // Créer le job de génération de document
    const { createJob } = await import("@/lib/jobs")
    
    await createJob({
      userId: user.id,
      type: "document-generation",
      payload: {
        documentId,
        userId: user.id,
        userEmail: user.email,
        title,
        originalFilename,
        bucket: DOCUMENTS_BUCKET,
        objectPath,
        manualText: payloadManualText,
        pageCount,
        checksum,
      },
    })

    return NextResponse.json({
      documentId,
      status: "processing",
    })
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error))
    const msg = err.message
    const isStreamDestroyed =
      msg.includes("stream") && (msg.includes("destroyed") || msg.includes("aborted") || msg.includes("ECONNRESET"))

    if (isStreamDestroyed) {
      console.warn("[POST /api/documents] Client disconnected (stream destroyed):", msg)
      if (documentId && adminClient) {
        try {
          await adminClient
            .from("documents")
            .update({ status: "failed", updated_at: new Date().toISOString() })
            .eq("id", documentId)
        } catch (dbErr) {
          console.warn("[POST /api/documents] Could not update document status:", dbErr)
        }
      }
      return new NextResponse(null, { status: 499 })
    }

    console.error("[POST /api/documents]", err)
    if (documentId && adminClient) {
      try {
        await adminClient
          .from("documents")
          .update({ status: "failed", updated_at: new Date().toISOString() })
          .eq("id", documentId)
      } catch (dbErr) {
        console.warn("[POST /api/documents] Could not update document status:", dbErr)
      }
    }
    return NextResponse.json({ error: msg || "Erreur serveur" }, { status: 500 })
  }
}
