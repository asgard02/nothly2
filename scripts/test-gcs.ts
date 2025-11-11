import { Storage } from "@google-cloud/storage"

async function main() {
  const bucketName = process.env.GCP_STORAGE_BUCKET
  const projectId = process.env.GCP_PROJECT_ID

  if (!projectId) {
    throw new Error("Variable GCP_PROJECT_ID manquante")
  }

  if (!bucketName) {
    throw new Error("Variable GCP_STORAGE_BUCKET manquante")
  }

  const credentials = process.env.GCP_SERVICE_ACCOUNT_KEY
    ? JSON.parse(process.env.GCP_SERVICE_ACCOUNT_KEY)
    : undefined

  const storage = credentials
    ? new Storage({ projectId, credentials })
    : new Storage({ projectId })

  const bucket = storage.bucket(bucketName)
  const filename = `test-${Date.now()}.txt`
  const file = bucket.file(filename)

  await file.save("Hello from Notlhy!", { resumable: false })
  console.log("✅ Upload ok :", filename)

  const [contents] = await file.download()
  console.log("✅ Download ok :", contents.toString())

  await file.delete()
  console.log("✅ Delete ok.")
}

main().catch((error) => {
  console.error("❌ Erreur test GCS :", error)
  process.exit(1)
})

