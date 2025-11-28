import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"
import { getSupabaseAdmin } from "@/lib/db"

export const dynamic = "force-dynamic"

// GET /api/study-collections/[id] - Récupérer les détails d'une study_collection avec flashcards et quiz
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

    console.log("[GET /api/study-collections/:id] Tentative de récupération de la study_collection:", params.id, "pour user:", user.id)

    // Récupérer la collection
    const { data: collection, error: collectionError } = await admin
      .from("study_collections")
      .select("*")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single()

    if (collectionError) {
      console.error("[GET /api/study-collections/:id] Erreur lors de la récupération:", collectionError)
      
      // Si l'erreur est "no rows", la collection n'existe pas
      if (collectionError.code === "PGRST116" || collectionError.message?.includes("No rows")) {
        console.warn("[GET /api/study-collections/:id] Study collection non trouvée pour l'ID:", params.id)
        return NextResponse.json({ 
          error: "Collection d'étude non trouvée",
          details: "Cette collection d'étude n'existe pas ou n'appartient pas à cet utilisateur."
        }, { status: 404 })
      }
      
      return NextResponse.json({ error: collectionError.message || "Erreur lors de la récupération" }, { status: 500 })
    }

    if (!collection) {
      console.warn("[GET /api/study-collections/:id] Study collection non trouvée pour l'ID:", params.id)
      return NextResponse.json({ 
        error: "Collection d'étude non trouvée",
        details: "Cette collection d'étude n'existe pas ou n'appartient pas à cet utilisateur."
      }, { status: 404 })
    }

    console.log("[GET /api/study-collections/:id] Study collection trouvée:", collection.title)

    // Récupérer les flashcards
    const { data: flashcards, error: flashcardsError } = await admin
      .from("study_collection_flashcards")
      .select("*")
      .eq("collection_id", params.id)
      .order("order_index", { ascending: true })

    if (flashcardsError) {
      console.error("[GET /api/study-collections/:id] ❌ Erreur flashcards:", flashcardsError)
    }

    // Récupérer les questions de quiz
    const { data: quiz, error: quizError } = await admin
      .from("study_collection_quiz_questions")
      .select("*")
      .eq("collection_id", params.id)
      .order("order_index", { ascending: true })

    if (quizError) {
      console.error("[GET /api/study-collections/:id] ❌ Erreur quiz:", quizError)
    } else {
      console.log("[GET /api/study-collections/:id] ✅ Quiz récupérés:", quiz?.length || 0, "questions")
      if (quiz && quiz.length > 0) {
        console.log("[GET /api/study-collections/:id] Premier quiz:", JSON.stringify(quiz[0], null, 2))
      }
    }

    // Formater la réponse
    const result = {
      ...collection,
      flashcards: flashcards || [],
      quiz: quiz || [],
    }

    console.log("[GET /api/study-collections/:id] Résultat final:", {
      title: result.title,
      flashcardsCount: result.flashcards.length,
      quizCount: result.quiz.length,
    })

    return NextResponse.json(result)
  } catch (err: any) {
    console.error("[GET /api/study-collections/:id] ❌ Exception:", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

// DELETE /api/study-collections/[id] - Supprimer une study_collection
export async function DELETE(
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

    console.log("[DELETE /api/study-collections/:id] Tentative de suppression de la study_collection:", params.id, "pour user:", user.id)

    // Vérifier que la study_collection appartient à l'utilisateur
    const { data: collection, error: fetchError } = await admin
      .from("study_collections")
      .select("id, title, user_id")
      .eq("id", params.id)
      .eq("user_id", user.id)
      .single()

    if (fetchError) {
      // Si l'erreur est "no rows", la collection n'existe pas ou n'appartient pas à l'utilisateur
      if (fetchError.code === "PGRST116" || fetchError.message?.includes("No rows") || fetchError.message?.includes("0 rows")) {
        console.warn("[DELETE /api/study-collections/:id] Study collection non trouvée pour l'ID:", params.id)
        return NextResponse.json({ error: "Collection d'étude non trouvée" }, { status: 404 })
      }
      
      // Pour les autres erreurs, logger et retourner une erreur serveur
      console.error("[DELETE /api/study-collections/:id] ❌ Erreur lors de la récupération:", fetchError)
      return NextResponse.json({ error: fetchError.message || "Erreur lors de la récupération" }, { status: 500 })
    }

    if (!collection) {
      console.warn("[DELETE /api/study-collections/:id] Study collection non trouvée pour l'ID:", params.id)
      return NextResponse.json({ error: "Collection d'étude non trouvée" }, { status: 404 })
    }

    console.log("[DELETE /api/study-collections/:id] Study collection trouvée:", collection.title)

    // Supprimer les flashcards associées (cascade devrait le faire automatiquement, mais on le fait explicitement pour être sûr)
    const { error: flashcardsDeleteError } = await admin
      .from("study_collection_flashcards")
      .delete()
      .eq("collection_id", params.id)

    if (flashcardsDeleteError) {
      console.warn("[DELETE /api/study-collections/:id] ⚠️ Erreur lors de la suppression des flashcards:", flashcardsDeleteError)
      // On continue quand même la suppression de la collection
    }

    // Supprimer les questions de quiz associées
    const { error: quizDeleteError } = await admin
      .from("study_collection_quiz_questions")
      .delete()
      .eq("collection_id", params.id)

    if (quizDeleteError) {
      console.warn("[DELETE /api/study-collections/:id] ⚠️ Erreur lors de la suppression des quiz:", quizDeleteError)
      // On continue quand même la suppression de la collection
    }

    // Supprimer la study_collection
    const { error: deleteError } = await admin
      .from("study_collections")
      .delete()
      .eq("id", params.id)

    if (deleteError) {
      console.error("[DELETE /api/study-collections/:id] ❌ Erreur Supabase lors de la suppression:", deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    console.log("[DELETE /api/study-collections/:id] ✅ Study collection supprimée avec succès")
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("[DELETE /api/study-collections/:id] ❌ Exception:", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

