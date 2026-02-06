import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"
import { getSupabaseAdmin } from "@/lib/db"

export const dynamic = "force-dynamic"

/**
 * GET /api/onboarding
 * Returns whether the authenticated user has completed the onboarding tutorial.
 */
export async function GET() {
  try {
    const supabase = await createServerClient()
    if (!supabase) {
      return NextResponse.json(
        { error: "Configuration Supabase manquante" },
        { status: 500 }
      )
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const admin = getSupabaseAdmin()
    if (!admin) {
      return NextResponse.json(
        { error: "Configuration Supabase manquante" },
        { status: 500 }
      )
    }

    const { data, error } = await admin
      .from("users")
      .select("has_completed_onboarding")
      .eq("id", user.id)
      .single()

    if (error) {
      // If column doesn't exist yet or user not found, treat as not completed
      if (error.code === "PGRST116" || error.message?.includes("has_completed_onboarding")) {
        return NextResponse.json({ has_completed_onboarding: false })
      }
      console.error("[Onboarding GET] Error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      has_completed_onboarding: data?.has_completed_onboarding ?? false,
    })
  } catch (err: any) {
    console.error("[Onboarding GET] Exception:", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

/**
 * POST /api/onboarding
 * Marks the onboarding tutorial as completed for the authenticated user.
 */
export async function POST() {
  try {
    const supabase = await createServerClient()
    if (!supabase) {
      return NextResponse.json(
        { error: "Configuration Supabase manquante" },
        { status: 500 }
      )
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const admin = getSupabaseAdmin()
    if (!admin) {
      return NextResponse.json(
        { error: "Configuration Supabase manquante" },
        { status: 500 }
      )
    }

    const { error } = await admin
      .from("users")
      .update({ has_completed_onboarding: true })
      .eq("id", user.id)

    if (error) {
      console.error("[Onboarding POST] Error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ has_completed_onboarding: true })
  } catch (err: any) {
    console.error("[Onboarding POST] Exception:", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
