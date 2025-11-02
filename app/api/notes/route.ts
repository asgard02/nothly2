import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"
import { createClient } from "@supabase/supabase-js"

// Client admin Supabase (avec service_role pour contourner RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// GET /api/notes - Liste toutes les notes de l'utilisateur
export async function GET() {
  try {
    console.log("[GET /api/notes] 📥 Début de la requête")
    
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error("[GET /api/notes] ❌ Non authentifié:", authError?.message)
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    console.log("[GET /api/notes] ✅ User authentifié:", user.email)

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
export async function POST() {
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

    // 2️⃣ Créer la note dans Supabase avec supabaseAdmin (bypass RLS)
    console.log("[POST /api/notes] 📤 Insertion dans Supabase...")
    
    const { data, error } = await supabaseAdmin
      .from("notes")
      .insert({
        user_id: user.id,
        title: "Nouvelle note",
        content: "",
      })
      .select("id, title, content, user_id")
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

    console.log("[POST /api/notes] ✅ Note créée avec succès, ID:", data.id)
    return NextResponse.json(data, { status: 201 })
    
  } catch (err: any) {
    console.error("[POST /api/notes] ❌ Exception non gérée:", err.message, err.stack)
    return NextResponse.json(
      { error: `Erreur serveur: ${err.message}` }, 
      { status: 500 }
    )
  }
}

