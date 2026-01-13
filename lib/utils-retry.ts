/**
 * Utilitaires pour retry avec backoff exponentiel
 * Phase 2: Amélioration avec logging structuré
 */

import { structureOpenAIError, logStructuredError, type StructuredError } from "./errors"

export interface RetryOptions {
  maxAttempts?: number
  initialDelayMs?: number
  maxDelayMs?: number
  backoffMultiplier?: number
  retryableErrors?: string[]
  context?: {
    userId?: string
    documentId?: string
    collectionId?: string
    jobId?: string
    [key: string]: unknown
  }
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelayMs: 1000, // 1 seconde
  maxDelayMs: 30000, // 30 secondes max
  backoffMultiplier: 2,
  retryableErrors: [
    "rate_limit_exceeded",
    "rate_limit",
    "too_many_requests",
    "internal_server_error",
    "service_unavailable",
    "timeout",
    "network",
    "ECONNRESET",
    "ETIMEDOUT",
  ],
  context: {},
}

/**
 * Vérifie si une erreur est récupérable (peut être retentée)
 */
function isRetryableError(error: any, retryableErrors: string[]): boolean {
  if (!error) return false

  const errorMessage = String(error?.message || error || "").toLowerCase()
  const errorCode = String(error?.code || "").toLowerCase()
  const errorStatus = error?.status || error?.statusCode

  // Erreurs HTTP 429 (rate limit), 500, 502, 503, 504 sont récupérables
  if (errorStatus === 429 || errorStatus === 500 || errorStatus === 502 || errorStatus === 503 || errorStatus === 504) {
    return true
  }

  // Vérifier les messages d'erreur
  for (const retryableError of retryableErrors) {
    if (errorMessage.includes(retryableError.toLowerCase()) || errorCode.includes(retryableError.toLowerCase())) {
      return true
    }
  }

  return false
}

/**
 * Retry avec backoff exponentiel
 * Phase 2: Amélioration avec logging structuré et gestion d'erreurs OpenAI
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  let lastError: any
  let structuredError: StructuredError | null = null

  for (let attempt = 0; attempt < opts.maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error: any) {
      lastError = error

      // Structurer l'erreur pour le logging (seulement à la première tentative)
      if (attempt === 0) {
        structuredError = structureOpenAIError(error, opts.context)
        logStructuredError(structuredError, {
          attempt: attempt + 1,
          maxAttempts: opts.maxAttempts,
        })
      }

      // Si ce n'est pas la dernière tentative et que l'erreur est récupérable
      if (attempt < opts.maxAttempts - 1 && isRetryableError(error, opts.retryableErrors)) {
        const delay = Math.min(
          opts.initialDelayMs * Math.pow(opts.backoffMultiplier, attempt),
          opts.maxDelayMs
        )

        console.log(
          `[retryWithBackoff] Tentative ${attempt + 1}/${opts.maxAttempts} échouée, retry dans ${delay}ms`,
          error?.message || error
        )

        await new Promise((resolve) => setTimeout(resolve, delay))
        continue
      }

      // Si l'erreur n'est pas récupérable ou c'est la dernière tentative
      // Log l'erreur finale avec contexte complet
      if (structuredError) {
        logStructuredError(structuredError, {
          attempt: attempt + 1,
          maxAttempts: opts.maxAttempts,
          finalAttempt: true,
        })
      }
      throw error
    }
  }

  throw lastError
}

/**
 * Wrapper pour les appels OpenAI avec retry automatique
 * Phase 2: Amélioration avec gestion d'erreurs structurée
 */
export async function openaiWithRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  return retryWithBackoff(fn, {
    maxAttempts: 3,
    initialDelayMs: 2000, // 2 secondes pour OpenAI
    maxDelayMs: 30000,
    backoffMultiplier: 2,
    retryableErrors: [
      "rate_limit_exceeded",
      "rate_limit",
      "too_many_requests",
      "internal_server_error",
      "service_unavailable",
      "timeout",
      "429",
      "500",
      "502",
      "503",
      "504",
    ],
    ...options,
  })
}

/**
 * Wrapper pour les appels Supabase avec retry automatique
 */
export async function supabaseWithRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  return retryWithBackoff(fn, {
    maxAttempts: 3,
    initialDelayMs: 1000, // 1 seconde pour Supabase
    maxDelayMs: 10000, // 10 secondes max pour Supabase
    backoffMultiplier: 1.5,
    retryableErrors: [
      "internal_server_error",
      "service_unavailable",
      "timeout",
      "ECONNRESET",
      "ETIMEDOUT",
      "500",
      "502",
      "503",
      "504",
    ],
    ...options,
  })
}
