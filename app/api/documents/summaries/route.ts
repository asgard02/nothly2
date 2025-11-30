import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"
import { getSupabaseAdmin } from "@/lib/db"

export const dynamic = "force-dynamic"

// GET /api/documents/summaries - Récupère tous les résumés des documents de l'utilisateur
export async function GET(request: NextRequest) {
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

    // Récupérer tous les documents avec leurs versions et sections
    const { data: documents, error: documentsError } = await admin
      .from("documents")
      .select(
        `
        id,
        title,
        original_filename,
        status,
        created_at,
        updated_at,
        current_version_id,
        document_versions:document_versions!document_versions_document_id_fkey (
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
        )
      `
      )
      .eq("user_id", user.id)
      .eq("status", "ready")
      .order("updated_at", { ascending: false })

    if (documentsError) {
      console.error("[GET /api/documents/summaries] Erreur documents:", documentsError)
      return NextResponse.json({ error: documentsError.message }, { status: 500 })
    }

    // Récupérer les résumés de matières (study_collections)
    const { data: collectionSummariesData, error: collectionError } = await admin
      .from("study_collections")
      .select(`
        id,
        title,
        created_at,
        metadata,
        collection_id,
        collection:collections!collection_id (
          id,
          title
        )
      `)
      .eq("user_id", user.id)
      .not("metadata->summary", "is", null)
      .order("created_at", { ascending: false })

    if (collectionError) {
      console.error("[GET /api/documents/summaries] Erreur subjects:", collectionError)
      // On continue même si erreur sur les subjects
    }

    // Formater les résumés de documents
    const docSummaries = documents
      ?.flatMap((doc) => {
        const currentVersion = doc.document_versions?.find(
          (v: any) => v.id === doc.current_version_id
        ) || doc.document_versions?.[0]

        if (!currentVersion?.document_sections) {
          return []
        }

        return currentVersion.document_sections.map((section: any) => {
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

          return {
            documentId: doc.id,
            documentTitle: doc.title,
            documentFilename: doc.original_filename,
            sectionId: section.id,
            sectionHeading: section.heading || "Sans titre",
            sectionOrder: section.order_index,
            summary: summaryText,
            generatedAt: section.revision_notes?.[0]?.generated_at || null,
            hasSummary: !!summaryText,
            type: "document"
          }
        })
      })
      .filter((item) => item.hasSummary) || []

    // Formater les résumés de matières
    const collSummaries = collectionSummariesData
      ?.filter((item: any) => item.metadata?.summary && typeof item.metadata.summary === 'string' && item.metadata.summary.trim().length > 0)
      .map((item: any) => ({
        documentId: item.collection?.id || item.collection_id, // ID de la matière comme "documentId"
        documentTitle: item.collection?.title || "Matière sans titre",
        documentFilename: "Matière",
        sectionId: item.id, // ID du study_collection
        sectionHeading: item.title || "Résumé de la matière",
        sectionOrder: 0,
        summary: item.metadata.summary,
        generatedAt: item.created_at,
        hasSummary: true,
        type: "subject"
      })) || []

    // Combiner et trier
    const allSummaries = [...collSummaries, ...docSummaries].sort((a, b) => {
      // Trier par date de génération (plus récent en premier)
      const dateA = a.generatedAt ? new Date(a.generatedAt).getTime() : 0
      const dateB = b.generatedAt ? new Date(b.generatedAt).getTime() : 0
      return dateB - dateA
    })

    return NextResponse.json({
      summaries: allSummaries,
      total: allSummaries.length,
    })
  } catch (error: any) {
    console.error("[GET /api/documents/summaries] Erreur:", error)
    return NextResponse.json({ error: error.message || "Erreur serveur" }, { status: 500 })
  }
}

