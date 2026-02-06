import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"

// Endpoint de monitoring pour surveiller les requêtes en temps réel
// Protégé: requiert une authentification et le mode développement
export async function GET(request: NextRequest) {
  // Désactivé en production pour des raisons de sécurité
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Endpoint non disponible en production" },
      { status: 404 }
    )
  }

  // Vérification de l'authentification même en dev
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (supabaseUrl && supabaseAnonKey) {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll() {},
      },
    })

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: "Authentification requise" },
        { status: 401 }
      )
    }
  }

  const stats = {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    env: {
      nodeEnv: process.env.NODE_ENV,
    },
  }

  return NextResponse.json(stats, {
    headers: {
      "Cache-Control": "no-store",
    },
  })
}


