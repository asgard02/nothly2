import { NextRequest, NextResponse } from "next/server"
import { getUser } from "@/lib/auth"
import { improveNote } from "@/lib/ai"

// POST: Améliore le contenu d'une note avec l'IA
export async function POST(request: NextRequest) {
  const user = await getUser()
  
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
  }

  const body = await request.json()
  const { content } = body

  if (!content || content.trim().length === 0) {
    return NextResponse.json(
      { error: "Le contenu ne peut pas être vide" },
      { status: 400 }
    )
  }

  try {
    const improved = await improveNote(content)

    if (!improved) {
      return NextResponse.json(
        { error: "Impossible d'améliorer le texte" },
        { status: 500 }
      )
    }

    return NextResponse.json({ improved })
  } catch (error: any) {
    console.error("Erreur amélioration IA:", error)
    return NextResponse.json(
      { error: error.message || "Erreur lors de l'amélioration" },
      { status: 500 }
    )
  }
}

