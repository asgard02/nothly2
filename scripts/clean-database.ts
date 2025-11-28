/**
 * Script pour nettoyer toutes les données de la base de données
 * ⚠️ ATTENTION : Ce script va SUPPRIMER TOUTES LES DONNÉES
 * Usage: npx tsx scripts/clean-database.ts [--confirm]
 */

// Charger les variables d'environnement depuis .env.local
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

import { getSupabaseAdmin } from "../lib/db"

async function cleanDatabase() {
  const admin = getSupabaseAdmin()
  if (!admin) {
    console.error("❌ Supabase admin client non configuré")
    console.error("   Vérifiez que NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont définis dans .env.local")
    process.exit(1)
  }

  // Vérifier la confirmation
  const args = process.argv.slice(2)
  const confirmed = args.includes('--confirm')
  
  if (!confirmed) {
    console.error("⚠️  ATTENTION : Ce script va SUPPRIMER TOUTES LES DONNÉES de la base de données !")
    console.error("")
    console.error("Pour confirmer, exécutez :")
    console.error("  npx tsx scripts/clean-database.ts --confirm")
    console.error("")
    process.exit(1)
  }

  console.log("🧹 Début du nettoyage de la base de données...\n")

  // Liste des tables à nettoyer (dans l'ordre : enfants d'abord, parents ensuite)
  const tables = [
    'revision_attempts',
    'revision_sessions',
    'quiz_questions',
    'quiz_sets',
    'revision_notes',
    'revision_reminders',
    'study_collection_quiz_questions',
    'study_collection_flashcards',
    'study_collection_sources',
    'study_collections',
    'document_sections',
    'document_versions',
    'documents',
    'collections',
    'notes',
    'async_jobs',
    'usage_counters',
    'user_credits',
    'users'
  ]

  let cleaned = 0
  let errors = 0
  const errorsList: Array<{ table: string; error: string }> = []

  for (const table of tables) {
    try {
      // Vérifier si la table existe
      const { data: tableExists, error: checkError } = await admin
        .from(table)
        .select('*')
        .limit(0)

      if (checkError && checkError.code === '42P01') {
        // Table n'existe pas
        console.log(`⏭️  Table ${table} n'existe pas, ignorée`)
        continue
      }

      // Compter les lignes avant
      const { count: beforeCount } = await admin
        .from(table)
        .select('*', { count: 'exact', head: true })

      // Supprimer toutes les données
      const { error: deleteError } = await admin
        .from(table)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000') // Condition toujours vraie pour tout supprimer

      if (deleteError) {
        console.error(`❌ Erreur lors du nettoyage de ${table}:`, deleteError.message)
        errors++
        errorsList.push({ table, error: deleteError.message })
      } else {
        console.log(`✅ Table ${table} nettoyée (${beforeCount || 0} lignes supprimées)`)
        cleaned++
      }
    } catch (err: any) {
      console.error(`❌ Exception lors du nettoyage de ${table}:`, err.message)
      errors++
      errorsList.push({ table, error: err.message })
    }
  }

  console.log(`\n\n📊 Résumé:`)
  console.log(`  ✅ Tables nettoyées: ${cleaned}`)
  console.log(`  ❌ Erreurs: ${errors}`)

  if (errorsList.length > 0) {
    console.log(`\n⚠️  Erreurs détaillées:`)
    errorsList.forEach(({ table, error }) => {
      console.log(`  - ${table}: ${error}`)
    })
  }

  // Vérification finale
  console.log(`\n🔍 Vérification finale...`)
  try {
    const { count: usersCount } = await admin
      .from('users')
      .select('*', { count: 'exact', head: true })
    
    const { count: documentsCount } = await admin
      .from('documents')
      .select('*', { count: 'exact', head: true })
    
    const { count: notesCount } = await admin
      .from('notes')
      .select('*', { count: 'exact', head: true })

    console.log(`  Users: ${usersCount || 0} lignes`)
    console.log(`  Documents: ${documentsCount || 0} lignes`)
    console.log(`  Notes: ${notesCount || 0} lignes`)

    if (usersCount === 0 && documentsCount === 0 && notesCount === 0) {
      console.log(`\n✅ Base de données complètement nettoyée !`)
    } else {
      console.log(`\n⚠️  Certaines tables contiennent encore des données`)
    }
  } catch (err: any) {
    console.error(`❌ Erreur lors de la vérification:`, err.message)
  }
}

// Exécuter le script
cleanDatabase()
  .then(() => {
    console.log("\n✨ Terminé !")
    process.exit(0)
  })
  .catch((error) => {
    console.error("\n❌ Erreur:", error)
    process.exit(1)
  })

