import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

type AnySupabaseClient = SupabaseClient<any, any, any>

let cachedAdminClient: AnySupabaseClient | null | undefined

function createAdminClient(): AnySupabaseClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    if (cachedAdminClient !== undefined) {
      return cachedAdminClient
    }

    const message = '[Supabase] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.'
    if (process.env.NODE_ENV === 'production') {
      console.error(message)
    } else {
      console.warn(message)
    }

    cachedAdminClient = null
    return cachedAdminClient
  }

  cachedAdminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return cachedAdminClient
}

export function getSupabaseAdmin(): AnySupabaseClient | null {
  if (cachedAdminClient !== undefined) {
    return cachedAdminClient
  }

  return createAdminClient()
}

export function resetSupabaseAdminCache() {
  cachedAdminClient = undefined
}

export async function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    const message = '[Supabase] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.'
    if (process.env.NODE_ENV === 'production') {
      console.error(message)
    } else {
      console.warn(message)
    }

    const cookieStore = await cookies()
    const userId = cookieStore.get('user-id')?.value

    return {
      supabase: null as AnySupabaseClient | null,
      userId,
    }
  }

  const cookieStore = await cookies()
  const userId = cookieStore.get('user-id')?.value

  return {
    supabase: createClient(supabaseUrl, supabaseAnonKey),
    userId,
  }
}

export function getBrowserSupabaseClient(): AnySupabaseClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    const message = '[Supabase] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.'
    if (process.env.NODE_ENV === 'production') {
      console.error(message)
    } else {
      console.warn(message)
    }

    return null
  }

  return createClient(supabaseUrl, supabaseAnonKey)
}

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


