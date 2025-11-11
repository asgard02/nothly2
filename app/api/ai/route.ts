import { NextRequest, NextResponse } from "next/server"
import { getUser } from "@/lib/auth"
import {
  generateQuiz,
  generateRevisionNote,
  runTextMode,
  type GenerationMetadata,
  type GenerationMode,
  isStructuredMode,
} from "@/lib/ai-generation"

export async function POST(req: NextRequest) {
  const user = await getUser()

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
  }

  const { text, mode, metadata } = (await req.json()) as {
    text?: string
    mode?: GenerationMode
    metadata?: GenerationMetadata
  }

  if (!text || !mode) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 })
  }

  try {
    if (isStructuredMode(mode)) {
      if (mode === "fiche") {
        const result = await generateRevisionNote({ text, metadata })
        return NextResponse.json({ data: result.data, tokensUsed: result.tokensUsed })
      }

      const result = await generateQuiz({ text, metadata })
      return NextResponse.json({ data: result.data, tokensUsed: result.tokensUsed })
    }

    const result = await runTextMode(mode, text)
    return new Response(result.data, {
      headers: { "Content-Type": "text/plain" },
    })
  } catch (error: any) {
    console.error("❌ Erreur IA:", error)
    return NextResponse.json(
      { error: "Erreur IA: " + (error.message || "Erreur inconnue") },
      { status: 500 }
    )
  }
}
