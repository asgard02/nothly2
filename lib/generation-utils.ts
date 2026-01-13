/**
 * Utilitaires pour la génération IA
 * Phase 3: Estimation du temps et du nombre d'éléments
 */

/**
 * Estime le temps de génération en secondes basé sur le nombre de caractères
 */
export function estimateGenerationTime(totalChars: number): number {
  // Estimation basée sur l'expérience :
  // - Petit document (< 5k chars) : ~30 secondes
  // - Document moyen (5k-30k chars) : ~60-90 secondes
  // - Grand document (30k-100k chars) : ~2-3 minutes
  // - Très grand document (> 100k chars) : ~3-5 minutes

  if (totalChars < 5_000) {
    return 30
  } else if (totalChars < 30_000) {
    return 60 + Math.floor((totalChars - 5_000) / 25_000) * 30
  } else if (totalChars < 100_000) {
    return 120 + Math.floor((totalChars - 30_000) / 70_000) * 60
  } else {
    return 180 + Math.floor((totalChars - 100_000) / 100_000) * 120
  }
}

/**
 * Formate le temps en secondes en une chaîne lisible
 */
export function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`
  }
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (remainingSeconds === 0) {
    return `${minutes}min`
  }
  return `${minutes}min ${remainingSeconds}s`
}

/**
 * Calcule le nombre estimé de flashcards et quiz basé sur la taille du document
 * (Utilise la même logique que calculateOptimalCounts dans processor.ts)
 */
export function estimateFlashcardsAndQuiz(totalChars: number): { flashcards: number; quiz: number } {
  const SMALL_THRESHOLD = 5_000
  const MEDIUM_THRESHOLD = 30_000
  const LARGE_THRESHOLD = 100_000

  let flashcards: number
  let quiz: number

  if (totalChars < SMALL_THRESHOLD) {
    flashcards = Math.max(3, Math.floor(totalChars / 500))
    quiz = Math.max(2, Math.floor(totalChars / 1000))
  } else if (totalChars < MEDIUM_THRESHOLD) {
    flashcards = Math.floor(totalChars / 600)
    quiz = Math.floor(totalChars / 1200)
    flashcards = Math.min(Math.max(flashcards, 10), 50)
    quiz = Math.min(Math.max(quiz, 5), 25)
  } else if (totalChars < LARGE_THRESHOLD) {
    flashcards = Math.floor(totalChars / 2000)
    quiz = Math.floor(totalChars / 4000)
    flashcards = Math.min(Math.max(flashcards, 15), 60)
    quiz = Math.min(Math.max(quiz, 8), 30)
  } else {
    flashcards = Math.min(Math.floor(totalChars / 1500), 100)
    quiz = Math.min(Math.floor(totalChars / 3000), 50)
  }

  flashcards = Math.max(flashcards, 3)
  quiz = Math.max(quiz, 2)

  return { flashcards, quiz }
}
