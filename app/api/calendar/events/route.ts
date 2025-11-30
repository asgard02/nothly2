import { createServerClient } from "@/lib/supabase-server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createServerClient()
    if (!supabase) {
      return new NextResponse("Database connection failed", { status: 500 })
    }
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { data: events, error } = await supabase
      .from("calendar_events")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: true })

    if (error) {
      console.error("Error fetching events:", error)
      return new NextResponse(error.message, { status: 500 })
    }

    return NextResponse.json(events)
  } catch (error) {
    console.error("Error in GET /api/calendar/events:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createServerClient()
    if (!supabase) {
      return new NextResponse("Database connection failed", { status: 500 })
    }
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const body = await req.json()
    const { title, date, duration, type, color, description } = body

    if (!title || !date || !type) {
      return new NextResponse("Missing required fields", { status: 400 })
    }

    const { data: event, error } = await supabase
      .from("calendar_events")
      .insert({
        user_id: user.id,
        title,
        date,
        duration,
        type,
        color,
        description
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating event:", error)
      return new NextResponse(error.message, { status: 500 })
    }

    return NextResponse.json(event)
  } catch (error) {
    console.error("Error in POST /api/calendar/events:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
