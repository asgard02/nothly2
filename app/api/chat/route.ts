import { NextResponse } from "next/server"
import { getUser } from "@/lib/auth"
import { readFileSync, existsSync } from "fs"
import { join } from "path"

// Prompt système enrichi avec toutes les infos sur Nothly
function loadSystemPrompt(): string {
  const cwd = process.cwd()
  const candidates = [
    join(cwd, "prompt_notlhy.md"),
    join(cwd, "docs", "prompt_notlhy.md"),
    join(cwd, "public", "prompt_notlhy.md"),
  ]

  for (const path of candidates) {
    if (existsSync(path)) {
      return readFileSync(path, "utf-8")
    }
  }

  console.warn("[Chat API] prompt_notlhy.md introuvable, utilisation du prompt par défaut")
  return [
    "Tu es l'assistant de Nothly.",
    "Réponds en français et aide l'utilisateur à gérer ses notes.",
  ].join("\n")
}

const systemPrompt = loadSystemPrompt()

/**
 * Résume intelligemment le contenu d'une note longue pour l'inclure dans le contexte
 * Stratégie : garde le début (intro/titre), résume le milieu, garde la fin (contenu récent)
 */
async function summarizeLongContent(content: string, maxLength: number): Promise<string> {
  if (content.length <= maxLength) {
    return content
  }

  // Stratégie : garder le début, résumer le milieu, garder la fin
  const KEEP_START = 2000 // Garder les premiers 2000 caractères (souvent titre/intro)
  const KEEP_END = 3000   // Garder les derniers 3000 caractères (contenu récent/pertinent)
  const SUMMARY_TARGET = maxLength - KEEP_START - KEEP_END - 500 // -500 pour les séparateurs

  if (content.length <= KEEP_START + KEEP_END) {
    // Si même avec cette stratégie c'est trop court, on tronque simplement
    return content.substring(0, maxLength) + "..."
  }

  const start = content.substring(0, KEEP_START)
  const middle = content.substring(KEEP_START, content.length - KEEP_END)
  const end = content.substring(content.length - KEEP_END)

  // Résumer le milieu avec l'IA si on a une clé API
  let summarizedMiddle = middle
  if (process.env.OPENAI_API_KEY && middle.length > SUMMARY_TARGET) {
    try {
      const summaryResponse = await fetch("https://api.openai.com/v1/chat/completions", {
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
              content: "Tu résumes ce texte en conservant les informations importantes et les concepts clés. Réponds uniquement avec le résumé, sans commentaire."
            },
            {
              role: "user",
              content: `Résume ce texte en ${Math.floor(SUMMARY_TARGET / 4)} mots maximum, en conservant les informations importantes :\n\n${middle}`
            }
          ],
          max_tokens: Math.floor(SUMMARY_TARGET / 2), // Estimation : ~2 chars par token
          temperature: 0.3, // Plus bas pour un résumé fidèle
        }),
      })

      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json()
        const summary = summaryData.choices?.[0]?.message?.content?.trim()
        if (summary) {
          summarizedMiddle = summary
        }
      }
    } catch (error) {
      console.warn("[Chat API] Erreur lors du résumé du contexte, utilisation du texte tronqué:", error)
      // En cas d'erreur, on tronque simplement le milieu
      summarizedMiddle = middle.substring(0, SUMMARY_TARGET) + "..."
    }
  } else {
    // Pas de résumé IA disponible, on tronque simplement
    summarizedMiddle = middle.substring(0, SUMMARY_TARGET) + "..."
  }

  return `${start}\n\n[... section résumée ...]\n\n${summarizedMiddle}\n\n[... suite ...]\n\n${end}`
}

export async function POST(req: Request) {
  // Vérification de l'authentification
  const user = await getUser()
  
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
  }

  try {
    const { messages, context } = await req.json()

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Aucun message fourni." }, { status: 400 })
    }

    // Ajouter le contexte au prompt système
    // Limite augmentée avec résumé intelligent pour les notes longues
    const MAX_CONTEXT_LENGTH = 10000 // Limite cible après résumé intelligent
    
    let contextualPrompt = systemPrompt
    if (context?.noteId) {
      contextualPrompt += `\n\nCONTEXTE ACTUEL : L'utilisateur est sur la note "${context.noteTitle || 'sans titre'}" (ID: ${context.noteId}).`
      if (context.noteContent) {
        // Utiliser le résumé intelligent pour les notes longues
        const contentPreview = await summarizeLongContent(context.noteContent, MAX_CONTEXT_LENGTH)
        contextualPrompt += `\nContenu actuel de la note : ${contentPreview}`
      }
      contextualPrompt += `\n\n⚠️ IMPORTANT : Si l'utilisateur demande à créer du contenu ou une note, tu dois générer du CONTENU RÉEL et le mettre dans action.content.`
    } else {
      contextualPrompt += `\n\nCONTEXTE ACTUEL : L'utilisateur n'est pas sur une note (page: ${context?.currentPage || 'inconnue'}).`
      contextualPrompt += `\n\n⚠️ IMPORTANT : Si l'utilisateur demande à créer une note sur un sujet, tu dois générer un TITRE et un CONTENU RÉEL et les mettre dans action.title et action.content.`
    }

    // Ajouter le prompt système avant les messages de l'utilisateur
    const fullMessages = [
      { role: "system", content: contextualPrompt },
      ...messages,
    ]

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: fullMessages,
        max_tokens: 4000, // Augmenté pour permettre des réponses plus longues
        temperature: 0.7,
        response_format: { type: "json_object" },
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error("Erreur OpenAI:", data)
      return NextResponse.json(
        { error: data.error?.message || "Erreur OpenAI" }, 
        { status: response.status }
      )
    }

    const aiResponse = data.choices?.[0]?.message?.content || "{}"
    
    // Parser la réponse JSON
    let parsedResponse
    try {
      parsedResponse = JSON.parse(aiResponse)
    } catch (e) {
      console.error("Erreur parsing JSON:", e, "Réponse brute:", aiResponse)
      // Si pas JSON valide, traiter comme texte simple
      parsedResponse = {
        message: aiResponse,
        action: { type: "none" }
      }
    }

    const lastUserMessage = Array.isArray(messages)
      ? [...messages].reverse().find((m: any) => m?.role === "user")?.content || ""
      : ""

    const userAskedForPlans = typeof lastUserMessage === "string"
      ? /(plan|tarif|offre|pricing)/i.test(lastUserMessage)
      : false

    if (userAskedForPlans) {
      const planMessage = `Actuellement, Nothly est en **Bêta Publique**.
Cela signifie que l'application est **100% gratuite** pendant la période de lancement (2 mois).

Vous avez accès à toutes les fonctionnalités Premium :
- Notes illimitées
- IA illimitée (Génération de texte, Quiz, Flashcards)
- Export PDF & Markdown
- Support prioritaire

Tout cela sans aucune limite et sans carte bancaire requise. Profitez-en pour tout tester !`

      parsedResponse = {
        message: planMessage,
        action: { type: "none" }
      }
    }

    // Log pour debug
    console.log("[Chat API] Action détectée:", parsedResponse.action?.type)
    if (parsedResponse.action?.content) {
      console.log("[Chat API] Contenu généré:", parsedResponse.action.content.substring(0, 100) + "...")
    }

    return NextResponse.json({
      reply: parsedResponse.message || parsedResponse,
      action: parsedResponse.action || { type: "none" }
    })
  } catch (err) {
    console.error("Erreur interne :", err)
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 })
  }
}

