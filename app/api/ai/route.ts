import { NextRequest, NextResponse } from "next/server"

import { getUser } from "@/lib/auth"
import { type GenerationMetadata, type GenerationMode } from "@/lib/ai-generation"
import { AI_GENERATION_JOB_TYPE, type AIGenerationJobPayload } from "@/lib/ai/jobs"
import { createJob } from "@/lib/jobs"

const VALID_MODES: GenerationMode[] = [
  "improve",
  "correct",
  "translate",
  "summarize",
  "fiche",
  "quiz",
  "collection",
  "subject",
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isValidMode(mode: unknown): mode is GenerationMode {
  return typeof mode === "string" && (VALID_MODES as readonly string[]).includes(mode)
}

export async function POST(req: NextRequest) {
  const user = await getUser()

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
  }

  let body: unknown

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide" }, { status: 400 })
  }

  const text = isRecord(body) && typeof body.text === "string" ? body.text.trim() : ""
  const mode = isRecord(body) ? body.mode : undefined
  const metadata = isRecord(body) && isRecord(body.metadata) ? (body.metadata as GenerationMetadata) : null

  if (!text) {
    return NextResponse.json({ error: "Le texte est requis" }, { status: 400 })
  }

  if (!isValidMode(mode)) {
    return NextResponse.json({ error: "Mode de génération invalide" }, { status: 400 })
  }

  const payload: AIGenerationJobPayload = {
    text,
    mode,
    metadata,
  }

  try {
    const job = await createJob({
      userId: user.id,
      type: AI_GENERATION_JOB_TYPE,
      payload: payload as unknown as Record<string, unknown>,
    })

    return NextResponse.json({
      jobId: job.id,
      status: job.status,
      type: job.type,
    })
  } catch (error: any) {
    console.error("[POST /api/ai] create job failed", error)
    return NextResponse.json(
      { error: "Impossible de créer le job de génération" },
      { status: 500 }
    )
  }
}
