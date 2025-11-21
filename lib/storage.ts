import { Storage, type StorageOptions } from "@google-cloud/storage"

let cachedBucket: ReturnType<Storage["bucket"]> | null = null

function getStorageOptions(): StorageOptions {
  const projectId = process.env.GCP_PROJECT_ID
  if (!projectId) {
    console.error("[Storage] ❌ Missing GCP_PROJECT_ID environment variable")
    throw new Error("Missing GCP_PROJECT_ID environment variable")
  }

  // Support both plain JSON and base64-encoded JSON
  const key = process.env.GCP_SERVICE_ACCOUNT_KEY || process.env.GCP_SERVICE_ACCOUNT_KEY_BASE64
  if (key) {
    try {
      // Try to decode as base64 first, if it fails, parse as plain JSON
      let jsonString: string
      try {
        // Check if it's base64 by trying to decode it
        const decoded = Buffer.from(key, 'base64').toString('utf-8')
        // If decoding succeeds and produces valid JSON-like content, use it
        if (decoded.startsWith('{')) {
          jsonString = decoded
        } else {
          jsonString = key
        }
      } catch {
        jsonString = key
      }
      const credentials = JSON.parse(jsonString)
      
      // Vérifier que les credentials ont les champs requis
      if (!credentials.client_email || !credentials.private_key) {
        console.error("[Storage] ❌ GCP_SERVICE_ACCOUNT_KEY missing required fields")
        console.error("[Storage] Has client_email:", !!credentials.client_email)
        console.error("[Storage] Has private_key:", !!credentials.private_key)
        throw new Error("GCP_SERVICE_ACCOUNT_KEY is missing required fields. Please check your service account JSON.")
      }
      
      // Log partiel pour debug (sans exposer la clé complète)
      console.log("[Storage] ✅ Using service account:", credentials.client_email)
      
      return { projectId, credentials }
    } catch (error: any) {
      if (error.message.includes("missing required fields")) {
        throw error
      }
      console.error("[Storage] ❌ Failed to parse GCP_SERVICE_ACCOUNT_KEY:", error.message)
      console.error("[Storage] Key preview (first 50 chars):", key?.substring(0, 50))
      throw new Error(`Invalid JSON for GCP_SERVICE_ACCOUNT_KEY: ${error.message}`)
    }
  }

  // Si pas de clé, utiliser l'authentification par défaut (Application Default Credentials)
  console.warn("[Storage] ⚠️ No GCP_SERVICE_ACCOUNT_KEY found, using Application Default Credentials")
  console.warn("[Storage] ⚠️ This may fail if ADC is not configured. Set GCP_SERVICE_ACCOUNT_KEY in .env.local")
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

  try {
    const storageOptions = getStorageOptions()
    
    // Vérifier que les credentials sont valides avant d'initialiser Storage
    if (storageOptions.credentials) {
      const email = (storageOptions.credentials as any).client_email
      if (email) {
        console.log("[Storage] 🔍 Using service account:", email)
      }
    }
    
    const storage = new Storage(storageOptions)
    
    // Tester l'authentification en listant les buckets (opération légère)
    // Cela permettra de détecter l'erreur invalid_grant avant d'essayer d'utiliser le bucket
    // Note: On ne fait pas ça à chaque fois pour éviter les appels API inutiles
    // mais on pourrait l'ajouter en mode debug
    
  const bucket = storage.bucket(resolvedBucketName)

  if (!bucketName) {
    cachedBucket = bucket
  }

  return bucket
  } catch (error: any) {
    console.error("[Storage] ❌ Failed to initialize Google Cloud Storage")
    console.error("[Storage] ❌ Error:", error.message)
    console.error("[Storage] ❌ Error code:", error.code)
    console.error("[Storage] ❌ Bucket:", resolvedBucketName)
    console.error("[Storage] ❌ Project ID:", process.env.GCP_PROJECT_ID)
    console.error("[Storage] ❌ Has GCP_SERVICE_ACCOUNT_KEY:", !!process.env.GCP_SERVICE_ACCOUNT_KEY)
    
    // Afficher un aperçu de la clé (sans exposer la clé complète)
    if (process.env.GCP_SERVICE_ACCOUNT_KEY) {
      try {
        const creds = JSON.parse(process.env.GCP_SERVICE_ACCOUNT_KEY)
        console.error("[Storage] ❌ Service account email:", creds.client_email || "NOT FOUND")
        console.error("[Storage] ❌ Project ID in key:", creds.project_id || "NOT FOUND")
      } catch (e) {
        console.error("[Storage] ❌ Failed to parse GCP_SERVICE_ACCOUNT_KEY for debugging")
      }
    }
    
    // Gérer spécifiquement l'erreur invalid_grant
    if (error.message?.includes("invalid_grant") || error.message?.includes("account not found") || error.code === 401) {
      const detailedError = new Error(
        "Google Cloud Storage authentication failed: The service account key is invalid or expired.\n\n" +
        "Possible causes:\n" +
        "1. The service account was deleted in Google Cloud Console\n" +
        "2. The service account key has expired\n" +
        "3. The GCP_SERVICE_ACCOUNT_KEY JSON is incorrect or corrupted\n" +
        "4. The service account email in the key doesn't match an existing account\n" +
        "5. The JSON in .env.local is not properly escaped (newlines, quotes)\n\n" +
        "Solution:\n" +
        "- Check the service account email in the logs above\n" +
        "- Go to Google Cloud Console → IAM & Admin → Service Accounts\n" +
        "- Verify the service account exists and matches the email above\n" +
        "- Create a new JSON key if needed\n" +
        "- Update GCP_SERVICE_ACCOUNT_KEY in your .env.local file (ensure JSON is on one line or properly escaped)"
      )
      console.error("[Storage] ❌ Detailed error:", detailedError.message)
      throw detailedError
    }
    
    throw error
  }
}

