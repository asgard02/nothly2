/**
 * Script de vérification des variables d'environnement
 * Usage: npx tsx --env-file=.env.local scripts/test-env-config.ts
 */

import { Redis } from "@upstash/redis"

interface EnvCheck {
  name: string
  value: string | undefined
  required: boolean
  masked?: boolean
}

async function main() {
  console.log("🔍 Vérification de la configuration...\n")

  // Liste des variables à vérifier
  const checks: EnvCheck[] = [
    // Supabase
    { name: "NEXT_PUBLIC_SUPABASE_URL", value: process.env.NEXT_PUBLIC_SUPABASE_URL, required: true },
    { name: "NEXT_PUBLIC_SUPABASE_ANON_KEY", value: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, required: true, masked: true },
    { name: "SUPABASE_SERVICE_ROLE_KEY", value: process.env.SUPABASE_SERVICE_ROLE_KEY, required: true, masked: true },
    
    // OpenAI
    { name: "OPENAI_API_KEY", value: process.env.OPENAI_API_KEY, required: true, masked: true },
    
    // Stripe
    { name: "STRIPE_SECRET_KEY", value: process.env.STRIPE_SECRET_KEY, required: false, masked: true },
    { name: "STRIPE_WEBHOOK_SECRET", value: process.env.STRIPE_WEBHOOK_SECRET, required: false, masked: true },
    
    // Upstash Redis (Rate Limiting)
    { name: "UPSTASH_REDIS_REST_URL", value: process.env.UPSTASH_REDIS_REST_URL, required: false },
    { name: "UPSTASH_REDIS_REST_TOKEN", value: process.env.UPSTASH_REDIS_REST_TOKEN, required: false, masked: true },
    
    // App
    { name: "NEXT_PUBLIC_APP_URL", value: process.env.NEXT_PUBLIC_APP_URL, required: false },
  ]

  console.log("📋 Variables d'environnement:\n")

  let hasErrors = false
  let hasUpstash = false

  for (const check of checks) {
    const exists = !!check.value && check.value.length > 0
    const status = exists ? "✅" : (check.required ? "❌" : "⚠️")
    
    let displayValue = "non défini"
    if (exists) {
      if (check.masked) {
        displayValue = check.value!.substring(0, 8) + "..." + check.value!.substring(check.value!.length - 4)
      } else {
        displayValue = check.value!
      }
    }

    console.log(`${status} ${check.name}: ${displayValue}`)

    if (!exists && check.required) {
      hasErrors = true
    }

    if (check.name === "UPSTASH_REDIS_REST_URL" && exists) {
      hasUpstash = true
    }
  }

  console.log("\n" + "=".repeat(50) + "\n")

  // Test de connexion Upstash si configuré
  if (hasUpstash && process.env.UPSTASH_REDIS_REST_TOKEN) {
    console.log("🔗 Test de connexion Upstash Redis...")
    
    try {
      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      })

      // Test simple: set et get
      const testKey = "test:connection:" + Date.now()
      await redis.set(testKey, "ok", { ex: 10 }) // Expire après 10 secondes
      const result = await redis.get(testKey)
      await redis.del(testKey)

      if (result === "ok") {
        console.log("✅ Connexion Upstash Redis réussie!")
        console.log("✅ Rate limiting est ACTIVÉ")
      } else {
        console.log("❌ Test Redis échoué: valeur inattendue")
      }
    } catch (error: any) {
      console.log("❌ Erreur connexion Upstash:", error.message)
    }
  } else {
    console.log("⚠️  Upstash non configuré - Rate limiting DÉSACTIVÉ")
    console.log("   (L'app fonctionne sans, mais sans protection rate limit)")
  }

  console.log("\n" + "=".repeat(50) + "\n")

  // Résumé
  if (hasErrors) {
    console.log("❌ Configuration INCOMPLÈTE - Variables requises manquantes")
    process.exit(1)
  } else {
    console.log("✅ Configuration OK - Toutes les variables requises sont définies")
  }
}

main().catch(console.error)
