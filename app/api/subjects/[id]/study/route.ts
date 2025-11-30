import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"
import { getSupabaseAdmin } from "@/lib/db"

export const dynamic = "force-dynamic"

// GET /api/subjects/[id]/study - Récupérer les flashcards et quiz d'une matière
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

    const collectionId = params.id

    // Vérifier que la matière appartient à l'utilisateur
    const { data: collection, error: collectionError } = await admin
      .from("collections")
      .select("id, title")
      .eq("id", collectionId)
      .eq("user_id", user.id)
      .single()

    if (collectionError || !collection) {
      return NextResponse.json({ error: "Matière non trouvée" }, { status: 404 })
    }

    // Récupérer toutes les study_collections liées à cette matière
    // Note: Si la colonne collection_id n'existe pas encore, on retourne un tableau vide
    let studyCollections: any[] = []
    try {
      const { data, error: studyError } = await admin
        .from("study_collections")
        .select("id, title, status, total_flashcards, total_quiz, created_at, updated_at, metadata")
        .eq("collection_id", collectionId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (studyError) {
        // Si l'erreur est due à une colonne manquante, on retourne un tableau vide
        if (studyError.message?.includes("column") || studyError.message?.includes("does not exist")) {
          console.warn("[GET /api/subjects/:id/study] Colonne collection_id non trouvée, retour d'un tableau vide. Exécutez le script SQL pour ajouter la colonne.")
          studyCollections = []
        } else {
          console.error("[GET /api/subjects/:id/study] Erreur:", studyError)
          return NextResponse.json({ error: "Erreur lors de la récupération", details: studyError.message }, { status: 500 })
        }
      } else {
        studyCollections = data || []
      }
    } catch (err: any) {
      // Si c'est une erreur de colonne manquante, on retourne un tableau vide
      if (err.message?.includes("column") || err.message?.includes("does not exist")) {
        console.warn("[GET /api/subjects/:id/study] Colonne collection_id non trouvée, retour d'un tableau vide.")
        studyCollections = []
      } else {
        throw err
      }
    }

    // Pour chaque study_collection, récupérer les flashcards et quiz
    const studyCollectionsWithContent = await Promise.all(
      (studyCollections || []).map(async (studyCollection) => {
        // Récupérer les flashcards
        const { data: flashcards } = await admin
          .from("study_collection_flashcards")
          .select("id, question, answer, tags, order_index")
          .eq("collection_id", studyCollection.id)
          .order("order_index", { ascending: true })

        // Récupérer les stats flashcards
        const flashcardIds = flashcards?.map((f: any) => f.id) || []
        let flashcardStats: any[] = []
        if (flashcardIds.length > 0) {
           const { data: stats } = await admin
            .from("flashcard_stats")
            .select("flashcard_id, box, next_review_at, last_reviewed_at")
            .in("flashcard_id", flashcardIds)
            .eq("user_id", user.id)
           flashcardStats = stats || []
        }

        // Récupérer les quiz
        const { data: quizQuestions } = await admin
          .from("study_collection_quiz_questions")
          .select("id, question_type, prompt, options, answer, explanation, tags, order_index")
          .eq("collection_id", studyCollection.id)
          .order("order_index", { ascending: true })

        // Récupérer les stats quiz
        const quizQuestionIds = quizQuestions?.map((q: any) => q.id) || []
        let quizStats: any[] = []
        if (quizQuestionIds.length > 0) {
           const { data: stats } = await admin
            .from("quiz_question_stats")
            .select("quiz_question_id, mastery_level, correct_attempts, total_attempts")
            .in("quiz_question_id", quizQuestionIds)
            .eq("user_id", user.id)
           quizStats = stats || []
        }

        return {
          ...studyCollection,
          flashcards: flashcards || [],
          quizQuestions: quizQuestions || [],
          flashcardStats,
          quizStats
        }
      })
    )

    return NextResponse.json({
      studyCollections: studyCollectionsWithContent,
    })
  } catch (err: any) {
    console.error("[GET /api/subjects/:id/study] ❌ Exception:", err)
    console.error("[GET /api/subjects/:id/study] Stack:", err.stack)
    return NextResponse.json({ 
      error: "Erreur serveur", 
      details: err.message,
      hint: "Vérifiez que la colonne 'collection_id' existe dans la table 'study_collections'. Exécutez le script SQL si nécessaire."
    }, { status: 500 })
  }
}

