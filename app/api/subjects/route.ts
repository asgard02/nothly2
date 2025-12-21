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

    // Récupérer les matières avec le nombre de documents en une seule requête optimisée
    const { data: collections, error } = await admin
      .from("collections")
      .select(`
        id, 
        title, 
        color, 
        created_at, 
        updated_at,
        is_favorite
      `)
      .eq("user_id", user.id)
      .eq("is_archived", false) // Exclure les collections archivées
      .order("updated_at", { ascending: false })

    console.log(`[GET /api/subjects] searching for user_id: ${user.id}`)
    console.log("[GET /api/subjects] Query result:", { count: collections?.length, error })
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

    // Récupérer les compteurs pour toutes les collections en une seule requête
    const collectionIds = collections.map((c: any) => c.id)
    
    // Compter les documents pour toutes les collections
    const { data: docCounts } = await admin
      .from("documents")
      .select("collection_id")
      .in("collection_id", collectionIds)
    
    // Créer un map des compteurs
    const docCountMap = new Map<string, number>()
    docCounts?.forEach((doc: any) => {
      const count = docCountMap.get(doc.collection_id) || 0
      docCountMap.set(doc.collection_id, count + 1)
    })

    // Récupérer la dernière date d'activité pour chaque collection
    const { data: lastDocs } = await admin
      .from("documents")
      .select("collection_id, updated_at")
      .in("collection_id", collectionIds)
      .order("updated_at", { ascending: false })

    // Créer un map des dernières dates
    const lastActiveMap = new Map<string, string>()
    lastDocs?.forEach((doc: any) => {
      if (!lastActiveMap.has(doc.collection_id)) {
        lastActiveMap.set(doc.collection_id, doc.updated_at)
      }
    })

    // Transformer les données pour correspondre à l'interface Subject
    const formattedCollections = collections.map((collection: any) => {
      return {
        id: collection.id,
        user_id: user.id,
        title: collection.title,
        color: collection.color,
        created_at: collection.created_at,
        updated_at: collection.updated_at,
        doc_count: docCountMap.get(collection.id) || 0,
        artifact_count: 0, // On peut calculer ça plus tard si nécessaire
        last_active: lastActiveMap.get(collection.id) || collection.updated_at || collection.created_at,
        is_favorite: collection.is_favorite ?? false, // Utilise ?? pour gérer undefined/null
      }
    })

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
