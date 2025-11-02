import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// Client côté serveur avec service role (pour admin)
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Client côté serveur avec authentification utilisateur
export async function getSupabaseClient() {
  const cookieStore = await cookies()
  const userId = cookieStore.get('user-id')?.value
  
  return {
    supabase: createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    ),
    userId
  }
}

// Client côté client
export const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Types
export interface User {
  id: string
  email: string
  role: 'free' | 'pro'
  created_at: string
}

export interface Note {
  id: string
  user_id: string
  title: string
  content: string
  updated_at: string
}

export interface UsageCounter {
  user_id: string
  month: string
  tokens_used: number
}

