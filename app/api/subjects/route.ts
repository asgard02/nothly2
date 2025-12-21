import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"
import { getSupabaseAdmin } from "@/lib/db"

export const dynamic = "force-dynamic"

// GET /api/subjects - Récupérer toutes les matières de l'utilisateur
export async function GET() {
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

    // Récupérer les matières
    const { data: collections, error } = await admin
      .from("collections")
      .select("id, title, color, is_favorite, created_at, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })

    console.log("[GET /api/subjects] ✅ Matières trouvées:", collections?.length || 0, "pour user:", user.id)

    if (error) {
      console.error("[GET /api/subjects] ❌ Erreur Supabase:", error)
      
      // Si la table n'existe pas, donner des instructions claires
      if (error.message?.includes("does not exist") || error.message?.includes("schema cache")) {
        return NextResponse.json(
          { 
            error: "La table 'collections' n'existe pas dans la base de données.",
            details: "Veuillez exécuter le fichier 'supabase-create-collections-table.sql' dans l'éditeur SQL de Supabase pour créer la table collections et la colonne collection_id.",
            migrationFile: "supabase-create-collections-table.sql"
          },
          { status: 500 }
        )
      }
      
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!collections || collections.length === 0) {
      console.log("[GET /api/subjects] ⚠️ Aucune matière trouvée pour l'utilisateur")
      return NextResponse.json([])
    }

    // Transformer les données pour correspondre à l'interface Subject
    const formattedCollections = await Promise.all(
      collections.map(async (collection: any) => {
        // Compter les documents
        const { count: docCount } = await admin
          .from("documents")
          .select("*", { count: "exact", head: true })
          .eq("collection_id", collection.id)

        // Compter les artefacts (revision_notes via document_sections)
        const { data: documents } = await admin
          .from("documents")
          .select("id")
          .eq("collection_id", collection.id)

        const documentIds = documents?.map((d: any) => d.id) || []
        
        let artifactCount = 0
        if (documentIds.length > 0) {
          const { data: versions } = await admin
            .from("document_versions")
            .select("id")
            .in("document_id", documentIds)

          const versionIds = versions?.map((v: any) => v.id) || []
          
          if (versionIds.length > 0) {
            const { data: sections } = await admin
              .from("document_sections")
              .select("id")
              .in("document_version_id", versionIds)

            const sectionIds = sections?.map((s: any) => s.id) || []
            
            if (sectionIds.length > 0) {
              const { count } = await admin
                .from("revision_notes")
                .select("*", { count: "exact", head: true })
                .in("document_section_id", sectionIds)
              
              artifactCount = count || 0
            }
          }
        }

        // Trouver la date de dernière activité
        const { data: lastDoc } = await admin
          .from("documents")
          .select("updated_at")
          .eq("collection_id", collection.id)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle()

        return {
          id: collection.id,
          title: collection.title,
          color: collection.color,
          doc_count: docCount || 0,
          artifact_count: artifactCount,
          last_active: lastDoc?.updated_at || collection.updated_at || collection.created_at,
          is_favorite: collection.is_favorite || false,
        }
      })
    )

    console.log("[GET /api/subjects] ✅ Matières formatées:", formattedCollections.length)
    return NextResponse.json(formattedCollections)
  } catch (err: any) {
    console.error("[GET /api/subjects] ❌ Exception:", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

// POST /api/subjects - Créer une nouvelle matière
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { title, color } = body

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Le titre est requis" }, { status: 400 })
    }

    console.log("[POST /api/subjects] 📝 Création matière:", { title: title.trim(), color, user_id: user.id })

    const { data: collection, error } = await admin
      .from("collections")
      .insert({
        user_id: user.id,
        title: title.trim(),
        color: color || "from-blue-500/20 via-blue-400/10 to-purple-500/20",
      })
      .select("id, title, color, created_at, updated_at")
      .single()

    if (error) {
      console.error("[POST /api/subjects] ❌ Erreur Supabase:", error)
      
      // Si la table n'existe pas, donner des instructions claires
      if (error.message?.includes("does not exist") || error.message?.includes("schema cache")) {
        return NextResponse.json(
          { 
            error: "La table 'collections' n'existe pas dans la base de données.",
            details: "Veuillez exécuter le fichier 'supabase-create-collections-table.sql' dans l'éditeur SQL de Supabase pour créer la table collections.",
            migrationFile: "supabase-create-collections-table.sql"
          },
          { status: 500 }
        )
      }
      
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Retourner au format Subject
    const response = {
      id: collection.id,
      title: collection.title,
      color: collection.color,
      doc_count: 0,
      artifact_count: 0,
      last_active: collection.created_at,
      is_favorite: false,
    }
    
    console.log("[POST /api/subjects] ✅ Matière créée avec succès:", response.id)
    return NextResponse.json(response)
  } catch (err: any) {
    console.error("[POST /api/subjects] ❌ Exception:", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
