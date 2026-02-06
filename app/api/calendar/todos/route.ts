import { createServerClient } from "@/lib/supabase-server"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  try {
    const supabase = await createServerClient()
    if (!supabase) {
      return new NextResponse("Database connection failed", { status: 500 })
    }
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const date = searchParams.get("date")

    let query = supabase
      .from("calendar_todos")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })

    if (date) {
      query = query.eq("date", date)
    }

    const { data: todos, error } = await query

    if (error) {
      console.error("Error fetching todos:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(todos || [])
  } catch (error) {
    console.error("Error in GET /api/calendar/todos:", error)
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
    const { title, date } = body

    if (!title || !date) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const { data: todo, error } = await supabase
      .from("calendar_todos")
      .insert({
        user_id: user.id,
        title,
        date,
        completed: false
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating todo:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(todo)
  } catch (error) {
    console.error("Error in POST /api/calendar/todos:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
