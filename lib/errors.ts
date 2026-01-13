/**
 * Types et utilitaires pour la gestion d'erreurs OpenAI
 * Phase 2: Amélioration de la gestion d'erreurs
 */

export interface OpenAIErrorResponse {
  error: {
    message: string
    type: string
    code?: string
    param?: string | null
  }
}

export enum OpenAIErrorType {
  // Erreurs d'authentification
  AUTHENTICATION_ERROR = "invalid_api_key",
  INVALID_API_KEY = "invalid_api_key",
  
  // Erreurs de quota/rate limit
  RATE_LIMIT_EXCEEDED = "rate_limit_exceeded",
  QUOTA_EXCEEDED = "insufficient_quota",
  
  // Erreurs de requête
  INVALID_REQUEST = "invalid_request_error",
  CONTEXT_LENGTH_EXCEEDED = "context_length_exceeded",
  
  // Erreurs serveur
  SERVER_ERROR = "server_error",
  INTERNAL_SERVER_ERROR = "internal_server_error",
  
  // Erreurs réseau/timeout
  TIMEOUT = "timeout",
  NETWORK_ERROR = "network_error",
  
  // Erreurs inconnues
  UNKNOWN = "unknown_error",
}

export interface StructuredError {
  type: OpenAIErrorType
  message: string
  userMessage: string // Message traduit et user-friendly
  retryable: boolean
  fallbackAvailable: boolean
  originalError?: any
  context?: {
    userId?: string
    documentId?: string
    collectionId?: string
    jobId?: string
    [key: string]: unknown
  }
}

/**
 * Détecte le type d'erreur OpenAI à partir d'une erreur
 */
export function detectOpenAIErrorType(error: any): OpenAIErrorType {
  if (!error) return OpenAIErrorType.UNKNOWN

  const errorMessage = String(error?.message || error || "").toLowerCase()
  const errorCode = String(error?.code || "").toLowerCase()
  const errorType = String(error?.type || "").toLowerCase()
  const status = error?.status || error?.statusCode

  // Erreurs d'authentification
  if (
    errorMessage.includes("invalid api key") ||
    errorMessage.includes("authentication") ||
    errorCode === "invalid_api_key" ||
    status === 401
  ) {
    return OpenAIErrorType.AUTHENTICATION_ERROR
  }

  // Erreurs de rate limit
  if (
    errorMessage.includes("rate limit") ||
    errorMessage.includes("too many requests") ||
    errorCode === "rate_limit_exceeded" ||
    status === 429
  ) {
    return OpenAIErrorType.RATE_LIMIT_EXCEEDED
  }

  // Erreurs de quota
  if (
    errorMessage.includes("quota") ||
    errorMessage.includes("insufficient") ||
    errorCode === "insufficient_quota" ||
    status === 402
  ) {
    return OpenAIErrorType.QUOTA_EXCEEDED
  }

  // Erreurs de contexte trop long
  if (
    errorMessage.includes("context length") ||
    errorMessage.includes("maximum context length") ||
    errorCode === "context_length_exceeded"
  ) {
    return OpenAIErrorType.CONTEXT_LENGTH_EXCEEDED
  }

  // Erreurs serveur
  if (
    errorMessage.includes("internal server") ||
    errorMessage.includes("server error") ||
    errorType === "server_error" ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504
  ) {
    return OpenAIErrorType.SERVER_ERROR
  }

  // Erreurs timeout
  if (
    errorMessage.includes("timeout") ||
    errorMessage.includes("timed out") ||
    errorCode === "timeout"
  ) {
    return OpenAIErrorType.TIMEOUT
  }

  // Erreurs réseau
  if (
    errorMessage.includes("network") ||
    errorMessage.includes("econnreset") ||
    errorMessage.includes("etimedout") ||
    errorCode === "network_error"
  ) {
    return OpenAIErrorType.NETWORK_ERROR
  }

  return OpenAIErrorType.UNKNOWN
}

/**
 * Convertit une erreur OpenAI en message user-friendly (français)
 */
export function getUserFriendlyMessage(errorType: OpenAIErrorType, language: 'fr' | 'en' = 'fr'): string {
  const messages: Record<OpenAIErrorType, { fr: string; en: string }> = {
    [OpenAIErrorType.AUTHENTICATION_ERROR]: {
      fr: "Erreur d'authentification avec l'IA. Veuillez contacter le support.",
      en: "AI authentication error. Please contact support.",
    },
    [OpenAIErrorType.INVALID_API_KEY]: {
      fr: "Clé API invalide. Veuillez contacter le support.",
      en: "Invalid API key. Please contact support.",
    },
    [OpenAIErrorType.RATE_LIMIT_EXCEEDED]: {
      fr: "Trop de requêtes simultanées. Veuillez patienter quelques instants avant de réessayer.",
      en: "Too many simultaneous requests. Please wait a few moments before trying again.",
    },
    [OpenAIErrorType.QUOTA_EXCEEDED]: {
      fr: "Quota d'utilisation dépassé. Veuillez réessayer plus tard ou contacter le support.",
      en: "Usage quota exceeded. Please try again later or contact support.",
    },
    [OpenAIErrorType.INVALID_REQUEST]: {
      fr: "Requête invalide. Veuillez réessayer avec un contenu différent.",
      en: "Invalid request. Please try again with different content.",
    },
    [OpenAIErrorType.CONTEXT_LENGTH_EXCEEDED]: {
      fr: "Le document est trop long pour être traité en une seule fois. Veuillez le diviser en sections plus petites.",
      en: "The document is too long to be processed at once. Please divide it into smaller sections.",
    },
    [OpenAIErrorType.SERVER_ERROR]: {
      fr: "Erreur temporaire du serveur IA. Veuillez réessayer dans quelques instants.",
      en: "Temporary AI server error. Please try again in a few moments.",
    },
    [OpenAIErrorType.INTERNAL_SERVER_ERROR]: {
      fr: "Erreur interne du serveur. Veuillez réessayer plus tard.",
      en: "Internal server error. Please try again later.",
    },
    [OpenAIErrorType.TIMEOUT]: {
      fr: "La requête a pris trop de temps. Veuillez réessayer avec un document plus court ou diviser votre demande.",
      en: "The request took too long. Please try again with a shorter document or divide your request.",
    },
    [OpenAIErrorType.NETWORK_ERROR]: {
      fr: "Erreur de connexion réseau. Vérifiez votre connexion internet et réessayez.",
      en: "Network connection error. Check your internet connection and try again.",
    },
    [OpenAIErrorType.UNKNOWN]: {
      fr: "Une erreur inattendue s'est produite. Veuillez réessayer ou contacter le support si le problème persiste.",
      en: "An unexpected error occurred. Please try again or contact support if the problem persists.",
    },
  }

  return messages[errorType]?.[language] || messages[OpenAIErrorType.UNKNOWN][language]
}

/**
 * Détermine si une erreur peut être retentée
 */
export function isRetryableError(errorType: OpenAIErrorType): boolean {
  return [
    OpenAIErrorType.RATE_LIMIT_EXCEEDED,
    OpenAIErrorType.SERVER_ERROR,
    OpenAIErrorType.INTERNAL_SERVER_ERROR,
    OpenAIErrorType.TIMEOUT,
    OpenAIErrorType.NETWORK_ERROR,
  ].includes(errorType)
}

/**
 * Détermine si un fallback (régénération ou mode manuel) est disponible
 */
export function hasFallbackAvailable(errorType: OpenAIErrorType): boolean {
  // Toutes les erreurs sauf authentification et quota peuvent avoir un fallback
  return ![
    OpenAIErrorType.AUTHENTICATION_ERROR,
    OpenAIErrorType.INVALID_API_KEY,
    OpenAIErrorType.QUOTA_EXCEEDED,
  ].includes(errorType)
}

/**
 * Structure une erreur OpenAI avec contexte et messages user-friendly
 */
export function structureOpenAIError(
  error: any,
  context?: {
    userId?: string
    documentId?: string
    collectionId?: string
    jobId?: string
    [key: string]: unknown
  },
  language: 'fr' | 'en' = 'fr'
): StructuredError {
  const errorType = detectOpenAIErrorType(error)
  const userMessage = getUserFriendlyMessage(errorType, language)

  return {
    type: errorType,
    message: error?.message || String(error) || "Unknown error",
    userMessage,
    retryable: isRetryableError(errorType),
    fallbackAvailable: hasFallbackAvailable(errorType),
    originalError: error,
    context,
  }
}

/**
 * Log une erreur structurée avec contexte
 */
export function logStructuredError(
  structuredError: StructuredError,
  additionalContext?: Record<string, unknown>
): void {
  const logContext = {
    errorType: structuredError.type,
    message: structuredError.message,
    userMessage: structuredError.userMessage,
    retryable: structuredError.retryable,
    fallbackAvailable: structuredError.fallbackAvailable,
    ...structuredError.context,
    ...additionalContext,
    timestamp: new Date().toISOString(),
  }

  console.error("[OpenAI Error]", JSON.stringify(logContext, null, 2))

  // TODO: Intégrer avec Sentry ou autre service de monitoring si disponible
  // if (process.env.SENTRY_DSN) {
  //   Sentry.captureException(structuredError.originalError, {
  //     tags: { errorType: structuredError.type },
  //     extra: logContext,
  //   })
  // }
}
