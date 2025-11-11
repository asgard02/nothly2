import { Storage, type StorageOptions } from "@google-cloud/storage"

let cachedBucket: ReturnType<Storage["bucket"]> | null = null

function getStorageOptions(): StorageOptions {
  const projectId = process.env.GCP_PROJECT_ID
  if (!projectId) {
    throw new Error("Missing GCP_PROJECT_ID environment variable")
  }

  const key = process.env.GCP_SERVICE_ACCOUNT_KEY
  if (key) {
    try {
      const credentials = JSON.parse(key)
      return { projectId, credentials }
    } catch (error) {
      throw new Error("Invalid JSON for GCP_SERVICE_ACCOUNT_KEY")
    }
  }

  return { projectId }
}

export function getStorageBucket(bucketName?: string) {
  if (cachedBucket && !bucketName) {
    return cachedBucket
  }

  const resolvedBucketName = bucketName ?? process.env.GCP_STORAGE_BUCKET

  if (!resolvedBucketName) {
    throw new Error("Missing GCP_STORAGE_BUCKET environment variable")
  }

  const storage = new Storage(getStorageOptions())
  const bucket = storage.bucket(resolvedBucketName)

  if (!bucketName) {
    cachedBucket = bucket
  }

  return bucket
}

