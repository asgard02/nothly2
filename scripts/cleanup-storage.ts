import * as fs from "fs"
import * as path from "path"

// Charger les variables d'environnement
const envPath = path.join(process.cwd(), ".env.local")
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8")
  envContent.split("\n").forEach((line) => {
    const match = line.match(/^([^=]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      const value = match[2].trim()
      process.env[key] = value
    }
  })
}

import { getStorageBucket } from "../lib/storage"

async function cleanupStorage() {
  const bucketName = process.env.SUPABASE_DOCUMENTS_BUCKET || "documents"
  
  console.log(`🗑️  Nettoyage du bucket: ${bucketName}`)
  console.log("⚠️  ATTENTION: Cette action va supprimer TOUS les fichiers du bucket!")
  console.log("")
  
  // Attendre 3 secondes pour laisser le temps d'annuler
  console.log("Démarrage dans 3 secondes... (Ctrl+C pour annuler)")
  await new Promise(resolve => setTimeout(resolve, 3000))
  
  try {
    const bucket = getStorageBucket(bucketName)
    
    console.log("\n📋 Récupération de la liste des fichiers...")
    const [files] = await bucket.getFiles()
    
    console.log(`📊 ${files.length} fichier(s) trouvé(s)`)
    
    if (files.length === 0) {
      console.log("✅ Le bucket est déjà vide!")
      return
    }
    
    console.log("\n🗑️  Suppression en cours...")
    let deleted = 0
    let errors = 0
    
    for (const file of files) {
      try {
        await file.delete()
        deleted++
        if (deleted % 10 === 0) {
          console.log(`   Supprimé: ${deleted}/${files.length}`)
        }
      } catch (error) {
        errors++
        console.error(`   ❌ Erreur sur ${file.name}:`, error)
      }
    }
    
    console.log("\n" + "=".repeat(50))
    console.log(`✅ Suppression terminée!`)
    console.log(`   - Fichiers supprimés: ${deleted}`)
    console.log(`   - Erreurs: ${errors}`)
    console.log("=".repeat(50))
    
  } catch (error) {
    console.error("\n❌ Erreur lors du nettoyage:", error)
    process.exit(1)
  }
}

cleanupStorage()
  .then(() => {
    console.log("\n✅ Script terminé avec succès")
    process.exit(0)
  })
  .catch((error) => {
    console.error("\n❌ Erreur fatale:", error)
    process.exit(1)
  })
