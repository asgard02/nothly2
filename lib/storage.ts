/**
 * Storage facade - delegates to lib/server/gcs for GCS operations.
 *
 * Uses GOOGLE_APPLICATION_CREDENTIALS (file path) to avoid OpenSSL
 * ERR_OSSL_UNSUPPORTED when passing credentials via JSON string.
 *
 * Import this only from server-side code (API routes, workers, scripts).
 */

import { getBucket } from "@/lib/server/gcs"

let cachedBucket: ReturnType<typeof getBucket> | null = null

export function getStorageBucket(bucketName?: string) {
  if (cachedBucket && !bucketName) {
    return cachedBucket
  }

  const bucket = getBucket(bucketName)
  if (!bucketName) {
    cachedBucket = bucket
  }
  return bucket
}
