import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
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
  const protectedRoutes = ['/dashboard', '/note', '/new', '/chat', '/settings']
  
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
            setAll() {
              // Pas besoin de set cookies pour les routes publiques
            },
          },
        }
      )
      
      const { data: { session } } = await supabase.auth.getSession()
      
      // Si connecté ET sur une page publique, rediriger vers dashboard
      // SAUF pour /pricing qu'on laisse accessible même si connecté
      if (session && pathname !== '/pricing' && (pathname === '/' || pathname === '/login' || pathname === '/register')) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
      
      return NextResponse.next()
    } catch (error) {
      // Si erreur Supabase, on laisse quand même passer (route publique)
      console.error('[Middleware] Erreur Supabase sur route publique:', error)
      return NextResponse.next()
    }
  }
  
  // Pour les routes protégées, vérifier la session
  if (isProtectedRoute) {
    let response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    })
    
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
                request.cookies.set(name, value)
              )
              response = NextResponse.next({
                request,
              })
              cookiesToSet.forEach(({ name, value, options }) =>
                response.cookies.set(name, value, options)
              )
            },
          },
        }
      )
      
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        return NextResponse.redirect(new URL('/login', request.url))
      }
      
      return response
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
  
  // Par défaut, autoriser la requête
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - _next/webpack-hmr (HMR files)
     * - favicon.ico (favicon file)
     * - public files (public folder with extensions)
     * - error handling routes (_error, etc.)
     */
    '/((?!_next/static|_next/image|_next/webpack-hmr|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|eot)$).*)',
  ],
}

