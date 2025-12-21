import {
  generateCollectionStudySet,
  generateQuiz,
  generateRevisionNote,
  runTextMode,
  type CollectionStudySetPayload,
  type GenerationMetadata,
  type GenerationMode,
  type QuizPayload,
  type RevisionNotePayload,
  type StructuredMode,
  type TextMode,
  isStructuredMode,
} from "@/lib/ai-generation"

export const AI_GENERATION_JOB_TYPE = "ai-generation"

export interface AIGenerationJobPayload {
  mode: GenerationMode
  text: string
  metadata?: GenerationMetadata | null
}

type ProgressReporter = (progress: number) => Promise<void> | void

type BaseAIGenerationJobResult<TData, TMode extends GenerationMode> = {
  mode: TMode
  kind: "text" | "structured"
  data: TData
  tokensUsed: number
  model: string
  raw: string
  promptTokens?: number
  completionTokens?: number
  metadata: GenerationMetadata | null
}

export type AIGenerationTextResult = BaseAIGenerationJobResult<string, TextMode> & {
  kind: "text"
}

export type AIGenerationRevisionNoteResult = BaseAIGenerationJobResult<RevisionNotePayload, "fiche"> & {
  kind: "structured"
}

export type AIGenerationQuizResult = BaseAIGenerationJobResult<QuizPayload, "quiz"> & {
  kind: "structured"
}

export type AIGenerationCollectionResult = BaseAIGenerationJobResult<
  CollectionStudySetPayload,
  "collection"
> & {
  kind: "structured"
}

export type AIGenerationJobResult =
  | AIGenerationTextResult
  | AIGenerationRevisionNoteResult
  | AIGenerationQuizResult
  | AIGenerationCollectionResult

async function emitProgress(onProgress: ProgressReporter | undefined, value: number) {
  if (!onProgress) {
    return
  }
  await onProgress(value)
}

export async function processAIGenerationJob(
  payload: AIGenerationJobPayload,
  onProgress?: ProgressReporter
): Promise<AIGenerationJobResult> {
  const { mode, text } = payload
  const metadata = payload.metadata ?? null

  if (!text.trim()) {
    throw new Error("Le texte à traiter est vide")
  }

  await emitProgress(onProgress, 0.05)

  if (isStructuredMode(mode)) {
    await emitProgress(onProgress, 0.15)

    switch (mode as StructuredMode) {
      case "fiche": {
        const result = await generateRevisionNote({ text, metadata: metadata ?? undefined })
        await emitProgress(onProgress, 0.8)

        const jobResult: AIGenerationRevisionNoteResult = {
          mode: "fiche",
          kind: "structured",
          data: result.data,
          tokensUsed: result.tokensUsed,
          model: result.model,
          raw: result.raw,
          promptTokens: result.promptTokens,
          completionTokens: result.completionTokens,
          metadata,
        }

        await emitProgress(onProgress, 1)

        return jobResult
      }
      case "quiz": {
        const result = await generateQuiz({ text, metadata: metadata ?? undefined })
        await emitProgress(onProgress, 0.8)

        const jobResult: AIGenerationQuizResult = {
          mode: "quiz",
          kind: "structured",
          data: result.data,
          tokensUsed: result.tokensUsed,
          model: result.model,
          raw: result.raw,
          promptTokens: result.promptTokens,
          completionTokens: result.completionTokens,
          metadata,
        }

        await emitProgress(onProgress, 1)

        return jobResult
      }
      case "collection": {
        const result = await generateCollectionStudySet({
          text,
          metadata: metadata ?? undefined,
        })
        await emitProgress(onProgress, 0.8)

        const jobResult: AIGenerationCollectionResult = {
          mode: "collection",
          kind: "structured",
          data: result.data,
          tokensUsed: result.tokensUsed,
          model: result.model,
          raw: result.raw,
          promptTokens: result.promptTokens,
          completionTokens: result.completionTokens,
          metadata,
        }

        await emitProgress(onProgress, 1)

        return jobResult
      }
      default: {
        throw new Error(`Mode structuré non supporté: ${mode}`)
      }
    }
  }

  const textMode = mode as TextMode
  await emitProgress(onProgress, 0.2)

  const result = await runTextMode(textMode, text, metadata ?? undefined)

  await emitProgress(onProgress, 0.9)

  const jobResult: AIGenerationTextResult = {
    mode: textMode,
    kind: "text",
    data: result.data,
    tokensUsed: result.tokensUsed,
    model: result.model,
    raw: result.raw,
    promptTokens: result.promptTokens,
    completionTokens: result.completionTokens,
    metadata,
  }

  await emitProgress(onProgress, 1)

  return jobResult
}

