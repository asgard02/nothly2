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

export interface CollectionGenerationJobPayload {
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

const CONTEXT_CHAR_LIMIT = Number(process.env.COLLECTION_CONTEXT_LIMIT_CHARS || 120_000)
const MAX_FLASHCARDS = Number(process.env.COLLECTION_FLASHCARDS_TARGET || 16)
const MAX_QUIZ_QUESTIONS = Number(process.env.COLLECTION_QUIZ_TARGET || 9)

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
  const text = normaliseText(pdfInfo.text || "")

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

export interface CollectionGenerationResult {
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

  const { corpus, included, totalChars } = buildCorpus(extracted)

  if (!corpus) {
    throw new Error("Corpus vide après normalisation")
  }

  const metadata = {
    collectionTitle: payload.title,
    tags: payload.tags,
    totalSources: included.length,
    totalCharacters: totalChars,
    flashcardsTarget: MAX_FLASHCARDS,
    quizTarget: MAX_QUIZ_QUESTIONS,
    sources: included.map((entry) => ({
      title: entry.source.title,
      tags: entry.source.tags,
      textLength: entry.textLength,
    })),
  }

  const aiResult = await generateCollectionStudySet({
    text: corpus,
    metadata,
  })

  const flashcards = aiResult.data.flashcards ?? []
  const quizQuestions = aiResult.data.quiz ?? []

  const batchSize = 25
  const flashcardRows = flashcards.slice(0, MAX_FLASHCARDS).map((card, index) => ({
    collection_id: payload.collectionId,
    question: card.question,
    answer: card.answer,
    tags: card.tags ?? [],
    metadata: {},
    order_index: index,
  }))

  const quizRows = quizQuestions.slice(0, MAX_QUIZ_QUESTIONS).map((question, index) => ({
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

