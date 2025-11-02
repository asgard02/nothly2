import { NextRequest, NextResponse } from "next/server"
import { getUser } from "@/lib/auth"
import OpenAI from "openai"

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

export async function POST(req: NextRequest) {
  const user = await getUser()
  
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
  }

  const { text, mode } = await req.json()

  if (!text || !mode) {
    return NextResponse.json(
      { error: "Missing parameters" },
      { status: 400 }
    )
  }

  let systemPrompt = ""

  switch (mode) {
    case "improve":
      systemPrompt = "Tu es un assistant qui reformule le texte en français de façon plus fluide, élégante et naturelle, sans rien ajouter ni expliquer. Ne commence jamais par 'Version améliorée'."
      break

    case "correct":
      systemPrompt = "Tu es un correcteur orthographique et grammatical. Corrige les fautes sans rien commenter ni expliquer. Ne commence jamais par 'Version corrigée'."
      break

    case "translate":
      systemPrompt = "Traduis ce texte en anglais sans aucune annotation ni texte d'introduction. Réponds uniquement avec la traduction."
      break

    case "summarize":
      systemPrompt = "Résume ce texte en deux phrases maximum, sans préambule ni formules inutiles."
      break

    // Modes spéciaux pour les fonctionnalités avancées (fiche, quiz)
    case "fiche":
      systemPrompt = "Tu es un assistant qui aide à créer des fiches de révision structurées et efficaces. Tu dois extraire les concepts clés, les définitions importantes et les points essentiels à retenir."
      break

    case "quiz":
      systemPrompt = "Tu es un assistant qui aide à créer des quiz éducatifs. Tu dois générer des questions de différents types (QCM, vrai/faux, questions ouvertes) basées sur le contenu fourni."
      break

    default:
      return NextResponse.json({ error: "Invalid mode" }, { status: 400 })
  }

  // Préparation du message utilisateur selon le mode
  let userMessage = text
  if (mode === "fiche") {
    userMessage = `Crée une fiche de révision à partir de ces notes. Utilise des sections claires (Concepts clés, Définitions, Points essentiels, Exemples) :\n\n${text}`
  } else if (mode === "quiz") {
    userMessage = `Crée un quiz de 5-7 questions basé sur ces notes. Inclus des QCM avec 4 options, des questions vrai/faux et des questions ouvertes. Indique les bonnes réponses à la fin :\n\n${text}`
  }

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: 0.7,
      max_tokens: mode === "fiche" || mode === "quiz" ? 2000 : 1000,
    })

    const result = completion.choices[0]?.message?.content?.trim() ?? ""
    
    if (!result) {
      return NextResponse.json(
        { error: "Aucune réponse de l'IA" },
        { status: 500 }
      )
    }

    // Pour les modes simples (improve, correct, translate, summarize), retourner directement le texte
    if (["improve", "correct", "translate", "summarize"].includes(mode)) {
      return new Response(result, {
        headers: { "Content-Type": "text/plain" },
      })
    }

    // Pour les modes complexes (fiche, quiz), retourner en JSON
    return NextResponse.json({
      result,
      tokensUsed: completion.usage?.total_tokens || 0,
    })
  } catch (err: any) {
    console.error("❌ Erreur IA:", err)
    return NextResponse.json(
      { error: "Erreur IA: " + (err.message || "Erreur inconnue") },
      { status: 500 }
    )
  }
}

