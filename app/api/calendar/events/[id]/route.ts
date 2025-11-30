import { createServerClient } from "@/lib/supabase-server"
import { NextResponse } from "next/server"

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClient()
    if (!supabase) {
      return new NextResponse("Database connection failed", { status: 500 })
    }
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const { error } = await supabase
      .from("calendar_events")
      .delete()
      .eq("id", params.id)
      .eq("user_id", user.id)

    if (error) {
      console.error("Error deleting event:", error)
      return new NextResponse(error.message, { status: 500 })
    }

    return new NextResponse(null, { status: 200 })
  } catch (error) {
    console.error("Error in DELETE /api/calendar/events/[id]:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
