import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
  // Ignorer les fichiers statiques et manifest.json
  if (pathname.startsWith('/_next') || 
      pathname.startsWith('/api') || 
      pathname === '/manifest.json' ||
      pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot|json)$/)) {
    return NextResponse.next()
  }
  
  // Gérer la locale manuellement en lisant le cookie
  const localeCookie = request.cookies.get('NEXT_LOCALE')?.value || 'en'
  const locale = ['en', 'fr'].includes(localeCookie) ? localeCookie : 'en'
  
  // Créer la réponse de base
  const baseResponse = NextResponse.next()
  
  // Définir le header pour next-intl (utilisé par getRequestConfig)
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
  const protectedRoutes = ['/dashboard', '/note', '/new', '/chat', '/settings', '/stack', '/flashcards']
  
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
        return NextResponse.redirect(new URL('/stack', request.url))
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
        return NextResponse.redirect(new URL('/login', request.url))
      }
      
      return baseResponse
    } catch (error) {
      // Si erreur Supabase sur route protégée, rediriger vers login
      console.error('[Middleware] Erreur Supabase sur route protégée:', error)
      return NextResponse.redirect(new URL('/login', request.url))
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

