import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase-server"
import { getSupabaseAdmin } from "@/lib/db"

export const dynamic = "force-dynamic"

/**
 * GET /api/streak
 * Returns the current streak for the authenticated user.
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
      .from("user_streaks")
      .select("current_streak, longest_streak, last_active_date")
      .eq("user_id", user.id)
      .single()

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows found, which is fine for new users
      console.error("[Streak GET] ❌ Error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // If no row exists yet, return 0
    if (!data) {
      return NextResponse.json({
        current_streak: 0,
        longest_streak: 0,
        last_active_date: null,
      })
    }

    // Check if the streak is still valid (last_active_date must be today or yesterday)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const lastActive = data.last_active_date
      ? new Date(data.last_active_date + "T00:00:00")
      : null

    let currentStreak = data.current_streak

    // If last active was before yesterday, streak is broken
    if (lastActive && lastActive < yesterday) {
      currentStreak = 0
    }

    return NextResponse.json({
      current_streak: currentStreak,
      longest_streak: data.longest_streak,
      last_active_date: data.last_active_date,
    })
  } catch (err: any) {
    console.error("[Streak GET] ❌ Exception:", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

/**
 * POST /api/streak
 * Records user activity for today and updates the streak.
 * Should be called when the user opens the dashboard or performs an action.
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

    // Get today's date in YYYY-MM-DD format (UTC)
    const now = new Date()
    const todayStr = now.toISOString().split("T")[0]

    // Fetch current streak record
    const { data: existing, error: fetchError } = await admin
      .from("user_streaks")
      .select("*")
      .eq("user_id", user.id)
      .single()

    if (fetchError && fetchError.code !== "PGRST116") {
      console.error("[Streak POST] ❌ Fetch error:", fetchError)
      return NextResponse.json(
        { error: fetchError.message },
        { status: 500 }
      )
    }

    // No existing record → create one with streak = 1
    if (!existing) {
      const { data: newStreak, error: insertError } = await admin
        .from("user_streaks")
        .insert({
          user_id: user.id,
          current_streak: 1,
          longest_streak: 1,
          last_active_date: todayStr,
        })
        .select()
        .single()

      if (insertError) {
        console.error("[Streak POST] ❌ Insert error:", insertError)
        return NextResponse.json(
          { error: insertError.message },
          { status: 500 }
        )
      }

      return NextResponse.json({
        current_streak: 1,
        longest_streak: 1,
        last_active_date: todayStr,
      })
    }

    // Record exists → calculate new streak
    const lastActiveDate = existing.last_active_date
    const today = new Date(todayStr + "T00:00:00")
    const lastActive = lastActiveDate
      ? new Date(lastActiveDate + "T00:00:00")
      : null

    // Already logged today → no update needed
    if (lastActive && lastActive.getTime() === today.getTime()) {
      return NextResponse.json({
        current_streak: existing.current_streak,
        longest_streak: existing.longest_streak,
        last_active_date: existing.last_active_date,
      })
    }

    let newStreak: number

    if (lastActive) {
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)

      if (lastActive.getTime() === yesterday.getTime()) {
        // Consecutive day → increment streak
        newStreak = existing.current_streak + 1
      } else {
        // Gap in activity → reset streak to 1
        newStreak = 1
      }
    } else {
      // No previous activity → start at 1
      newStreak = 1
    }

    const newLongest = Math.max(existing.longest_streak, newStreak)

    const { error: updateError } = await admin
      .from("user_streaks")
      .update({
        current_streak: newStreak,
        longest_streak: newLongest,
        last_active_date: todayStr,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)

    if (updateError) {
      console.error("[Streak POST] ❌ Update error:", updateError)
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      current_streak: newStreak,
      longest_streak: newLongest,
      last_active_date: todayStr,
    })
  } catch (err: any) {
    console.error("[Streak POST] ❌ Exception:", err)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
