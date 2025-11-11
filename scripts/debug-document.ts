import { getSupabaseAdmin } from "@/lib/db"

const documentId = process.argv[2]

if (!documentId) {
  console.error("Usage: npx tsx --env-file=.env.local scripts/debug-document.ts <documentId>")
  process.exit(1)
}

async function main() {
  const admin = getSupabaseAdmin()
  if (!admin) {
    throw new Error("Supabase admin client not configured")
  }

  const { data, error } = await admin
    .from("documents")
    .select(
      `
      id,
      title,
      status,
      current_version_id,
      document_versions:document_versions!document_versions_document_id_fkey (
        id,
        processed_at,
        document_sections (
          id,
          order_index,
          heading,
          revision_notes (id),
          quiz_sets (
            id,
            quiz_questions (id)
          )
        )
      )
    `
    )
    .eq("id", documentId)
    .maybeSingle()

  if (error) {
    throw error
  }

  console.log(JSON.stringify(data, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

