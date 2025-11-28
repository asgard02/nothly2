import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Rediriger les codes OAuth de la racine vers /auth/callback
  if (pathname === '/' && request.nextUrl.searchParams.has('code')) {
    const code = request.nextUrl.searchParams.get('code')
    const redirectUrl = new URL('/auth/callback', request.url)
    redirectUrl.searchParams.set('code', code || '')
    return NextResponse.redirect(redirectUrl)
  }

  // Ignorer les fichiers statiques et manifest.json
  if (pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname === '/manifest.json' ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot|json)$/)) {
    return NextResponse.next()
  }

  // Gérer la locale
  let locale = 'en'

  // 1. Vérifier le cookie
  const localeCookie = request.cookies.get('NEXT_LOCALE')?.value
  if (localeCookie && ['en', 'fr'].includes(localeCookie)) {
    locale = localeCookie
  } else {
    // 2. Vérifier le header Accept-Language
    const acceptLanguage = request.headers.get('accept-language')
    if (acceptLanguage) {
      // Simple détection : si 'fr' apparaît dans les préférences
      // Une implémentation plus robuste utiliserait un parser de qualité (q=...)
      if (acceptLanguage.toLowerCase().includes('fr')) {
        locale = 'fr'
      }
    }
  }

  // Créer la réponse de base avec les headers de requête modifiés
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-next-intl-locale', locale)

  const baseResponse = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })

  // Définir le header sur la réponse aussi (pour le client/debug)
  baseResponse.headers.set('x-next-intl-locale', locale)

  // Vérifier que les variables d'environnement sont définies
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[Middleware] Variables d\'environnement Supabase manquantes')
    // Pour les routes publiques, on laisse passer même sans config Supabase
    if (pathname === '/' || pathname === '/pricing' || pathname === '/login' || pathname === '/register') {
      return NextResponse.next()
    }
    // Pour les autres routes, rediriger vers login
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Liste des routes publiques (toujours accessibles, même sans session)
  const publicRoutes = ['/', '/pricing', '/login', '/register']

  // Liste des routes protégées (nécessitent une session)
  const protectedRoutes = ['/dashboard', '/note', '/new', '/chat', '/settings', '/workspace', '/calendar', '/documents']

  // Vérifier si c'est une route publique
  const isPublicRoute = publicRoutes.some(route => pathname === route)

  // Vérifier si c'est une route protégée
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))

  // Pour les routes publiques
  if (isPublicRoute) {
    try {
      const supabase = createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll()
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value, options }) =>
                baseResponse.cookies.set(name, value, options)
              )
            },
          },
        }
      )

      const { data: { session } } = await supabase.auth.getSession()

      if (session && (pathname === '/' || pathname === '/login' || pathname === '/register')) {
        const redirectUrl = new URL('/workspace', request.url)
        const redirectResponse = NextResponse.redirect(redirectUrl)

        // Copier les cookies de baseResponse (qui contient potentiellement le token rafraîchi)
        baseResponse.cookies.getAll().forEach(cookie => {
          redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
        })

        return redirectResponse
      }

      return baseResponse
    } catch (error) {
      // Si erreur Supabase, on laisse quand même passer (route publique)
      console.error('[Middleware] Erreur Supabase sur route publique:', error)
      return baseResponse
    }
  }

  // Pour les routes protégées, vérifier la session
  if (isProtectedRoute) {
    try {
      const supabase = createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll()
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value, options }) =>
                baseResponse.cookies.set(name, value, options)
              )
            },
          },
        }
      )

      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        const redirectUrl = new URL('/login', request.url)
        const redirectResponse = NextResponse.redirect(redirectUrl)

        // Copier les cookies (pour s'assurer que le nettoyage de session est bien propagé)
        baseResponse.cookies.getAll().forEach(cookie => {
          redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
        })

        return redirectResponse
      }

      return baseResponse
    } catch (error) {
      // Si erreur Supabase sur route protégée, rediriger vers login
      console.error('[Middleware] Erreur Supabase sur route protégée:', error)
      const redirectUrl = new URL('/login', request.url)
      const redirectResponse = NextResponse.redirect(redirectUrl)

      // Copier les cookies
      baseResponse.cookies.getAll().forEach(cookie => {
        redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
      })

      return redirectResponse
    }
  }

  // Pour les routes API protégées
  if (pathname.startsWith('/api/notes') || pathname.startsWith('/api/ai')) {
    try {
      const supabase = createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll()
            },
            setAll() {
              // Pas besoin de set cookies pour les API
            },
          },
        }
      )

      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        return NextResponse.json(
          { error: 'Non authentifié' },
          { status: 401 }
        )
      }

      return NextResponse.next()
    } catch (error) {
      console.error('[Middleware] Erreur Supabase sur route API:', error)
      return NextResponse.json(
        { error: 'Erreur d\'authentification' },
        { status: 401 }
      )
    }
  }

  // Par défaut, retourner la réponse de next-intl
  return baseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - _next/webpack-hmr (HMR files)
     * - favicon.ico (favicon file)
     * - manifest.json (PWA manifest)
     * - public files (public folder with extensions)
     * - error handling routes (_error, etc.)
     */
    '/((?!_next/static|_next/image|_next/webpack-hmr|favicon.ico|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot|json)$).*)',
  ],
}
