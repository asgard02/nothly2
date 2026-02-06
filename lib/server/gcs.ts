/**
 * Google Cloud Storage client - server-only module.
 *
 * Uses GOOGLE_APPLICATION_CREDENTIALS (file path) to avoid OpenSSL DECODER
 * errors (ERR_OSSL_UNSUPPORTED) when passing credentials via JSON string.
 *
 * On Vercel: if only GCP_SERVICE_ACCOUNT_KEY is set, writes to /tmp at runtime.
 */

import "server-only"
import { createPrivateKey } from "crypto"
import { readFileSync, writeFileSync, existsSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"
import { Storage } from "@google-cloud/storage"

const BUCKET_NAME = process.env.GCS_BUCKET ?? process.env.GCP_STORAGE_BUCKET ?? "nothly-storage"

let _credentialsPathEnsured = false

/** Normalize and optionally convert private_key to PKCS#8 for OpenSSL 3 (avoids ERR_OSSL_UNSUPPORTED). */
function normalizePrivateKey(credentials: Record<string, unknown>): void {
  const rawPrivateKey = credentials.private_key as string | undefined
  if (!rawPrivateKey || typeof rawPrivateKey !== "string") return
  const normalized = rawPrivateKey.replace(/\\n/g, "\n").trim()
  try {
    const keyObj = createPrivateKey(normalized)
    const pkcs8 = keyObj.export({ type: "pkcs8", format: "pem" })
    credentials.private_key = typeof pkcs8 === "string" ? pkcs8 : Buffer.from(pkcs8).toString("utf-8")
  } catch {
    credentials.private_key = normalized
  }
}

/**
 * Ensures GOOGLE_APPLICATION_CREDENTIALS points to a valid JSON file.
 * If only GCP_SERVICE_ACCOUNT_KEY is set (e.g. on Vercel), writes to /tmp.
 * Normalizes private_key (newlines + PKCS#8) to avoid OpenSSL 3 DECODER errors.
 */
function ensureCredentialsFile(): void {
  if (_credentialsPathEnsured) return
  _credentialsPathEnsured = true

  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
  if (credPath && existsSync(credPath)) {
    try {
      const content = readFileSync(credPath, "utf-8")
      const credentials = JSON.parse(content) as Record<string, unknown>
      normalizePrivateKey(credentials)
      const tmpPath = join(tmpdir(), `gcp-credentials-${process.pid}-${Date.now()}.json`)
      writeFileSync(tmpPath, JSON.stringify(credentials), "utf-8")
      process.env.GOOGLE_APPLICATION_CREDENTIALS = tmpPath
    } catch (err) {
      // Keep original path if read/normalize fails
    }
    return
  }

  if (credPath) {
    console.warn("[GCS] GOOGLE_APPLICATION_CREDENTIALS points to non-existent file:", credPath)
  }

  const rawKey = process.env.GCP_SERVICE_ACCOUNT_KEY || process.env.GCP_SERVICE_ACCOUNT_KEY_BASE64
  if (!rawKey) {
    return // Will use Application Default Credentials
  }

  try {
    let jsonString: string
    try {
      const decoded = Buffer.from(rawKey, "base64").toString("utf-8")
      jsonString = decoded.startsWith("{") ? decoded : rawKey
    } catch {
      jsonString = rawKey
    }
    jsonString = jsonString.replace(/^\uFEFF/, "").trim()
    if (jsonString.startsWith('"') && jsonString.endsWith('"')) {
      try {
        jsonString = JSON.parse(jsonString) as string
      } catch {
        /* keep as-is */
      }
    }
    if (jsonString.includes('\\"')) {
      jsonString = jsonString.replace(/\\"/g, '"')
    }

    let credentials: Record<string, unknown>
    try {
      credentials = JSON.parse(jsonString) as Record<string, unknown>
    } catch {
      const tmpPath = join(tmpdir(), `gcp-credentials-${process.pid}-${Date.now()}.json`)
      writeFileSync(tmpPath, jsonString, "utf-8")
      process.env.GOOGLE_APPLICATION_CREDENTIALS = tmpPath
      return
    }

    normalizePrivateKey(credentials)

    const tmpPath = join(tmpdir(), `gcp-credentials-${process.pid}-${Date.now()}.json`)
    writeFileSync(tmpPath, JSON.stringify(credentials), "utf-8")
    process.env.GOOGLE_APPLICATION_CREDENTIALS = tmpPath
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error("[GCS] Failed to write credentials to /tmp:", msg)
  }
}

ensureCredentialsFile()

const projectId = process.env.GCP_PROJECT_ID
const storageOptions = projectId ? { projectId } : {}
export const storage = new Storage(storageOptions)

export function getBucket(name?: string) {
  return storage.bucket(name ?? BUCKET_NAME)
}

export const bucket = getBucket()
