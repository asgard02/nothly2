const MAX_TOKENS_PRO = 1_000_000 // 1M tokens/mois pour Pro

// Mock storage en mémoire (temporaire - remplacer par Supabase en production)
const mockUsage = new Map<string, number>()

function getUserMonthKey(userId: string): string {
  const month = new Date().toISOString().slice(0, 7) // Format: YYYY-MM
  return `${userId}-${month}`
}

// Récupère l'usage du mois en cours
export async function getMonthlyUsage(userId: string): Promise<number> {
  const key = getUserMonthKey(userId)
  return mockUsage.get(key) || 0
}

// Vérifie si l'utilisateur peut encore utiliser l'IA
export async function canUseAI(userId: string, role: string): Promise<boolean> {
  if (role !== 'pro') {
    return false
  }

  const usage = await getMonthlyUsage(userId)
  return usage < MAX_TOKENS_PRO
}

// Incrémente l'usage de tokens
export async function incrementUsage(userId: string, tokens: number): Promise<void> {
  const key = getUserMonthKey(userId)
  const currentUsage = mockUsage.get(key) || 0
  mockUsage.set(key, currentUsage + tokens)
}

// Récupère les infos de quota
export async function getQuotaInfo(userId: string, role: string) {
  if (role !== 'pro') {
    return {
      used: 0,
      limit: 0,
      remaining: 0,
      percentage: 0
    }
  }

  const used = await getMonthlyUsage(userId)
  const limit = MAX_TOKENS_PRO
  const remaining = Math.max(0, limit - used)
  const percentage = Math.min(100, (used / limit) * 100)

  return {
    used,
    limit,
    remaining,
    percentage
  }
}

