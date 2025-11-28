import { createHash } from "crypto"

import pdfParse from "pdf-parse"

import { getSupabaseAdmin } from "@/lib/db"
import { sendDeckReadyEmail } from "@/lib/email"
import {
  generateQuiz,
  generateRevisionNote,
  type QuizPayload,
  type RevisionNotePayload,
} from "@/lib/ai-generation"
import { getStorageBucket } from "@/lib/storage"

type ProgressCallback = (value: number) => Promise<void> | void

export interface DocumentGenerationJobPayload extends Record<string, unknown> {
  documentId: string
  userId: string
  userEmail?: string | null
  title: string
  originalFilename: string
  bucket: string
  objectPath?: string
  manualText?: string | null
  pageCount?: number
  checksum?: string | null
}

// ... (keep existing code)

export interface DocumentGenerationJobResult extends Record<string, unknown> {
  documentId: string
  versionId: string
  sectionsCount: number
  quizzesCount: number
}

interface SectionDraft {
  heading: string
  content: string
}

function normalizeWhitespace(content: string): string {
  return content
    .replace(/\u00A0/g, " ")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim()
}

function sanitizeContent(content: string): string {
  return normalizeWhitespace(content)
}

function detectRawSections(rawText: string, fallbackTitle: string): SectionDraft[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  const sections: SectionDraft[] = []
  let current: SectionDraft | null = null

  const headingRegex =
    /^(chapitre|chapter|section|partie|module|lesson|cours)\b|^\d+(\.\d+)*\b|^[A-Z][A-Z\s]{2,}$/i

  for (const line of lines) {
    const isHeading = headingRegex.test(line)

    if (isHeading) {
      if (current && sanitizeContent(current.content).length > 0) {
        sections.push({
          heading: current.heading,
          content: sanitizeContent(current.content),
        })
      }
      current = { heading: line.replace(/[:\-]+$/, "").trim(), content: "" }
    } else {
      if (!current) {
        current = { heading: fallbackTitle, content: "" }
      }
      current.content += `${line}\n`
    }
  }

  if (current && sanitizeContent(current.content).length > 0) {
    sections.push({
      heading: current.heading,
      content: sanitizeContent(current.content),
    })
  }

  if (sections.length === 0) {
    sections.push({ heading: fallbackTitle, content: sanitizeContent(rawText) })
  }

  return sections
}

function mergeSmallSections(sections: SectionDraft[], minChars: number): SectionDraft[] {
  const merged: SectionDraft[] = []

  for (const section of sections) {
    const content = sanitizeContent(section.content)

    if (merged.length === 0) {
      merged.push({ heading: section.heading, content })
      continue
    }

    if (content.length < minChars) {
      const previous = merged[merged.length - 1]
      previous.heading = `${previous.heading} • ${section.heading}`
      previous.content = `${previous.content}\n\n${section.heading}\n${content}`.trim()
    } else {
      merged.push({ heading: section.heading, content })
    }
  }

  return merged
}

function splitLargeSection(section: SectionDraft, maxChars: number): SectionDraft[] {
  if (section.content.length <= maxChars) {
    return [section]
  }

  const parts: SectionDraft[] = []
  const paragraphs = section.content.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean)

  let buffer: string[] = []
  let currentLength = 0
  let partIndex = 1

  const pushBuffer = () => {
    if (buffer.length === 0) return
    parts.push({
      heading: partIndex === 1 ? section.heading : `${section.heading} (partie ${partIndex})`,
      content: buffer.join("\n\n"),
    })
    buffer = []
    currentLength = 0
    partIndex += 1
  }

  for (const paragraph of paragraphs) {
    const paragraphLength = paragraph.length + 2
    if (currentLength + paragraphLength > maxChars && buffer.length > 0) {
      pushBuffer()
    }
    buffer.push(paragraph)
    currentLength += paragraphLength
  }

  pushBuffer()

  return parts.length > 0 ? parts : [section]
}

function normaliseSections(sections: SectionDraft[], fallbackTitle: string): SectionDraft[] {
  const MIN_SECTION_CHARS = 600
  const MAX_SECTION_CHARS = 4500

  let working = mergeSmallSections(sections, MIN_SECTION_CHARS)

  if (working.length === 0) {
    working = [{ heading: fallbackTitle, content: sanitizeContent(sections.map((section) => section.content).join("\n\n")) }]
  }

  const expanded: SectionDraft[] = []
  for (const section of working) {
    const cleaned = {
      heading: sanitizeContent(section.heading),
      content: sanitizeContent(section.content),
    }
    const parts = splitLargeSection(cleaned, MAX_SECTION_CHARS)
    expanded.push(...parts)
  }

  return expanded
}

function detectSections(rawText: string, fallbackTitle: string): SectionDraft[] {
  const rawSections = detectRawSections(rawText, fallbackTitle)
  const normalized = normaliseSections(rawSections, fallbackTitle)
  return normalized
}

async function loadDocumentText(
  payload: DocumentGenerationJobPayload
): Promise<{ rawText: string; pageCount: number; checksum: string | null }> {
  if (payload.manualText) {
    const checksum = createHash("sha256").update(payload.manualText).digest("hex")
    return {
      rawText: payload.manualText.trim(),
      pageCount: payload.pageCount ?? 0,
      checksum,
    }
  }

  if (!payload.objectPath) {
    throw new Error("Document payload missing object path and manual text")
  }

  try {
    const bucket = getStorageBucket(payload.bucket ?? process.env.GCP_STORAGE_BUCKET)
    const remoteFile = bucket.file(payload.objectPath)
    const [buffer] = await remoteFile.download()

    const checksum = createHash("sha256").update(buffer).digest("hex")
    const pdfInfo = await pdfParse(buffer)
    const rawText = pdfInfo.text.trim()
    const pageCount = pdfInfo.numpages ?? 0

    if (!rawText) {
      throw new Error("Impossible d'extraire le texte du document")
    }

    return { rawText, pageCount, checksum }
  } catch (error: any) {
    console.error("[loadDocumentText] download from storage failed", error)
    throw new Error(error?.message || "Unable to download document from storage")
  }
}

export async function processDocumentGenerationJob(
  payload: DocumentGenerationJobPayload,
  onProgress?: ProgressCallback
): Promise<DocumentGenerationJobResult> {
  const admin = getSupabaseAdmin()
  if (!admin) {
    throw new Error("Supabase admin client not configured")
  }

  const { rawText, pageCount, checksum } = await loadDocumentText(payload)
  onProgress?.(0.1)

  const sectionsDraft = detectSections(rawText, payload.title)
  if (sectionsDraft.length === 0) {
    throw new Error("Aucune section détectée dans le document")
  }

  onProgress?.(0.2)

  const { data: version, error: insertVersionError } = await admin
    .from("document_versions")
    .insert({
      document_id: payload.documentId,
      storage_path: payload.objectPath
        ? `${payload.bucket}/${payload.objectPath}`
        : null,
      page_count: pageCount,
      raw_text: rawText,
      checksum,
    })
    .select("id")
    .single()

  if (insertVersionError || !version) {
    throw insertVersionError || new Error("Impossible de créer la version du document")
  }

  const sectionRows = sectionsDraft.map((section, index) => ({
    document_version_id: version.id,
    parent_section_id: null,
    order_index: index,
    heading: section.heading.slice(0, 250),
    content: section.content,
    content_hash: createHash("sha256").update(section.content).digest("hex"),
  }))

  const { data: insertedSections, error: sectionsError } = await admin
    .from("document_sections")
    .insert(sectionRows)
    .select("id, heading, content, order_index")

  if (sectionsError || !insertedSections) {
    throw sectionsError || new Error("Impossible d'enregistrer les sections")
  }

  onProgress?.(0.4)

  let generatedQuizCount = 0

  for (const section of insertedSections) {
    // Automatic generation disabled as per user request
    // Users will trigger generation manually when needed
    
    /* 
    const metadata = {
      documentTitle: payload.title,
      sectionHeading: section.heading,
      sectionOrder: section.order_index,
      totalSections: insertedSections.length,
    }

    let revisionNoteData: RevisionNotePayload | null = null
    let revisionTokens = 0
    let quizData: QuizPayload | null = null
    let quizTokens = 0

    try {
      const contextualSectionText = `${payload.title}\nSection: ${section.heading}\n\n${section.content}`
      const revision = await generateRevisionNote({ text: contextualSectionText, metadata })
      revisionNoteData = revision.data
      revisionTokens = revision.tokensUsed
    } catch (err) {
      console.error("[processDocumentGenerationJob] generate revision note", err)
    }

    try {
      const quiz = await generateQuiz({
        text: `${payload.title}\nSection: ${section.heading}\n\n${section.content}`,
        metadata,
      })
      quizData = quiz.data
      quizTokens = quiz.tokensUsed
    } catch (err) {
      console.error("[processDocumentGenerationJob] generate quiz", err)
    }

    if (revisionNoteData) {
      const { error } = await admin.from("revision_notes").insert({
        document_version_id: version.id,
        document_section_id: section.id,
        payload: revisionNoteData,
        tokens_used: revisionTokens,
      })

      if (error) {
        console.error("[processDocumentGenerationJob] insert revision note", error)
      }
    }

    if (quizData) {
      const { data: quizSet, error: quizSetError } = await admin
        .from("quiz_sets")
        .insert({
          document_version_id: version.id,
          document_section_id: section.id,
          recommended_duration_minutes: quizData.recommendedSessionLength ?? 6,
          tokens_used: quizTokens,
        })
        .select("id")
        .single()

      if (quizSetError || !quizSet) {
        console.error("[processDocumentGenerationJob] insert quiz set", quizSetError)
        continue
      }

      generatedQuizCount += 1

      if (quizData.questions?.length) {
        const questionsRows = quizData.questions.map((question, index) => ({
          quiz_set_id: quizSet.id,
          question_type: question.type,
          prompt: question.prompt,
          options: question.options,
          answer: question.answer,
          explanation: question.explanation,
          tags: question.tags,
          order_index: index,
        }))

        const { error: insertQuestionsError } = await admin
          .from("quiz_questions")
          .insert(questionsRows)

        if (insertQuestionsError) {
          console.error(
            "[processDocumentGenerationJob] insert quiz questions",
            insertQuestionsError
          )
        }
      }
    }
    */
  }

  onProgress?.(0.7)

  await admin
    .from("document_versions")
    .update({ processed_at: new Date().toISOString() })
    .eq("id", version.id)

  await admin
    .from("documents")
    .update({
      status: "ready",
      current_version_id: version.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", payload.documentId)

  onProgress?.(0.95)

  if (payload.userEmail) {
    const baseAppUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL
    const deckUrl = baseAppUrl
      ? `${baseAppUrl.replace(/\/$/, "")}/documents/${payload.documentId}`
      : undefined

    try {
      await sendDeckReadyEmail({
        to: payload.userEmail,
        documentTitle: payload.title,
        documentId: payload.documentId,
        totalSections: insertedSections.length,
        totalQuizzes: generatedQuizCount,
        dashboardUrl: deckUrl,
      })
    } catch (emailError) {
      console.error("[processDocumentGenerationJob] sendDeckReadyEmail failed", emailError)
    }
  }

  onProgress?.(1)

  return {
    documentId: payload.documentId,
    versionId: version.id,
    sectionsCount: insertedSections.length,
    quizzesCount: generatedQuizCount,
  }
}

