import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { mockLogin } from "@/lib/auth"

// Force le runtime Node.js pour cette route (nécessaire pour Supabase)
export const runtime = "nodejs"

// Route de développement uniquement - désactivée en production
// GET: Affiche un formulaire de login simple pour le dev
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Route de développement non disponible' }, { status: 404 })
  }
  const redirect = request.nextUrl.searchParams.get("redirect") || "/dashboard"
  
  return new NextResponse(
    `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Login - Nothly</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }
          .container {
            background: white;
            padding: 40px;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.2);
            max-width: 400px;
            width: 100%;
          }
          h1 {
            font-size: 32px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 10px;
          }
          p {
            color: #666;
            margin-bottom: 30px;
          }
          input {
            width: 100%;
            padding: 14px;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            font-size: 16px;
            margin-bottom: 20px;
            transition: all 0.2s;
          }
          input:focus {
            outline: none;
            border-color: #667eea;
          }
          button {
            width: 100%;
            padding: 14px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s;
          }
          button:hover {
            transform: translateY(-2px);
          }
          .note {
            margin-top: 20px;
            padding: 12px;
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            border-radius: 4px;
            font-size: 14px;
            color: #92400e;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Nothly</h1>
          <p>Connexion rapide (dev)</p>
          <form method="POST" action="/api/dev-login?redirect=${encodeURIComponent(redirect)}">
            <input
              type="email"
              name="email"
              placeholder="votre@email.com"
              required
              autofocus
            />
            <button type="submit">Se connecter</button>
          </form>
          <div class="note">
            💡 Mode développement : entrez n'importe quel email pour créer/accéder à un compte.
          </div>
        </div>
      </body>
    </html>
    `,
    {
      headers: { "Content-Type": "text/html" },
    }
  )
}

// POST: Crée/récupère un utilisateur et définit un cookie
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Route de développement non disponible' }, { status: 404 })
  }
  
  const formData = await request.formData()
  const email = formData.get("email") as string
  const redirect = request.nextUrl.searchParams.get("redirect") || "/dashboard"

  if (!email) {
    return NextResponse.json({ error: "Email requis" }, { status: 400 })
  }

  try {
    const user = await mockLogin(email)
    
    const cookieStore = await cookies()
    
    // Stocke l'ID, email et rôle dans les cookies
    // Note: Cette route n'est jamais appelée en production (vérifié ligne 118)
    cookieStore.set("user-id", user.id, {
      httpOnly: true,
      secure: false, // Dev only
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 jours
      path: "/",
    })
    
    cookieStore.set("user-email", user.email, {
      httpOnly: true,
      secure: false, // Dev only
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    })
    
    cookieStore.set("user-role", user.role, {
      httpOnly: true,
      secure: false, // Dev only
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
      path: "/",
    })

    return NextResponse.redirect(new URL(redirect, request.url))
  } catch (error) {
    return NextResponse.json(
      { error: "Erreur lors de la connexion" },
      { status: 500 }
    )
  }
}

// DELETE: Déconnexion
export async function DELETE() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Route de développement non disponible' }, { status: 404 })
  }
  
  const cookieStore = await cookies()
  cookieStore.delete("user-id")
  cookieStore.delete("user-email")
  cookieStore.delete("user-role")
  
  return NextResponse.json({ success: true })
}

