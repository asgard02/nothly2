import * as fs from "fs"
import * as path from "path"

// Charger manuellement les variables d'environnement depuis .env.local
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

import { getSupabaseAdmin } from "../lib/db"

async function debugSubjects() {
  const admin = getSupabaseAdmin()
  
  if (!admin) {
    console.error("❌ Impossible d'initialiser Supabase Admin")
    return
  }

  console.log("🔍 Debug des matières...")
  
  // 1. Vérifier la structure de la table collections
  console.log("\n📋 Structure de la table collections:")
  const { data: columns, error: columnsError } = await admin
    .from("collections")
    .select("*")
    .limit(1)
  
  if (columnsError) {
    console.error("❌ Erreur lors de la récupération de la structure:", columnsError)
  } else {
    console.log("Colonnes disponibles:", columns?.[0] ? Object.keys(columns[0]) : "Aucune donnée")
  }

  // 2. Compter toutes les collections
  const { count: totalCount, error: countError } = await admin
    .from("collections")
    .select("*", { count: "exact", head: true })
  
  if (countError) {
    console.error("❌ Erreur lors du comptage:", countError)
  } else {
    console.log(`\n📊 Nombre total de collections: ${totalCount}`)
  }

  // 3. Récupérer toutes les collections avec leurs détails
  const { data: allCollections, error: allError } = await admin
    .from("collections")
    .select("id, user_id, title, color, created_at, is_favorite")
    .order("created_at", { ascending: false })
  
  if (allError) {
    console.error("❌ Erreur lors de la récupération des collections:", allError)
    console.error("Message d'erreur:", allError.message)
    console.error("Détails:", allError.details)
    console.error("Hint:", allError.hint)
  } else {
    console.log(`\n✅ Collections trouvées: ${allCollections?.length || 0}`)
    allCollections?.forEach((col: any) => {
      console.log(`  - ${col.title} (user: ${col.user_id}, favorite: ${col.is_favorite})`)
    })
  }

  // 4. Grouper par utilisateur
  if (allCollections && allCollections.length > 0) {
    const userGroups = new Map<string, number>()
    allCollections.forEach((col: any) => {
      const count = userGroups.get(col.user_id) || 0
      userGroups.set(col.user_id, count + 1)
    })
    
    console.log("\n👥 Collections par utilisateur:")
    userGroups.forEach((count, userId) => {
      console.log(`  - User ${userId}: ${count} collection(s)`)
    })
  }
}

debugSubjects()
  .then(() => {
    console.log("\n✅ Debug terminé")
    process.exit(0)
  })
  .catch((err) => {
    console.error("\n❌ Erreur:", err)
    process.exit(1)
  })
