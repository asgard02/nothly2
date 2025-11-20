/**
 * Utilitaires pour les requêtes Supabase avec timeout
 */

import type { SupabaseClient } from "@supabase/supabase-js"

const DEFAULT_TIMEOUT_MS = 10000 // 10 secondes

/**
 * Wrapper pour les requêtes Supabase avec timeout
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Request timeout after ${timeoutMs}ms`))
    }, timeoutMs)
  })

  return Promise.race([promise, timeoutPromise])
}

/**
 * Helper pour créer un AbortController avec timeout
 */
export function createTimeoutController(timeoutMs: number = DEFAULT_TIMEOUT_MS): AbortController {
  const controller = new AbortController()
  setTimeout(() => controller.abort(), timeoutMs)
  return controller
}

