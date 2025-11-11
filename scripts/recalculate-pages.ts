import pdfParse from "pdf-parse"

import { getSupabaseAdmin } from "@/lib/db"
import { getStorageBucket } from "@/lib/storage"

async function main() {
  const admin = getSupabaseAdmin()
  if (!admin) {
    throw new Error("Supabase admin client not configured")
  }

  console.log("📄 Récupération des versions de documents…")
  const { data: versions, error } = await admin
    .from("document_versions")
    .select("id, storage_path")

  if (error) {
    throw error
  }

  if (!versions?.length) {
    console.log("Aucune version à traiter.")
    return
  }

  let updated = 0
  let skipped = 0
  let failed = 0

  for (const version of versions) {
    const storagePath = version.storage_path as string | null
    if (!storagePath) {
      skipped += 1
      continue
    }

    const [bucket, ...rest] = storagePath.split("/")
    const objectPath = rest.join("/")

    if (!bucket || !objectPath) {
      console.warn(`⚠️  Chemin invalide pour la version ${version.id}: ${storagePath}`)
      failed += 1
      continue
    }

    try {
      const bucketRef = getStorageBucket(bucket)
      const remoteFile = bucketRef.file(objectPath)
      const [buffer] = await remoteFile.download()

      const pdfInfo = await pdfParse(buffer)
      const pageCount = pdfInfo.numpages ?? 0

      await admin
        .from("document_versions")
        .update({ page_count: pageCount })
        .eq("id", version.id)

      console.log(`✅ Version ${version.id}: ${pageCount} page(s)`)
      updated += 1
    } catch (err) {
      console.error(`❌ Échec version ${version.id}`, err)
      failed += 1
    }
  }

  console.log("----- Résumé -----")
  console.log(`Mises à jour : ${updated}`)
  console.log(`Ignorées (sans stockage) : ${skipped}`)
  console.log(`Échecs : ${failed}`)
}

main().catch((error) => {
  console.error("Erreur lors du recalcul des pages :", error)
  process.exit(1)
})

