import { getSupabaseAdmin } from "@/lib/db"

async function main() {
  const admin = getSupabaseAdmin()
  if (!admin) {
    throw new Error("Supabase admin client not configured")
  }

  const { data, error } = await admin
    .from("async_jobs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5)

  if (error) {
    throw error
  }

  console.log(JSON.stringify(data, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

