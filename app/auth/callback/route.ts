import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')

  // Si erreur OAuth dans l'URL, rediriger vers login avec message
  if (error) {
    console.error('[Auth Callback] ❌ Erreur OAuth:', error, errorDescription)
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('error', error)
    if (errorDescription) {
      loginUrl.searchParams.set('error_description', errorDescription)
    }
    return NextResponse.redirect(loginUrl)
  }

  if (code) {
    const cookieStore = await cookies()

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[Auth Callback] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
      return NextResponse.redirect(new URL('/login?error=configuration', request.url))
    }

    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )
    
    try {
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
      
      if (exchangeError) {
        console.error('[Auth Callback] ❌ Erreur exchangeCodeForSession:', exchangeError.message)
        console.error('[Auth Callback] ❌ Détails:', exchangeError)
        
        // Gérer spécifiquement l'erreur invalid_grant
        if (exchangeError.message.includes('invalid_grant') || exchangeError.message.includes('account not found')) {
          const loginUrl = new URL('/login', request.url)
          loginUrl.searchParams.set('error', 'invalid_grant')
          loginUrl.searchParams.set('error_description', 'The authentication session has expired or is invalid. Please try signing in again.')
          return NextResponse.redirect(loginUrl)
  }

        // Autres erreurs
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('error', 'auth_failed')
        loginUrl.searchParams.set('error_description', exchangeError.message)
        return NextResponse.redirect(loginUrl)
      }

      if (!data.session) {
        console.error('[Auth Callback] ❌ Aucune session créée après exchangeCodeForSession')
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('error', 'no_session')
        loginUrl.searchParams.set('error_description', 'Failed to create session. Please try again.')
        return NextResponse.redirect(loginUrl)
      }

      console.log('[Auth Callback] ✅ Session créée avec succès pour:', data.session.user.email)
    } catch (err: any) {
      console.error('[Auth Callback] ❌ Exception lors de exchangeCodeForSession:', err)
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('error', 'exception')
      loginUrl.searchParams.set('error_description', err?.message || 'An unexpected error occurred')
      return NextResponse.redirect(loginUrl)
    }
  } else {
    // Pas de code, peut-être une erreur ou une redirection directe
    console.warn('[Auth Callback] ⚠️ Aucun code OAuth dans l\'URL')
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Redirige vers le dashboard après authentification réussie
  return NextResponse.redirect(new URL('/dashboard', request.url))
}

