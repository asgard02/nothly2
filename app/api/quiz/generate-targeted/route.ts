import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"
import { getSupabaseAdmin } from "@/lib/db"

export const dynamic = "force-dynamic"

// POST /api/quiz/generate-targeted - Générer des questions/flashcards ciblées sur les faiblesses
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
    const { studySubjectId, type = "quiz" } = body // type: "quiz" ou "flashcards"
    
    // Support backward compatibility
    const targetId = studySubjectId || body.studyCollectionId

    if (!targetId) {
      return NextResponse.json({ error: "studySubjectId requis" }, { status: 400 })
    }

    // Récupérer les zones de difficulté pour cette collection
    const { data: weakAreas, error: weakAreasError } = await admin
      .from("user_weak_areas")
      .select("*")
      .eq("user_id", user.id)
      .eq("study_collection_id", targetId)
      .order("difficulty_score", { ascending: false })
      .limit(5) // Top 5 zones de difficulté

    if (weakAreasError) {
      console.error("[POST /api/quiz/generate-targeted] Erreur récupération weak areas:", weakAreasError)
      return NextResponse.json({ error: "Erreur lors de la récupération des zones de difficulté" }, { status: 500 })
    }

    if (!weakAreas || weakAreas.length === 0) {
      return NextResponse.json({ 
        error: "Aucune zone de difficulté identifiée. Répondez à quelques questions pour générer des questions ciblées.",
        weakAreas: []
      }, { status: 400 })
    }

    // Récupérer les documents sources de la collection
    const { data: sources } = await admin
      .from("study_collection_sources")
      .select("document_id, title")
      .eq("collection_id", targetId)

    if (!sources || sources.length === 0) {
      return NextResponse.json({ error: "Aucune source trouvée pour cette collection" }, { status: 400 })
    }

    // Récupérer le contenu des documents pour générer les questions
    const documentIds = sources.map(s => s.document_id).filter(Boolean)
    const { data: documents } = await admin
      .from("documents")
      .select("id, title, current_version_id")
      .in("id", documentIds)

    // Récupérer les versions de documents
    const versionIds = documents?.map(d => d.current_version_id).filter(Boolean) || []
    if (versionIds.length === 0) {
      return NextResponse.json({ error: "Aucun contenu disponible pour générer des questions" }, { status: 400 })
    }

    const { data: versions } = await admin
      .from("document_versions")
      .select("id, raw_text, document_id")
      .in("id", versionIds)

    if (!versions || versions.length === 0) {
      return NextResponse.json({ error: "Aucun contenu disponible" }, { status: 400 })
    }

    // Construire le contexte pour l'IA
    const tagsToFocus = weakAreas.map(wa => wa.tag).join(", ")
    const topTags = weakAreas.slice(0, 3).map(wa => wa.tag) // Top 3 tags les plus difficiles
    
    // Récupérer le contenu des documents pour générer les questions
    const contentSnippets = versions
      .map(v => v.raw_text?.substring(0, 5000)) // Limiter la taille par version
      .join("\n\n---\n\n")
      .substring(0, 15000) // Limiter le total

    // Générer des questions ciblées avec l'IA
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        success: false,
        error: "Configuration IA manquante",
        weakAreas: weakAreas.map(wa => ({
          tag: wa.tag,
          difficultyScore: wa.difficulty_score,
          questionsCount: wa.questions_count,
        })),
      }, { status: 500 })
    }

    try {
      const prompt = type === "quiz" 
        ? `Tu es un expert pédagogique. Génère ${Math.min(5, weakAreas.length * 2)} questions de quiz ciblées sur les concepts suivants que l'utilisateur a du mal à maîtriser : ${topTags.join(", ")}.

Contexte du document :
${contentSnippets}

Génère un tableau JSON avec des questions de quiz variées (QCM, vrai/faux, complétion) qui se concentrent spécifiquement sur ces concepts difficiles. Chaque question doit :
- Être claire et précise
- Tester la compréhension profonde du concept
- Avoir une explication détaillée
- Être taguée avec le concept concerné

Format JSON attendu :
[
  {
    "question_type": "multiple_choice" | "true_false" | "completion",
    "prompt": "Question claire",
    "options": ["option1", "option2", ...] ou null pour true_false/completion,
    "answer": "Réponse correcte",
    "explanation": "Explication détaillée",
    "tags": ["concept_concerné"]
  }
]

Réponds UNIQUEMENT avec le JSON, sans texte avant ou après.`
        : `Tu es un expert pédagogique. Génère ${Math.min(8, weakAreas.length * 3)} flashcards ciblées sur les concepts suivants que l'utilisateur a du mal à maîtriser : ${topTags.join(", ")}.

Contexte du document :
${contentSnippets}

Génère un tableau JSON avec des flashcards qui se concentrent spécifiquement sur ces concepts difficiles. Chaque flashcard doit :
- Avoir une question claire
- Avoir une réponse complète et détaillée
- Être taguée avec le concept concerné

Format JSON attendu :
[
  {
    "question": "Question claire",
    "answer": "Réponse détaillée",
    "tags": ["concept_concerné"]
  }
]

Réponds UNIQUEMENT avec le JSON, sans texte avant ou après.`

      const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: "Tu es un expert pédagogique qui crée des questions de quiz et flashcards ciblées pour aider les étudiants à améliorer leurs points faibles."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          max_tokens: 4000,
          temperature: 0.5,
        }),
      })

      if (!openaiResponse.ok) {
        throw new Error("Erreur lors de l'appel à l'IA")
      }

      const aiData = await openaiResponse.json()
      const aiResponse = aiData.choices?.[0]?.message?.content || ""

      // Extraire le JSON de la réponse
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/)
      if (!jsonMatch) {
        throw new Error("Aucun JSON trouvé dans la réponse")
      }

      const generatedItems = JSON.parse(jsonMatch[0])

      // Créer une nouvelle study_collection pour les questions ciblées
      const { data: studyCollection, error: createError } = await admin
        .from("study_collections")
        .insert({
          user_id: user.id,
          collection_id: targetId,
          title: type === "quiz" 
            ? `Quiz ciblé: ${topTags.join(", ")}`
            : `Flashcards ciblées: ${topTags.join(", ")}`,
          tags: topTags,
          status: "ready",
          total_sources: sources.length,
          total_flashcards: type === "flashcards" ? generatedItems.length : 0,
          total_quiz: type === "quiz" ? generatedItems.length : 0,
        })
        .select("id")
        .single()

      if (createError || !studyCollection) {
        throw new Error("Erreur lors de la création de la collection")
      }

      // Insérer les items générés
      if (type === "quiz") {
        const quizInserts = generatedItems.map((q: any, index: number) => ({
          collection_id: studyCollection.id,
          question_type: q.question_type || "multiple_choice",
          prompt: q.prompt,
          options: q.options,
          answer: q.answer,
          explanation: q.explanation || null,
          order_index: index,
          tags: q.tags || topTags,
          metadata: {},
        }))

        await admin
          .from("study_collection_quiz_questions")
          .insert(quizInserts)
      } else {
        const flashcardInserts = generatedItems.map((fc: any, index: number) => ({
          collection_id: studyCollection.id,
          question: fc.question,
          answer: fc.answer,
          order_index: index,
          tags: fc.tags || topTags,
          metadata: {},
        }))

        await admin
          .from("study_collection_flashcards")
          .insert(flashcardInserts)
      }

      return NextResponse.json({
        success: true,
        studyCollectionId: studyCollection.id,
        itemsGenerated: generatedItems.length,
        weakAreas: weakAreas.map(wa => ({
          tag: wa.tag,
          difficultyScore: wa.difficulty_score,
          questionsCount: wa.questions_count,
        })),
        message: `${generatedItems.length} ${type === "quiz" ? "questions" : "flashcards"} générées avec succès sur les concepts difficiles !`,
      })
    } catch (error: any) {
      console.error("[POST /api/quiz/generate-targeted] Erreur génération:", error)
      return NextResponse.json({
        success: false,
        error: "Erreur lors de la génération",
        details: error.message,
        weakAreas: weakAreas.map(wa => ({
          tag: wa.tag,
          difficultyScore: wa.difficulty_score,
          questionsCount: wa.questions_count,
        })),
      }, { status: 500 })
    }
  } catch (err: any) {
    console.error("[POST /api/quiz/generate-targeted] ❌ Exception:", err)
    return NextResponse.json({ error: "Erreur serveur", details: err.message }, { status: 500 })
  }
}

// GET /api/quiz/generate-targeted - Récupérer les zones de difficulté
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
    const studySubjectId = searchParams.get("studySubjectId") || searchParams.get("studyCollectionId")

    if (!studySubjectId) {
      return NextResponse.json({ error: "studySubjectId requis" }, { status: 400 })
    }

    // Récupérer les zones de difficulté
    const { data: weakAreas, error: weakAreasError } = await admin
      .from("user_weak_areas")
      .select("*")
      .eq("user_id", user.id)
      .eq("study_collection_id", studySubjectId)
      .order("difficulty_score", { ascending: false })

    if (weakAreasError) {
      console.error("[GET /api/quiz/generate-targeted] Erreur:", weakAreasError)
      return NextResponse.json({ error: "Erreur lors de la récupération" }, { status: 500 })
    }

    return NextResponse.json({
      weakAreas: weakAreas || [],
    })
  } catch (err: any) {
    console.error("[GET /api/quiz/generate-targeted] ❌ Exception:", err)
    return NextResponse.json({ error: "Erreur serveur", details: err.message }, { status: 500 })
  }
}

