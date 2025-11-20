import { setTimeout as sleep } from "node:timers/promises"

import pdfParse from "pdf-parse"

import { generateCollectionStudySet } from "@/lib/ai-generation"
import { getSupabaseAdmin } from "@/lib/db"
import { getStorageBucket } from "@/lib/storage"

type ProgressCallback = (value: number) => Promise<void> | void

export interface CollectionGenerationSource {
  documentId: string
  documentVersionId: string
  storagePath: string
  title: string
  tags: string[]
  rawText?: string | null
}

export interface CollectionGenerationJobPayload extends Record<string, unknown> {
  collectionId: string
  userId: string
  title: string
  tags: string[]
  sources: CollectionGenerationSource[]
}

interface ExtractedSource {
  source: CollectionGenerationSource
  text: string
  textLength: number
}

// Force la limite à 300k caractères (ignore la variable d'env pour être sûr)
const CONTEXT_CHAR_LIMIT = 300_000
const MAX_FLASHCARDS = Number(process.env.COLLECTION_FLASHCARDS_TARGET || 16)
const MAX_QUIZ_QUESTIONS = Number(process.env.COLLECTION_QUIZ_TARGET || 9)

/**
 * Calcule le nombre optimal de flashcards et quiz en fonction de la taille du contenu
 * @param totalChars Nombre total de caractères dans le corpus
 * @returns Object avec flashcardsCount et quizCount
 */
function calculateOptimalCounts(totalChars: number): { flashcardsCount: number; quizCount: number } {
  // Seuils en caractères
  const SMALL_THRESHOLD = 5_000 // Petit document
  const MEDIUM_THRESHOLD = 30_000 // Document moyen
  const LARGE_THRESHOLD = 100_000 // Grand document

  let flashcardsCount: number
  let quizCount: number

  if (totalChars < SMALL_THRESHOLD) {
    // Petit document : peu de contenu, donc peu de flashcards/quiz
    // Minimum : 3 flashcards, 2 quiz pour avoir quelque chose d'utilisable
    flashcardsCount = Math.max(3, Math.floor(totalChars / 500))
    quizCount = Math.max(2, Math.floor(totalChars / 1000))
  } else if (totalChars < MEDIUM_THRESHOLD) {
    // Document moyen (ex: slides de cours, 15k-30k chars)
    // Souvent dense en concepts par page malgré peu de texte.
    // On booste le ratio : 1 flashcard pour 600 caractères (au lieu de 1500)
    flashcardsCount = Math.floor(totalChars / 600)
    quizCount = Math.floor(totalChars / 1200)

    // Augmenter les minimums/maximums pour cette tranche
    flashcardsCount = Math.min(Math.max(flashcardsCount, 10), 50)
    quizCount = Math.min(Math.max(quizCount, 5), 25)
  } else if (totalChars < LARGE_THRESHOLD) {
    // Grand document : nombre généreux mais raisonnable
    flashcardsCount = Math.floor(totalChars / 2000) // Plus généreux : 1 flashcard pour 2000 chars
    quizCount = Math.floor(totalChars / 4000) // Plus généreux : 1 quiz pour 4000 chars
    // Limiter pour éviter trop de contenu
    flashcardsCount = Math.min(Math.max(flashcardsCount, 15), 60)
    quizCount = Math.min(Math.max(quizCount, 8), 30)
  } else {
    // Très grand document (> 100k) : être généreux avec les maximums
    // Pour 100k chars : ~50 flashcards, ~25 quiz
    // Pour 200k chars : ~100 flashcards, ~50 quiz
    flashcardsCount = Math.min(Math.floor(totalChars / 1500), 100) // Plus généreux : 1 flashcard pour 1500 chars
    quizCount = Math.min(Math.floor(totalChars / 3000), 50) // Plus généreux : 1 quiz pour 3000 chars
  }

  // S'assurer d'avoir au moins un minimum utilisable
  flashcardsCount = Math.max(flashcardsCount, 3)
  quizCount = Math.max(quizCount, 2)

  return { flashcardsCount, quizCount }
}

function normaliseText(value: string): string {
  return value
    .replace(/\u00A0/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/\t+/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .trim()
}

function buildCorpus(extracted: ExtractedSource[]): { corpus: string; included: ExtractedSource[]; totalChars: number } {
  if (extracted.length === 0) {
    return { corpus: "", included: [], totalChars: 0 }
  }

  const limit = CONTEXT_CHAR_LIMIT > 0 ? CONTEXT_CHAR_LIMIT : Number.POSITIVE_INFINITY
  let used = 0
  const included: ExtractedSource[] = []
  const chunks: string[] = []

  for (const entry of extracted) {
    if (!entry.textLength || !entry.text) {
      continue
    }

    const remaining = limit - used
    if (remaining <= 0) {
      break
    }

    const text = entry.textLength > remaining ? entry.text.slice(0, remaining) : entry.text

    chunks.push(`### ${entry.source.title}\n${text}`)
    used += text.length
    included.push({
      ...entry,
      text,
      textLength: text.length,
    })
  }

  return {
    corpus: chunks.join("\n\n").trim(),
    included,
    totalChars: used,
  }
}

async function downloadAndExtract(source: CollectionGenerationSource): Promise<ExtractedSource | null> {
  if (source.rawText) {
    const text = normaliseText(source.rawText)
    return {
      source,
      text,
      textLength: text.length,
    }
  }

  const storagePath = source.storagePath
  if (!storagePath) {
    return null
  }

  const [bucketName, ...objectParts] = storagePath.split("/")
  const objectPath = objectParts.join("/")

  if (!bucketName || !objectPath) {
    return null
  }

  const bucket = getStorageBucket(bucketName)
  const remoteFile = bucket.file(objectPath)
  const [buffer] = await remoteFile.download()

  const pdfInfo = await pdfParse(buffer)
  console.log(`[downloadAndExtract] PDF parsed: ${pdfInfo.numpages} pages, info:`, pdfInfo.info)
  console.log(`[downloadAndExtract] Buffer size: ${buffer.length} bytes`)

  const text = normaliseText(pdfInfo.text || "")
  console.log(`[downloadAndExtract] Extracted text length: ${text.length} chars`)
  console.log(`[downloadAndExtract] Text snippet (first 200 chars): ${text.slice(0, 200)}`)

  return {
    source,
    text,
    textLength: text.length,
  }
}

async function updateSourceMetrics(
  collectionId: string,
  entries: ExtractedSource[]
) {
  const admin = getSupabaseAdmin()
  if (!admin) {
    throw new Error("Supabase admin client not configured")
  }

  for (const entry of entries) {
    await admin
      .from("study_collection_sources")
      .update({ text_length: entry.textLength })
      .eq("collection_id", collectionId)
      .eq("document_version_id", entry.source.documentVersionId)
  }
}

export interface CollectionGenerationResult extends Record<string, unknown> {
  collectionId: string
  flashcardsCount: number
  quizCount: number
  tokensUsed: number
}

export async function processCollectionGenerationJob(
  payload: CollectionGenerationJobPayload,
  onProgress?: ProgressCallback
): Promise<CollectionGenerationResult> {
  const admin = getSupabaseAdmin()
  if (!admin) {
    throw new Error("Supabase admin client not configured")
  }

  if (!payload.sources?.length) {
    throw new Error("Aucune source fournie pour la collection")
  }

  onProgress?.(0.05)

  console.log(`[processCollectionGenerationJob] Démarrage job ${payload.collectionId}`)
  console.log(`[processCollectionGenerationJob] Config: CONTEXT_CHAR_LIMIT=${CONTEXT_CHAR_LIMIT}`)

  const extracted: ExtractedSource[] = []

  for (const source of payload.sources) {
    try {
      const entry = await downloadAndExtract(source)
      if (!entry || entry.textLength === 0) {
        continue
      }
      extracted.push(entry)
    } catch (error) {
      console.error("[processCollectionGenerationJob] download/extract", {
        source,
        error,
      })
    }
  }

  if (extracted.length === 0) {
    throw new Error("Impossible d'extraire le contenu des supports sélectionnés")
  }

  await updateSourceMetrics(payload.collectionId, extracted)

  onProgress?.(0.2)

  // Calculer la taille RÉELLE du document AVANT de tronquer le corpus
  const totalDocumentChars = extracted.reduce((sum, e) => sum + e.textLength, 0)

  // Calculer le nombre optimal basé sur la taille RÉELLE du document
  const { flashcardsCount: targetFlashcards, quizCount: targetQuiz } = calculateOptimalCounts(totalDocumentChars)

  console.log(`[processCollectionGenerationJob] Taille réelle du document: ${totalDocumentChars} caractères`)

  // Ensuite tronquer le corpus pour l'IA (limite de contexte)
  const { corpus, included, totalChars } = buildCorpus(extracted)

  if (!corpus) {
    throw new Error("Corpus vide après normalisation")
  }

  console.log(`[processCollectionGenerationJob] Corpus envoyé à l'IA: ${totalChars} caractères (limite: ${CONTEXT_CHAR_LIMIT})`)

  console.log(`[processCollectionGenerationJob] Calcul dynamique pour ${totalChars} caractères:`, {
    flashcards: targetFlashcards,
    quiz: targetQuiz,
  })

  const metadata = {
    collectionTitle: payload.title,
    tags: payload.tags,
    totalSources: included.length,
    totalDocumentCharacters: totalDocumentChars, // Taille RÉELLE du document
    corpusCharacters: totalChars, // Taille du corpus envoyé (peut être tronqué)
    flashcardsTarget: targetFlashcards,
    quizTarget: targetQuiz,
    sources: included.map((entry) => ({
      title: entry.source.title,
      tags: entry.source.tags,
      textLength: entry.textLength,
    })),
  }

  const aiResult = await generateCollectionStudySet({
    text: corpus,
    metadata: {
      ...metadata,
      // Passer explicitement les nombres dans le message pour être sûr
      flashcardsTarget: targetFlashcards,
      quizTarget: targetQuiz,
    },
  })

  const flashcards = aiResult.data.flashcards ?? []
  const quizQuestions = aiResult.data.quiz ?? []

  console.log(`[processCollectionGenerationJob] IA a généré:`, {
    flashcardsDemandees: targetFlashcards,
    flashcardsGenerees: flashcards.length,
    quizDemandes: targetQuiz,
    quizGeneres: quizQuestions.length,
  })

  // Fonction de validation pour les quiz
  const validateQuizQuestion = (question: any): boolean => {
    // Vérifier que la réponse existe
    if (!question.answer || question.answer.trim() === '') {
      console.warn(`[processCollectionGenerationJob] ⚠️ Question invalide: réponse manquante`, question)
      return false
    }

    // Pour les QCM, vérifier que la réponse correspond à une option
    if (question.type === 'multiple_choice' && question.options && Array.isArray(question.options)) {
      const normalizedAnswer = question.answer.trim().toLowerCase()
      const answerInOptions = question.options.some((opt: string) => 
        opt.trim().toLowerCase() === normalizedAnswer
      )
      if (!answerInOptions) {
        console.warn(`[processCollectionGenerationJob] ⚠️ Question QCM invalide: la réponse "${question.answer}" ne correspond à aucune option`, {
          answer: question.answer,
          options: question.options
        })
        return false
      }
    }

    // Vérifier que le prompt existe
    if (!question.prompt || question.prompt.trim() === '') {
      console.warn(`[processCollectionGenerationJob] ⚠️ Question invalide: prompt manquant`, question)
      return false
    }

    return true
  }

  // Filtrer et valider les questions de quiz
  const validQuizQuestions = quizQuestions.filter(validateQuizQuestion)
  const invalidCount = quizQuestions.length - validQuizQuestions.length
  
  if (invalidCount > 0) {
    console.warn(`[processCollectionGenerationJob] ⚠️ ${invalidCount} question(s) de quiz invalide(s) ont été filtrées`)
  }

  // Avertir si l'IA n'a pas généré assez
  if (flashcards.length < targetFlashcards) {
    console.warn(`[processCollectionGenerationJob] ⚠️ L'IA n'a généré que ${flashcards.length} flashcards sur ${targetFlashcards} demandées`)
  }
  if (quizQuestions.length < targetQuiz) {
    console.warn(`[processCollectionGenerationJob] ⚠️ L'IA n'a généré que ${quizQuestions.length} quiz sur ${targetQuiz} demandés`)
  }

  const batchSize = 25
  const flashcardRows = flashcards.slice(0, targetFlashcards).map((card, index) => ({
    collection_id: payload.collectionId,
    question: card.question,
    answer: card.answer,
    tags: card.tags ?? [],
    metadata: {},
    order_index: index,
  }))

  const quizRows = validQuizQuestions.slice(0, targetQuiz).map((question, index) => ({
    collection_id: payload.collectionId,
    question_type: question.type,
    prompt: question.prompt,
    options: question.options,
    answer: question.answer,
    explanation: question.explanation,
    tags: question.tags ?? [],
    order_index: index,
    metadata: {},
  }))

  if (flashcardRows.length) {
    for (let index = 0; index < flashcardRows.length; index += batchSize) {
      const chunk = flashcardRows.slice(index, index + batchSize)
      await admin.from("study_collection_flashcards").insert(chunk)
      await sleep(5)
    }
  }

  if (quizRows.length) {
    for (let index = 0; index < quizRows.length; index += batchSize) {
      const chunk = quizRows.slice(index, index + batchSize)
      await admin.from("study_collection_quiz_questions").insert(chunk)
      await sleep(5)
    }
  }

  const metadataNotes = {
    summary: aiResult.data.metadata?.summary ?? "",
    notes: aiResult.data.metadata?.notes ?? [],
  }

  await admin
    .from("study_collections")
    .update({
      status: "ready",
      total_sources: included.length,
      total_flashcards: flashcardRows.length,
      total_quiz: quizRows.length,
      prompt_tokens: aiResult.promptTokens ?? null,
      completion_tokens: aiResult.completionTokens ?? null,
      metadata: metadataNotes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", payload.collectionId)

  onProgress?.(1)

  return {
    collectionId: payload.collectionId,
    flashcardsCount: flashcardRows.length,
    quizCount: quizRows.length,
    tokensUsed: aiResult.tokensUsed,
  }
}

