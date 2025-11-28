import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"
import { getSupabaseAdmin } from "@/lib/db"

export const dynamic = "force-dynamic"

// GET /api/collections/[id]/documents - Récupérer les documents d'une collection
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Vérifier que la collection appartient à l'utilisateur
    const { data: collection, error: collectionError } = await admin
      .from("collections")
      .select("id")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single()

    if (collectionError || !collection) {
      return NextResponse.json({ error: "Collection non trouvée" }, { status: 404 })
    }

    // Récupérer les documents de la collection
    const { data: documents, error } = await admin
      .from("documents")
      .select("id, title, original_filename, status, created_at, updated_at")
      .eq("collection_id", params.id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[GET /api/collections/:id/documents] ❌ Erreur Supabase:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Pour chaque document, compter les notes et récupérer les résumés
    const formattedDocuments = await Promise.all(
      (documents || []).map(async (doc: any) => {
        // Récupérer les versions du document avec sections et résumés
        const { data: versions } = await admin
          .from("document_versions")
          .select(
            `
            id,
            document_sections (
              id,
              heading,
              order_index,
              revision_notes (
                payload,
                generated_at
              )
            )
          `
          )
          .eq("document_id", doc.id)
          .order("created_at", { ascending: false })
          .limit(1)

        let noteCount = 0
        const summaries: Array<{ heading: string; summary: string; sectionId: string }> = []

        if (versions && versions.length > 0) {
          const version = versions[0]
          const sections = version.document_sections || []
          
          noteCount = sections.length

          // Extraire les résumés de chaque section
          sections.forEach((section: any) => {
            const revisionPayload = section.revision_notes?.[0]?.payload
            
            // Extraire le résumé depuis plusieurs sources possibles
            let summaryText = ""
            if (revisionPayload?.summary && revisionPayload.summary.trim()) {
              summaryText = revisionPayload.summary
            } else if (revisionPayload?.sections && revisionPayload.sections.length > 0) {
              const matchingSection = revisionPayload.sections.find(
                (s: any) => s.title === section.heading || s.title?.toLowerCase().includes(section.heading?.toLowerCase() || "")
              )
              if (matchingSection?.summary && matchingSection.summary.trim()) {
                summaryText = matchingSection.summary
              } else if (revisionPayload.sections[0]?.summary && revisionPayload.sections[0].summary.trim()) {
                summaryText = revisionPayload.sections[0].summary
              }
            }

            if (summaryText) {
              summaries.push({
                heading: section.heading || "Sans titre",
                summary: summaryText,
                sectionId: section.id,
              })
            }
          })
        }

        // Log pour debug
        if (summaries.length > 0) {
          console.log(`[GET /api/collections/:id/documents] Document ${doc.title} a ${summaries.length} résumé(s)`)
        }

        return {
          id: doc.id,
          title: doc.title,
          filename: doc.original_filename,
          status: doc.status,
          note_count: noteCount,
          summaries: summaries,
          created_at: doc.created_at,
        }
      })
    )

    return NextResponse.json(formattedDocuments)
  } catch (err: any) {
    console.error("[GET /api/collections/:id/documents] ❌ Exception:", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

