// Fonctions IA côté client (placeholders pour le moment)

// Fonction placeholder pour le chatbot IA
export async function chatWithAI(message: string): Promise<string> {
  // Simulation d'un délai réseau
  await new Promise(resolve => setTimeout(resolve, 800))
  
  // Réponses simulées basées sur le message
  const responses = [
    "C'est une excellente question ! Voici ce que je peux vous dire...",
    "Je comprends votre demande. Laissez-moi vous aider avec ça.",
    "Intéressant ! Pour répondre à votre question...",
    "Merci pour votre message. Voici ma réponse détaillée...",
    "Je vois ce que vous voulez dire. Permettez-moi de clarifier..."
  ]
  
  const randomResponse = responses[Math.floor(Math.random() * responses.length)]
  return `${randomResponse} (Réponse simulée pour: "${message.substring(0, 50)}...")`
}

// Fonction pour la transformation de texte avec l'IA
export async function transformText(text: string, mode: string): Promise<string> {
  if (!text || !text.trim()) {
    throw new Error("Le texte ne peut pas être vide")
  }

  // Mode markdown géré localement (pas besoin d'IA)
  if (mode === "markdown") {
    return `\`\`\`\n${text}\n\`\`\``
  }

  // Vérifie que le mode est valide
  const validModes = ["improve", "correct", "translate", "summarize"]
  if (!validModes.includes(mode)) {
    throw new Error(`Mode invalide: ${mode}`)
  }

  try {
    const response = await fetch("/api/ai", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text, mode }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: "Erreur inconnue" }))
      throw new Error(errorData.error || `Erreur ${response.status}`)
    }

    // Pour les modes simples, la réponse est du texte brut
    const result = await response.text()
    return result.trim()
  } catch (error: any) {
    console.error("Erreur transformation IA:", error)
    throw new Error(error.message || "Erreur lors de la transformation")
  }
}

