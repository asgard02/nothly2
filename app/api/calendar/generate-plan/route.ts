import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"
import { getSupabaseAdmin } from "@/lib/db"

export const dynamic = "force-dynamic"

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
    const { subjectId, startDate, endDate, intensity } = body

    if (!subjectId) {
      return NextResponse.json({ error: "subjectId est requis" }, { status: 400 })
    }

    // Récupérer le sujet
    const { data: subject, error: subjectError } = await admin
      .from("collections")
      .select("id, title")
      .eq("id", subjectId)
      .eq("user_id", user.id)
      .single()

    if (subjectError || !subject) {
      return NextResponse.json({ error: "Matière non trouvée" }, { status: 404 })
    }

    // Récupérer les documents du sujet
    const { data: documents } = await admin
      .from("documents")
      .select("id, title")
      .eq("collection_id", subjectId)
      .eq("user_id", user.id)

    if (!documents || documents.length === 0) {
      return NextResponse.json({ error: "Aucun document dans cette matière" }, { status: 400 })
    }

    // Construire le prompt pour l'IA
    const docTitles = documents.map(d => d.title).join(", ")
    const start = new Date(startDate).toLocaleDateString("fr-FR")
    const end = new Date(endDate).toLocaleDateString("fr-FR")

    const systemPrompt = `Tu es un assistant pédagogique expert en planification d'études.
Ton but est de créer un planning de révision structuré et réaliste pour un étudiant.

Paramètres:
- Sujet: Matière "${subject.title}" contenant les documents: ${docTitles}
- Période: Du ${start} au ${end}
- Intensité: ${intensity || "Moyenne"}

Génère une liste d'événements de révision au format JSON.
Chaque événement doit avoir:
- title: Titre court et précis (ex: "Révision Chapitre 1", "Quiz Droit Civil")
- date: Date au format ISO (YYYY-MM-DD)
- time: Heure suggérée (HH:MM)
- duration: Durée en minutes (30, 60, 90, 120)
- type: "study" (révision), "exam" (examen blanc/quiz), ou "deadline" (objectif à atteindre)
- description: Courte description de ce qu'il faut faire

Règles:
- Répartis les sessions de manière équilibrée sur la période.
- Alterne entre révision pure et tests (quiz).
- Adapte la charge de travail à l'intensité demandée.
- Ne surcharge pas les journées (max 2-3 sessions par jour).
- Le JSON doit être un tableau d'objets.
`

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Génère le planning s'il te plaît." }
        ],
        temperature: 0.7,
      }),
    })

    if (!openaiResponse.ok) {
        const errorData = await openaiResponse.json().catch(() => ({}))
        console.error("Erreur OpenAI:", errorData)
        return NextResponse.json({ error: "Erreur lors de la génération du planning" }, { status: 500 })
    }

    const aiData = await openaiResponse.json()
    const content = aiData.choices?.[0]?.message?.content

    // Extraire le JSON
    const jsonMatch = content.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
        return NextResponse.json({ error: "Format de réponse invalide de l'IA" }, { status: 500 })
    }

    const events = JSON.parse(jsonMatch[0])

    return NextResponse.json({ events })

  } catch (error) {
    console.error("Erreur serveur:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
