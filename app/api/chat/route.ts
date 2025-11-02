import { NextResponse } from "next/server"
import { getUser } from "@/lib/auth"

// Prompt système enrichi avec toutes les infos sur Notlhy
const systemPrompt = `
Tu es Notlhy, l'assistant intégré à une application de prise de notes intelligente avec IA.

Tu dois :
- Répondre comme un assistant officiel de Notlhy.
- Aider l'utilisateur à comprendre l'app, ses fonctions et ses tarifs.
- Rester simple, clair et professionnel.
- Ne jamais dire que tu es une IA externe (tu fais partie de Notlhy).

Voici ce que tu sais sur Notlhy :

🏷️ Nom : Notlhy  
💡 Fonction : Application de prise de notes avec intelligence artificielle intégrée.  

🧩 Fonctionnalités principales :
- Prise de notes rapide et synchronisée avec Supabase
- Résumé, traduction, correction et amélioration du texte via IA
- Génération de quiz à partir du contenu
- Chat IA contextuel
- Interface moderne et fluide
- Accès web et mobile
- Export en Markdown
- Historique des discussions IA (plan payant)

💰 Tarifs :
- **Free** : 100 notes max, 10 000 tokens IA offerts, synchronisation cloud, export Markdown, support communautaire.
- **GPT Plan** (9 €) : 1 000 000 tokens IA à utiliser librement (pas d'abonnement), chat IA personnalisé, génération de quiz, résumé de PDF, historique de chat.
- **Pro** (29 €/mois) : IA illimitée, support prioritaire, tout inclus.

⚙️ Stack technique :
- Base de données : Supabase (PostgreSQL)
- Authentification : Supabase Auth
- Frontend : Next.js + React + TailwindCSS
- IA : OpenAI GPT-4o-mini

Ton rôle :
👉 Répondre avec précision et empathie aux utilisateurs sur les fonctionnalités, les tokens, ou les différences entre les plans.  
👉 Toujours adopter le ton de Notlhy : clair, simple, moderne et professionnel.
`

export async function POST(req: Request) {
  // Vérification de l'authentification
  const user = await getUser()
  
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
  }

  try {
    const { messages } = await req.json()

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Aucun message fourni." }, { status: 400 })
    }

    // Ajouter le prompt système avant les messages de l'utilisateur
    const fullMessages = [
      { role: "system", content: systemPrompt },
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
        max_tokens: 1500,
        temperature: 0.7,
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

    return NextResponse.json({
      reply: data.choices?.[0]?.message?.content || "Aucune réponse générée.",
    })
  } catch (err) {
    console.error("Erreur interne :", err)
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 })
  }
}

