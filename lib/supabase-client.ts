import { createBrowserClient } from '@supabase/ssr'

// Client Supabase pour les composants côté client (Client Components)
export const createClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    const message = '[Supabase] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.'
    if (process.env.NODE_ENV === 'production') {
      console.error(message)
    } else {
      console.warn(message)
    }

    throw new Error(message)
  }

  return createBrowserClient(
    supabaseUrl,
    supabaseAnonKey
  )
}

