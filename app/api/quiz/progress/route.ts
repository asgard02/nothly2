import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"
import { getSupabaseAdmin } from "@/lib/db"

export const dynamic = "force-dynamic"

// POST /api/quiz/progress - Sauvegarder une réponse de quiz
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
    const {
      sessionId,
      quizQuestionId,
      userAnswer,
      isCorrect,
      timeSpentSeconds,
      studyCollectionId,
    } = body

    if (!quizQuestionId || typeof isCorrect !== "boolean") {
      return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 })
    }

    // Créer ou récupérer la session
    let session = null
    if (sessionId) {
      const { data: existingSession } = await admin
        .from("user_quiz_sessions")
        .select("*")
        .eq("id", sessionId)
        .eq("user_id", user.id)
        .single()
      
      session = existingSession
    }

    if (!session && studyCollectionId) {
      // Créer une nouvelle session
      const { data: newSession, error: sessionError } = await admin
        .from("user_quiz_sessions")
        .insert({
          user_id: user.id,
          study_collection_id: studyCollectionId,
          quiz_question_ids: [quizQuestionId],
          total_questions: 1,
          correct_answers: isCorrect ? 1 : 0,
          incorrect_answers: isCorrect ? 0 : 1,
          session_type: "practice",
        })
        .select()
        .single()

      if (sessionError) {
        console.error("[POST /api/quiz/progress] Erreur création session:", sessionError)
        return NextResponse.json({ error: "Erreur lors de la création de la session" }, { status: 500 })
      }

      session = newSession
    }

    if (!session) {
      return NextResponse.json({ error: "Session non trouvée ou non créée" }, { status: 400 })
    }

    // Sauvegarder la réponse
    const { data: answer, error: answerError } = await admin
      .from("user_quiz_answers")
      .insert({
        session_id: session.id,
        quiz_question_id: quizQuestionId,
        user_id: user.id,
        user_answer: userAnswer || null,
        is_correct: isCorrect,
        time_spent_seconds: timeSpentSeconds || null,
        attempts_count: 1,
      })
      .select()
      .single()

    if (answerError) {
      console.error("[POST /api/quiz/progress] Erreur sauvegarde réponse:", answerError)
      return NextResponse.json({ error: "Erreur lors de la sauvegarde de la réponse" }, { status: 500 })
    }

    // Mettre à jour les statistiques de la question
    const { data: existingStats } = await admin
      .from("quiz_question_stats")
      .select("*")
      .eq("quiz_question_id", quizQuestionId)
      .eq("user_id", user.id)
      .single()

    if (existingStats) {
      // Mettre à jour les stats existantes
      const newTotalAttempts = existingStats.total_attempts + 1
      const newCorrectAttempts = existingStats.correct_attempts + (isCorrect ? 1 : 0)
      const newIncorrectAttempts = existingStats.incorrect_attempts + (isCorrect ? 0 : 1)
      
      // Calculer le nouveau mastery_level
      const masteryLevel = newCorrectAttempts >= newTotalAttempts * 0.8 
        ? "mastered" 
        : newCorrectAttempts >= newTotalAttempts * 0.5 
        ? "reviewing" 
        : "learning"

      // Calculer next_review_at
      const nextReviewAt = calculateNextReview(masteryLevel, new Date(), newIncorrectAttempts)

      await admin
        .from("quiz_question_stats")
        .update({
          total_attempts: newTotalAttempts,
          correct_attempts: newCorrectAttempts,
          incorrect_attempts: newIncorrectAttempts,
          mastery_level: masteryLevel,
          next_review_at: nextReviewAt.toISOString(),
          last_attempted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingStats.id)
    } else {
      // Créer de nouvelles stats
      const masteryLevel = isCorrect ? "reviewing" : "learning"
      const nextReviewAt = calculateNextReview(masteryLevel, new Date(), isCorrect ? 0 : 1)

      await admin
        .from("quiz_question_stats")
        .insert({
          quiz_question_id: quizQuestionId,
          user_id: user.id,
          total_attempts: 1,
          correct_attempts: isCorrect ? 1 : 0,
          incorrect_attempts: isCorrect ? 0 : 1,
          mastery_level: masteryLevel,
          next_review_at: nextReviewAt.toISOString(),
          last_attempted_at: new Date().toISOString(),
        })
    }

    // Mettre à jour les zones de difficulté si la réponse est incorrecte
    if (!isCorrect) {
      // Récupérer les tags de la question
      const { data: question } = await admin
        .from("study_collection_quiz_questions")
        .select("tags")
        .eq("id", quizQuestionId)
        .single()

      if (question?.tags && Array.isArray(question.tags) && question.tags.length > 0) {
        for (const tag of question.tags) {
          const { data: existingWeakArea } = await admin
            .from("user_weak_areas")
            .select("*")
            .eq("user_id", user.id)
            .eq("study_collection_id", studyCollectionId)
            .eq("tag", tag)
            .single()

          if (existingWeakArea) {
            // Augmenter le score de difficulté et le nombre de questions
            await admin
              .from("user_weak_areas")
              .update({
                difficulty_score: Math.min(100, existingWeakArea.difficulty_score + 5),
                questions_count: existingWeakArea.questions_count + 1,
                last_updated_at: new Date().toISOString(),
              })
              .eq("id", existingWeakArea.id)
          } else {
            // Créer une nouvelle zone de difficulté
            await admin
              .from("user_weak_areas")
              .insert({
                user_id: user.id,
                study_collection_id: studyCollectionId,
                tag: tag,
                difficulty_score: 10, // Score initial
                questions_count: 1,
              })
          }
        }
      }
    }

    // Mettre à jour la session
    const { data: sessionAnswers } = await admin
      .from("user_quiz_answers")
      .select("is_correct")
      .eq("session_id", session.id)

    const correctCount = sessionAnswers?.filter(a => a.is_correct).length || 0
    const totalCount = sessionAnswers?.length || 0
    const scorePercentage = totalCount > 0 ? (correctCount / totalCount) * 100 : 0

    await admin
      .from("user_quiz_sessions")
      .update({
        total_questions: totalCount,
        correct_answers: correctCount,
        incorrect_answers: totalCount - correctCount,
        score_percentage: scorePercentage,
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.id)

    return NextResponse.json({
      success: true,
      answerId: answer.id,
      sessionId: session.id,
    })
  } catch (err: any) {
    console.error("[POST /api/quiz/progress] ❌ Exception:", err)
    return NextResponse.json({ error: "Erreur serveur", details: err.message }, { status: 500 })
  }
}

// GET /api/quiz/progress - Récupérer les statistiques de progression
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

    const { searchParams } = new URL(request.url)
    const studyCollectionId = searchParams.get("studyCollectionId")
    const quizQuestionId = searchParams.get("quizQuestionId")

    if (quizQuestionId) {
      // Récupérer les stats d'une question spécifique
      const { data: stats } = await admin
        .from("quiz_question_stats")
        .select("*")
        .eq("quiz_question_id", quizQuestionId)
        .eq("user_id", user.id)
        .single()

      return NextResponse.json({ stats: stats || null })
    }

    if (studyCollectionId) {
      // Récupérer toutes les stats pour une collection
      const { data: questions } = await admin
        .from("study_collection_quiz_questions")
        .select("id")
        .eq("collection_id", studyCollectionId)

      const questionIds = questions?.map(q => q.id) || []

      if (questionIds.length === 0) {
        return NextResponse.json({ stats: [], weakAreas: [] })
      }

      const { data: stats } = await admin
        .from("quiz_question_stats")
        .select("*")
        .eq("user_id", user.id)
        .in("quiz_question_id", questionIds)

      // Récupérer les zones de difficulté
      const { data: weakAreas } = await admin
        .from("user_weak_areas")
        .select("*")
        .eq("user_id", user.id)
        .eq("study_collection_id", studyCollectionId)
        .order("difficulty_score", { ascending: false })
        .limit(10)

      return NextResponse.json({
        stats: stats || [],
        weakAreas: weakAreas || [],
      })
    }

    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 })
  } catch (err: any) {
    console.error("[GET /api/quiz/progress] ❌ Exception:", err)
    return NextResponse.json({ error: "Erreur serveur", details: err.message }, { status: 500 })
  }
}

// Fonction helper pour calculer next_review_at
function calculateNextReview(masteryLevel: string, lastAttempted: Date, incorrectCount: number): Date {
  let daysToAdd = 1

  switch (masteryLevel) {
    case "mastered":
      daysToAdd = 30
      break
    case "reviewing":
      daysToAdd = 7
      break
    case "learning":
      daysToAdd = 1
      break
    default:
      daysToAdd = 1
  }

  if (incorrectCount > 3) {
    daysToAdd = Math.max(1, daysToAdd - 1)
  }

  const nextReview = new Date(lastAttempted)
  nextReview.setDate(nextReview.getDate() + daysToAdd)
  return nextReview
}



