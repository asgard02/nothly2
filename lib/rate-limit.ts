import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { NextRequest, NextResponse } from "next/server"

// Configuration Redis Upstash
// Si les variables ne sont pas définies, le rate limiting est désactivé
let redis: Redis | null = null
let ratelimiters: Map<string, Ratelimit> | null = null

function getRedis(): Redis | null {
  if (redis) return redis

  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) {
    if (process.env.NODE_ENV === "production") {
      console.warn("[RateLimit] UPSTASH_REDIS_REST_URL ou UPSTASH_REDIS_REST_TOKEN non défini. Rate limiting désactivé.")
    }
    return null
  }

  redis = new Redis({ url, token })
  return redis
}

// Différentes configurations de rate limit selon le type d'endpoint
type RateLimitType = "ai" | "api" | "auth" | "upload"

const RATE_LIMIT_CONFIGS: Record<RateLimitType, { requests: number; window: string }> = {
  // Endpoints IA - plus restrictifs (coûteux)
  ai: { requests: 20, window: "1m" },
  // Endpoints API standard
  api: { requests: 100, window: "1m" },
  // Endpoints d'authentification (protection brute force)
  auth: { requests: 10, window: "1m" },
  // Uploads de fichiers
  upload: { requests: 10, window: "1m" },
}

function getRatelimiter(type: RateLimitType): Ratelimit | null {
  const redisClient = getRedis()
  if (!redisClient) return null

  if (!ratelimiters) {
    ratelimiters = new Map()
  }

  if (!ratelimiters.has(type)) {
    const config = RATE_LIMIT_CONFIGS[type]
    const limiter = new Ratelimit({
      redis: redisClient,
      limiter: Ratelimit.slidingWindow(config.requests, config.window),
      analytics: true,
      prefix: `ratelimit:${type}`,
    })
    ratelimiters.set(type, limiter)
  }

  return ratelimiters.get(type) || null
}

// Récupère l'identifiant unique pour le rate limiting
function getIdentifier(request: NextRequest, userId?: string): string {
  // Préférer l'ID utilisateur si disponible
  if (userId) {
    return `user:${userId}`
  }

  // Sinon utiliser l'IP
  const forwarded = request.headers.get("x-forwarded-for")
  const ip = forwarded ? forwarded.split(",")[0].trim() : request.headers.get("x-real-ip") || "unknown"
  return `ip:${ip}`
}

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
}

/**
 * Vérifie le rate limit pour une requête
 * @param request - La requête Next.js
 * @param type - Le type de rate limit à appliquer
 * @param userId - L'ID utilisateur optionnel (plus précis que l'IP)
 * @returns Le résultat du rate limit ou null si désactivé
 */
export async function checkRateLimit(
  request: NextRequest,
  type: RateLimitType,
  userId?: string
): Promise<RateLimitResult | null> {
  const limiter = getRatelimiter(type)
  if (!limiter) return null // Rate limiting désactivé

  const identifier = getIdentifier(request, userId)

  try {
    const result = await limiter.limit(identifier)
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    }
  } catch (error) {
    console.error("[RateLimit] Erreur:", error)
    // En cas d'erreur Redis, on laisse passer (fail open)
    return null
  }
}

/**
 * Middleware helper pour appliquer le rate limiting
 * Retourne une réponse 429 si la limite est dépassée, sinon null
 */
export async function withRateLimit(
  request: NextRequest,
  type: RateLimitType,
  userId?: string
): Promise<NextResponse | null> {
  const result = await checkRateLimit(request, type, userId)

  // Si rate limiting désactivé ou erreur, on laisse passer
  if (!result) return null

  if (!result.success) {
    const retryAfter = Math.ceil((result.reset - Date.now()) / 1000)

    return NextResponse.json(
      {
        error: "Trop de requêtes. Veuillez réessayer plus tard.",
        retryAfter,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(result.limit),
          "X-RateLimit-Remaining": String(result.remaining),
          "X-RateLimit-Reset": String(result.reset),
        },
      }
    )
  }

  return null
}

/**
 * Headers de rate limit à ajouter à une réponse réussie
 */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(result.reset),
  }
}
