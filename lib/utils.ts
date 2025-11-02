import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Formate un nombre de tokens pour l'affichage
export function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`
  }
  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}K`
  }
  return tokens.toString()
}

// Calcule le nombre estimé de tokens pour un texte
export function estimateTokens(text: string): number {
  // Approximation : ~4 caractères = 1 token
  return Math.ceil(text.length / 4)
}

