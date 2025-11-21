import { getStorageBucket } from "../lib/storage"

async function testStorageAuth() {
  console.log("🔍 Testing Google Cloud Storage authentication...\n")

  // Vérifier les variables d'environnement
  console.log("📋 Environment variables:")
  console.log("  GCP_PROJECT_ID:", process.env.GCP_PROJECT_ID ? "✅ Set" : "❌ Missing")
  console.log("  GCP_STORAGE_BUCKET:", process.env.GCP_STORAGE_BUCKET ? `✅ ${process.env.GCP_STORAGE_BUCKET}` : "❌ Missing")
  const key = process.env.GCP_SERVICE_ACCOUNT_KEY || process.env.GCP_SERVICE_ACCOUNT_KEY_BASE64
  console.log("  GCP_SERVICE_ACCOUNT_KEY:", process.env.GCP_SERVICE_ACCOUNT_KEY ? "✅ Set" : "❌ Missing")
  console.log("  GCP_SERVICE_ACCOUNT_KEY_BASE64:", process.env.GCP_SERVICE_ACCOUNT_KEY_BASE64 ? "✅ Set" : "❌ Missing")
  
  if (key) {
    try {
      // Try to decode as base64 first
      let jsonString: string
      try {
        const decoded = Buffer.from(key, 'base64').toString('utf-8')
        if (decoded.startsWith('{')) {
          jsonString = decoded
        } else {
          jsonString = key
        }
      } catch {
        jsonString = key
      }
      const creds = JSON.parse(jsonString)
      console.log("\n📧 Service Account Details:")
      console.log("  Email:", creds.client_email || "❌ NOT FOUND")
      console.log("  Project ID:", creds.project_id || "❌ NOT FOUND")
      console.log("  Has private_key:", creds.private_key ? "✅ Yes" : "❌ No")
      console.log("  Key type:", creds.type || "❌ NOT FOUND")
    } catch (e: any) {
      console.error("\n❌ Failed to parse GCP_SERVICE_ACCOUNT_KEY:", e.message)
      console.error("  First 100 chars:", process.env.GCP_SERVICE_ACCOUNT_KEY?.substring(0, 100))
      process.exit(1)
    }
  }

  console.log("\n🔧 Testing Storage initialization...")
  
  try {
    const bucket = getStorageBucket()
    console.log("✅ Storage bucket initialized successfully")
    
    console.log("\n🔍 Testing bucket access...")
    let bucketExists = false
    try {
      const [exists] = await bucket.exists()
      bucketExists = exists
      console.log(`  Bucket exists: ${exists ? "✅ Yes" : "⚠️ No (will be created on first upload)"}`)
    } catch (error: any) {
      // La vérification d'existence nécessite storage.buckets.get, mais ce n'est pas critique
      if (error.message?.includes("storage.buckets.get") || error.code === 403) {
        console.log("  ⚠️ Cannot check bucket existence (missing storage.buckets.get permission)")
        console.log("  ℹ️  This is not critical - proceeding with upload test...")
      } else {
        throw error
      }
    }
    
    console.log("\n📦 Testing bucket operations (upload/download/delete)...")
    const testFileName = `test-auth-${Date.now()}.txt`
    const file = bucket.file(testFileName)
    
    try {
      console.log("  Uploading test file...")
      await file.save("Test content", { resumable: false })
      console.log("  ✅ Upload successful")
      
      console.log("  Downloading test file...")
      const [contents] = await file.download()
      console.log("  ✅ Download successful:", contents.toString())
      
      console.log("  Deleting test file...")
      await file.delete()
      console.log("  ✅ Delete successful")
      
      console.log("\n✅ All tests passed! Google Cloud Storage is configured correctly.")
      console.log("   The service account has the necessary permissions for file operations.")
    } catch (opError: any) {
      if (opError.code === 403 || opError.message?.includes("Permission denied")) {
        console.error("\n❌ Permission denied for bucket operations")
        console.error("\n💡 Required permissions:")
        console.error("   - storage.objects.create (for upload)")
        console.error("   - storage.objects.get (for download)")
        console.error("   - storage.objects.delete (for delete)")
        console.error("\n🔧 Solution:")
        console.error("   1. Go to Google Cloud Console → IAM & Admin → Service Accounts")
        console.error("   2. Find: nothly-storage@helpdesk-476610.iam.gserviceaccount.com")
        console.error("   3. Click 'Edit' → 'Add Another Role'")
        console.error("   4. Add role: 'Storage Object Admin' or 'Storage Admin'")
        console.error("   5. Save and wait a few minutes for changes to propagate")
        throw opError
      }
      throw opError
    }
  } catch (error: any) {
    console.error("\n❌ Storage test failed:")
    console.error("  Error:", error.message)
    console.error("  Code:", error.code)
    
    if (error.message?.includes("invalid_grant") || error.message?.includes("account not found")) {
      console.error("\n💡 This error means:")
      console.error("  1. The service account in GCP_SERVICE_ACCOUNT_KEY doesn't exist")
      console.error("  2. The service account key has been deleted or expired")
      console.error("  3. The JSON key is corrupted or incomplete")
      console.error("\n🔧 Solution:")
      console.error("  1. Go to Google Cloud Console → IAM & Admin → Service Accounts")
      console.error("  2. Check if the service account exists (email shown above)")
      console.error("  3. If it doesn't exist, create a new service account")
      console.error("  4. Create a new JSON key and update GCP_SERVICE_ACCOUNT_KEY")
    } else if (error.code === 403 || error.message?.includes("Permission denied") || error.message?.includes("storage.buckets.get")) {
      console.error("\n💡 This is a permissions issue:")
      console.error("   The service account exists but doesn't have the required permissions.")
      console.error("\n🔧 Solution:")
      console.error("   1. Go to Google Cloud Console → IAM & Admin → Service Accounts")
      console.error("   2. Find: nothly-storage@helpdesk-476610.iam.gserviceaccount.com")
      console.error("   3. Click 'Edit' → 'Add Another Role'")
      console.error("   4. Add role: 'Storage Object Admin' (for file operations)")
      console.error("      OR 'Storage Admin' (for full bucket access)")
      console.error("   5. Save and wait a few minutes for changes to propagate")
    }
    
    process.exit(1)
  }
}

testStorageAuth().catch((error) => {
  console.error("❌ Unexpected error:", error)
  process.exit(1)
})

