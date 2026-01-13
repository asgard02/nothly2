/**
 * Helper pour les appels fetch vers OpenAI avec retry automatique
 */

import { retryWithBackoff } from "./utils-retry"

export interface OpenAIFetchOptions {
  model?: string
  messages: Array<{ role: string; content: string }>
  max_tokens?: number
  temperature?: number
  response_format?: { type: string }
  [key: string]: any
}

/**
 * Appel fetch vers OpenAI avec retry automatique
 */
export async function openaiFetch(options: OpenAIFetchOptions): Promise<Response> {
  return retryWithBackoff(
    async () => {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: options.model || "gpt-4o-mini",
          messages: options.messages,
          max_tokens: options.max_tokens || 4000,
          temperature: options.temperature ?? 0.7,
          ...options.response_format && { response_format: options.response_format },
          ...Object.fromEntries(
            Object.entries(options).filter(
              ([key]) => !["model", "messages", "max_tokens", "temperature", "response_format"].includes(key)
            )
          ),
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const error = new Error(errorData.error?.message || `OpenAI API error: ${response.status}`)
        // @ts-ignore
        error.status = response.status
        // @ts-ignore
        error.code = errorData.error?.code
        throw error
      }

      return response
    },
    {
      maxAttempts: 3,
      initialDelayMs: 2000,
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
    }
  )
}
