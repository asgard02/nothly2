
import { getSupabaseAdmin } from "@/lib/db"

async function main() {
  const admin = getSupabaseAdmin()
  if (!admin) {
    console.error("Supabase admin client is not configured")
    process.exit(1)
  }

  // 1. Count all collections
  const { data: allCollections, error: allError } = await admin
    .from("collections")
    .select("id, title, user_id, is_favorite")
  
  if (allError) {
    console.error("Error fetching all collections:", allError)
  } else {
    console.log(`Total collections in DB: ${allCollections?.length}`)
    allCollections?.forEach(c => {
       console.log(` - ${c.title} (User: ${c.user_id}) [Fav: ${c.is_favorite}]`)
    })
  }
}

main().catch(err => console.error(err))
