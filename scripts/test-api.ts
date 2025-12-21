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

async function testAPI() {
  console.log("🧪 Test de l'API /api/subjects...")
  
  try {
    const response = await fetch("http://localhost:3000/api/subjects", {
      headers: {
        "Cookie": "sb-access-token=YOUR_TOKEN_HERE" // On va tester sans auth d'abord
      }
    })
    
    console.log("Status:", response.status)
    console.log("Headers:", Object.fromEntries(response.headers.entries()))
    
    const data = await response.json()
    console.log("\n📦 Réponse de l'API:")
    console.log(JSON.stringify(data, null, 2))
    
    if (Array.isArray(data)) {
      console.log(`\n✅ ${data.length} matière(s) retournée(s)`)
    } else {
      console.log("\n⚠️ La réponse n'est pas un tableau")
    }
  } catch (error) {
    console.error("\n❌ Erreur:", error)
  }
}

testAPI()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
