/**
 * Script pour nettoyer les flashcards et quiz orphelins
 * (collections supprimées mais flashcards/quiz restants)
 */

import { getSupabaseAdmin } from "../lib/db"

async function cleanupOrphans() {
  const admin = getSupabaseAdmin()
  if (!admin) {
    console.error("❌ Configuration Supabase manquante")
    process.exit(1)
  }

  console.log("🧹 Nettoyage des flashcards et quiz orphelins...")

  // Trouver les flashcards orphelines (collection_id pointe vers une collection inexistante)
  const { data: orphanFlashcards, error: fcError } = await admin
    .from("study_collection_flashcards")
    .select("id, collection_id")
    .limit(1000)

  if (fcError) {
    console.error("❌ Erreur lors de la récupération des flashcards:", fcError)
    return
  }

  console.log(`📊 ${orphanFlashcards?.length || 0} flashcards trouvées`)

  let deletedFlashcards = 0
  if (orphanFlashcards) {
    for (const fc of orphanFlashcards) {
      // Vérifier si la collection existe
      const { data: collection, error: collError } = await admin
        .from("study_collections")
        .select("id")
        .eq("id", fc.collection_id)
        .single()

      if (collError || !collection) {
        // Collection n'existe plus, supprimer la flashcard
        const { error: deleteError } = await admin
          .from("study_collection_flashcards")
          .delete()
          .eq("id", fc.id)

        if (!deleteError) {
          deletedFlashcards++
          console.log(`  ✅ Flashcard ${fc.id} supprimée (collection ${fc.collection_id} inexistante)`)
        }
      }
    }
  }

  // Trouver les quiz orphelins
  const { data: orphanQuiz, error: quizError } = await admin
    .from("study_collection_quiz_questions")
    .select("id, collection_id")
    .limit(1000)

  if (quizError) {
    console.error("❌ Erreur lors de la récupération des quiz:", quizError)
    return
  }

  console.log(`📊 ${orphanQuiz?.length || 0} questions de quiz trouvées`)

  let deletedQuiz = 0
  if (orphanQuiz) {
    for (const qq of orphanQuiz) {
      // Vérifier si la collection existe
      const { data: collection, error: collError } = await admin
        .from("study_collections")
        .select("id")
        .eq("id", qq.collection_id)
        .single()

      if (collError || !collection) {
        // Collection n'existe plus, supprimer la question
        const { error: deleteError } = await admin
          .from("study_collection_quiz_questions")
          .delete()
          .eq("id", qq.id)

        if (!deleteError) {
          deletedQuiz++
          console.log(`  ✅ Question ${qq.id} supprimée (collection ${qq.collection_id} inexistante)`)
        }
      }
    }
  }

  console.log(`\n✅ Nettoyage terminé:`)
  console.log(`   - ${deletedFlashcards} flashcards orphelines supprimées`)
  console.log(`   - ${deletedQuiz} questions de quiz orphelines supprimées`)
}

cleanupOrphans()
  .then(() => {
    console.log("\n✨ Script terminé avec succès")
    process.exit(0)
  })
  .catch((error) => {
    console.error("\n❌ Erreur:", error)
    process.exit(1)
  })
