import { NextResponse } from "next/server"
import { getUser } from "@/lib/auth"
import { readFileSync, existsSync } from "fs"
import { join } from "path"

// Prompt système enrichi avec toutes les infos sur Notlhy
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
    "Tu es l'assistant de Notlhy.",
    "Réponds en français et aide l'utilisateur à gérer ses notes.",
  ].join("\n")
}

const systemPrompt = loadSystemPrompt()

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
    let contextualPrompt = systemPrompt
    if (context?.noteId) {
      contextualPrompt += `\n\nCONTEXTE ACTUEL : L'utilisateur est sur la note "${context.noteTitle || 'sans titre'}" (ID: ${context.noteId}).`
      if (context.noteContent) {
        contextualPrompt += `\nContenu actuel de la note : ${context.noteContent.substring(0, 500)}...`
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
        max_tokens: 2000, // Augmenté pour permettre plus de contenu
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
      const planMessage = `Voici les différents plans disponibles sur Notlhy :

- **Free** : 0 €. Idéal pour découvrir Notlhy. Avantages : jusqu'à 100 notes, 10 000 tokens IA offerts, synchronisation cloud, export Markdown, accès mobile et desktop, support communautaire.
- **Plus** : 9 €. Achat ponctuel de 1 000 000 tokens IA non expirants. Avantages : tout Free, chat IA personnalisé, résumé / traduction / génération de quiz, historique des conversations IA, pas d'abonnement (tu rachètes quand tu veux).
- **Pro** : 29 €/mois. Pensé pour un usage intensif. Avantages : tout Plus, IA illimitée, support prioritaire, collaboration multi-notes, accès anticipé aux nouvelles fonctionnalités.`

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

