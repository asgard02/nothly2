// Fonction pour envoyer un message au chat IA

interface ChatContext {
  currentPage?: string
  noteId?: string
  noteTitle?: string
  noteContent?: string
}

export async function sendChatMessage(
  messages: { role: string; content: string }[],
  context?: ChatContext  // ✅ Accepter le contexte
) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, context }),  // ✅ Envoyer le contexte
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Erreur inconnue" }))
    throw new Error(errorData.error || `Erreur serveur: ${res.status}`)
  }

  const data = await res.json()
  
  // Retourner l'objet complet (message + action)
  return {
    reply: data.reply,
    action: data.action || { type: "none" }
  }
}

