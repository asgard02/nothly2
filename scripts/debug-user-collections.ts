
import { createClient } from "@supabase/supabase-js"
import { getSupabaseAdmin } from "@/lib/db"

async function main() {
  const admin = getSupabaseAdmin()
  const userId = "52b54b05-f4bc-43ef-a797-1cad08c12d45" // User ID from logs

  console.log("Checking collections for user:", userId)

  const { data: collections, error } = await admin
    .from("collections")
    .select("id, title, color, created_at, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })

  if (error) {
    console.error("Error:", error)
  } else {
    console.log(`Found ${collections?.length} collections:`)
    console.log(collections)
  }
}

main().catch(console.error)
