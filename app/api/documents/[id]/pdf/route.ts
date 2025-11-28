import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"
import { getSupabaseAdmin } from "@/lib/db"
import { getStorageBucket } from "@/lib/storage"

const DOCUMENTS_BUCKET = process.env.SUPABASE_DOCUMENTS_BUCKET || "documents"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
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

  // Gérer les params qui peuvent être une Promise dans Next.js 15
  const resolvedParams = params instanceof Promise ? await params : params
  const documentId = resolvedParams.id

  // Récupérer le document avec sa version actuelle
  const { data: document, error } = await admin
    .from("documents")
    .select(`
      id,
      user_id,
      current_version:document_versions!documents_current_version_fk (
        id,
        storage_path
      ),
      document_versions:document_versions!document_versions_document_id_fkey (
        id,
        storage_path
      )
    `)
    .eq("id", documentId)
    .eq("user_id", user.id)
    .maybeSingle()

  if (error) {
    console.error("[GET /api/documents/:id/pdf]", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!document) {
    return NextResponse.json({ error: "Document introuvable" }, { status: 404 })
  }

  // Utiliser la version actuelle ou la dernière version
  const currentVersion = Array.isArray(document.current_version) 
    ? document.current_version[0] 
    : document.current_version
  
  const version = currentVersion || document.document_versions?.[0]
  if (!version || !version.storage_path) {
    return NextResponse.json({ error: "Fichier PDF introuvable" }, { status: 404 })
  }

  const storagePath = version.storage_path as string
  const [bucket, ...objectParts] = storagePath.split("/")
  const objectPath = objectParts.join("/")
  const resolvedBucket = bucket || DOCUMENTS_BUCKET

  // Générer une URL signée pour accéder au PDF
  try {
    const gcpProjectId = process.env.GCP_PROJECT_ID
    if (gcpProjectId) {
      // Utiliser Google Cloud Storage
      const gcsBucket = getStorageBucket(resolvedBucket)
      const file = gcsBucket.file(objectPath)
      
      // Générer une URL signée valide 1 heure
      const [signedUrl] = await file.getSignedUrl({
        action: "read",
        expires: Date.now() + 60 * 60 * 1000, // 1 heure
      })

      return NextResponse.json({ url: signedUrl })
    } else {
      // Utiliser Supabase Storage
      const { data, error: storageError } = await admin.storage
        .from(resolvedBucket)
        .createSignedUrl(objectPath, 3600) // 1 heure

      if (storageError || !data) {
        console.error("[GET /api/documents/:id/pdf] Storage error:", storageError)
        return NextResponse.json({ error: "Impossible d'accéder au fichier" }, { status: 500 })
      }

      return NextResponse.json({ url: data.signedUrl })
    }
  } catch (error: any) {
    console.error("[GET /api/documents/:id/pdf] Error:", error)
    return NextResponse.json({ error: "Erreur lors de la génération de l'URL" }, { status: 500 })
  }
}

