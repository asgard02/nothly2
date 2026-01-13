// Fichier serveur uniquement - utilisé dans les API routes
import OpenAI from "openai"
import { openaiWithRetry } from "@/lib/utils-retry"

// Initialisation OpenAI (côté serveur uniquement)
let openai: OpenAI | null = null

// Initialise OpenAI uniquement si on est côté serveur
if (typeof window === "undefined" && process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  })
}

export async function improveNote(content: string) {
  if (!openai) {
    throw new Error("OpenAI not initialized - this function should only be called server-side")
  }

  try {
    const prompt = `
      Améliore ce texte pour le rendre plus clair, fluide et cohérent,
      sans changer le sens ni ajouter de contenu inventé.
      Garde le même niveau de détail et la même structure si elle est bonne.
      
      Texte :
      ${content}
    `

    // Utiliser retry avec backoff exponentiel pour les appels OpenAI
    const completion = await openaiWithRetry(
      () =>
        openai.chat.completions.create({
          model: "gpt-4o-mini", // rapide et peu coûteux
          messages: [{ role: "user", content: prompt }],
          max_tokens: 2000, // Augmenté pour permettre des réponses plus longues
          temperature: 0.7,
        }),
      {
        maxAttempts: 3,
        initialDelayMs: 2000,
      }
    )

    return completion.choices[0].message.content || null
  } catch (error) {
    console.error("Erreur IA :", error)
    return null
  }
}

