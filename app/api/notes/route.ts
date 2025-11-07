import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"
import { getSupabaseAdmin } from "@/lib/db"

// GET /api/notes - Liste toutes les notes de l'utilisateur
export async function GET() {
  try {
    console.log("[GET /api/notes] 📥 Début de la requête")
    
    const supabase = await createServerClient()
    if (!supabase) {
      console.error("[POST /api/notes] ❌ Supabase public client not configured")
      return NextResponse.json(
        { error: "Configuration Supabase manquante" },
        { status: 500 }
      )
    }
    if (!supabase) {
      console.error("[GET /api/notes] ❌ Supabase public client not configured")
      return NextResponse.json(
        { error: "Configuration Supabase manquante" },
        { status: 500 }
      )
    }
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error("[GET /api/notes] ❌ Non authentifié:", authError?.message)
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    console.log("[GET /api/notes] ✅ User authentifié:", user.email)

    const supabaseAdmin = getSupabaseAdmin()

    if (!supabaseAdmin) {
      console.error("[GET /api/notes] ❌ Supabase admin client not configured")
      return NextResponse.json(
        { error: "Configuration Supabase manquante" },
        { status: 500 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from("notes")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })

    if (error) {
      console.error("[GET /api/notes] ❌ Erreur Supabase:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log("[GET /api/notes] ✅ Notes récupérées:", data?.length || 0)
    return NextResponse.json(data || [])
  } catch (err: any) {
    console.error("[GET /api/notes] ❌ Exception:", err.message)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

// POST /api/notes - Crée une nouvelle note vide
export async function POST(request: NextRequest) {
  try {
    console.log("[POST /api/notes] 📝 Début de la requête")
    
    // 1️⃣ Récupérer l'utilisateur authentifié
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError) {
      console.error("[POST /api/notes] ❌ Erreur auth:", authError.message)
      return NextResponse.json({ error: "Erreur d'authentification" }, { status: 401 })
    }
    
    if (!user) {
      console.error("[POST /api/notes] ❌ Utilisateur non connecté")
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    console.log("[POST /api/notes] ✅ User authentifié:", user.email, "ID:", user.id)

    // 2️⃣ Récupérer les données depuis le body (id optionnel, title et content optionnels)
    let body: { id?: string; title?: string; content?: string } = {}
    try {
      body = await request.json()
      console.log("[POST /api/notes] 📦 Body reçu:", { 
        id: body.id, 
        title: body.title?.substring(0, 50), 
        contentLength: body.content?.length 
      })
    } catch {
      // Body vide ou invalide, pas grave
      console.log("[POST /api/notes] ⚠️ Body vide ou invalide")
    }

    // 3️⃣ Créer la note dans Supabase avec supabaseAdmin (bypass RLS)
    console.log("[POST /api/notes] 📤 Insertion dans Supabase...", body.id ? `avec ID: ${body.id}` : "sans ID")
    
    const noteData: {
      id?: string
      user_id: string
      title: string
      content: string
    } = {
      user_id: user.id,
      title: body.title || "Nouvelle note", // 🔥 Utiliser le titre fourni ou défaut
      content: body.content || "", // 🔥 Utiliser le contenu fourni ou défaut
    }

    // Si un ID est fourni (optimistic UI), l'utiliser
    if (body.id) {
      noteData.id = body.id
    }

    console.log("[POST /api/notes] 📝 Données à insérer:", {
      id: noteData.id,
      title: noteData.title.substring(0, 50),
      contentLength: noteData.content.length
    })

    const supabaseAdmin = getSupabaseAdmin()

    if (!supabaseAdmin) {
      console.error("[POST /api/notes] ❌ Supabase admin client not configured")
      return NextResponse.json(
        { error: "Configuration Supabase manquante" },
        { status: 500 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from("notes")
      .insert(noteData)
      .select("id, title, content, user_id, updated_at")
      .single()

    if (error) {
      console.error("[POST /api/notes] ❌ Erreur Supabase:", error.message, "Code:", error.code)
      return NextResponse.json(
        { error: `Erreur base de données: ${error.message}` }, 
        { status: 500 }
      )
    }

    if (!data) {
      console.error("[POST /api/notes] ❌ Aucune donnée retournée par Supabase")
      return NextResponse.json({ error: "Échec de création" }, { status: 500 })
    }

    console.log("[POST /api/notes] ✅ Note créée avec succès, ID:", data.id, "Titre:", data.title)
    return NextResponse.json(data, { status: 201 })
    
  } catch (err: any) {
    console.error("[POST /api/notes] ❌ Exception non gérée:", err.message, err.stack)
    return NextResponse.json(
      { error: `Erreur serveur: ${err.message}` }, 
      { status: 500 }
    )
  }
}

