// Fonction pour envoyer un message au chat IA

export async function sendChatMessage(messages: { role: string; content: string }[]) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Erreur inconnue" }))
    throw new Error(errorData.error || `Erreur serveur: ${res.status}`)
  }

  const data = await res.json()
  return data.reply
}

