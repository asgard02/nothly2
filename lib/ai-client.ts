// Fonctions IA côté client (placeholders pour le moment)

// Fonction placeholder pour le chatbot IA
export async function chatWithAI(message: string): Promise<string> {
  // Simulation d'un délai réseau (à remplacer plus tard par un vrai appel job si besoin)
  await new Promise((resolve) => setTimeout(resolve, 800))

  const responses = [
    "C'est une excellente question ! Voici ce que je peux vous dire...",
    "Je comprends votre demande. Laissez-moi vous aider avec ça.",
    "Intéressant ! Pour répondre à votre question...",
    "Merci pour votre message. Voici ma réponse détaillée...",
    "Je vois ce que vous voulez dire. Permettez-moi de clarifier...",
  ]

  const randomResponse = responses[Math.floor(Math.random() * responses.length)]
  return `${randomResponse} (Réponse simulée pour: "${message.substring(0, 50)}...")`
}

export type JobStatus = "PENDING" | "RUNNING" | "DONE" | "ERROR"

type JobResult = {
  status: JobStatus
  result: unknown
  error: string | null
}

/**
 * Petite fonction utilitaire pour attendre
 */
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function normalizeStatus(status: unknown): JobStatus {
  const value = typeof status === "string" ? status.toUpperCase() : ""

  if (value === "PENDING") return "PENDING"
  if (value === "RUNNING") return "RUNNING"
  if (value === "DONE" || value === "SUCCEEDED") return "DONE"
  if (value === "ERROR" || value === "FAILED" || value === "CANCELLED") return "ERROR"

  return "ERROR"
}

function extractTextResult(result: unknown): string | null {
  if (typeof result === "string") {
    return result
  }

  if (!result || typeof result !== "object") {
    return null
  }

  const record = result as Record<string, unknown>

  if (typeof record.output === "string") {
    return record.output
  }

  if (typeof record.text === "string") {
    return record.text
  }

  if (typeof record.data === "string") {
    return record.data
  }

  if (
    record.kind === "text" &&
    typeof record.data === "string"
  ) {
    return record.data
  }

  return null
}

/**
 * Transformation de texte via IA, en mode "jobId + polling"
 */
export async function transformText(text: string, mode: string): Promise<string> {
  if (!text || !text.trim()) {
    throw new Error("Le texte ne peut pas être vide")
  }

  // Mode markdown géré localement (pas besoin d'IA)
  if (mode === "markdown") {
    return `\`\`\`\n${text}\n\`\`\``
  }

  const validModes = ["improve", "correct", "translate", "summarize"]
  if (!validModes.includes(mode)) {
    throw new Error(`Mode invalide: ${mode}`)
  }

  try {
    // 1️⃣ Création du job côté API
    // ASSUMPTION : POST /api/ai retourne { jobId: string }
    const startRes = await fetch("/api/ai", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text, mode }),
    })

    if (!startRes.ok) {
      const errorData = await startRes.json().catch(() => ({ error: "Erreur inconnue" }))
      throw new Error(errorData.error || `Erreur ${startRes.status} lors du lancement du job`)
    }

    const { jobId } = (await startRes.json()) as { jobId?: string }

    if (!jobId) {
      throw new Error("Réponse API invalide : jobId manquant")
    }

    // 2️⃣ Polling sur /api/jobs/[jobId] jusqu'à DONE ou ERROR
    const maxAttempts = 60 // ~60 secondes si intervalle = 1000ms
    const intervalMs = 1000

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      await delay(intervalMs)

      const statusRes = await fetch(`/api/jobs/${jobId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      })

      if (!statusRes.ok) {
        throw new Error(`Erreur ${statusRes.status} lors de la récupération du job`)
      }

      const rawJob = (await statusRes.json()) as { status?: string; result?: unknown; error?: string | null }
      const job: JobResult = {
        status: normalizeStatus(rawJob.status),
        result: rawJob.result,
        error: rawJob.error ?? null,
      }

      if (job.status === "PENDING" || job.status === "RUNNING") {
        // encore en cours → on continue à poller
        continue
      }

      if (job.status === "ERROR") {
        throw new Error(job.error || "Erreur lors du traitement IA")
      }

      if (job.status === "DONE") {
        const output = extractTextResult(job.result)

        if (!output) {
          throw new Error("Format de résultat IA inattendu")
        }

        return output.trim()
      }
    }

    // Si on sort de la boucle → délai dépassé
    throw new Error("Le traitement IA prend trop de temps, veuillez réessayer plus tard")
  } catch (error: any) {
    console.error("Erreur transformation IA (job) :", error)
    throw new Error(error.message || "Erreur lors de la transformation")
  }
}

