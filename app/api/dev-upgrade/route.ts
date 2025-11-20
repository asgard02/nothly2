import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getUser } from "@/lib/auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

// GET: Passe l'utilisateur actuel en mode Pro (dev uniquement)
export async function GET() {
  const user = await getUser()
  
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
  }

  const cookieStore = await cookies()
  
  // Met à jour le rôle à Pro
  cookieStore.set("user-role", "pro", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  })

  return new NextResponse(
    `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Upgrade Pro - Nothly</title>
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
            max-width: 500px;
            width: 100%;
            text-align: center;
          }
          h1 {
            font-size: 32px;
            color: #667eea;
            margin-bottom: 20px;
          }
          .crown {
            font-size: 64px;
            margin-bottom: 20px;
          }
          p {
            color: #666;
            margin-bottom: 30px;
            font-size: 18px;
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
            background: #e0e7ff;
            border-left: 4px solid #667eea;
            border-radius: 4px;
            font-size: 14px;
            color: #1e40af;
            text-align: left;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="crown">👑</div>
          <h1>Vous êtes maintenant Pro!</h1>
          <p>Vous pouvez désormais utiliser toutes les fonctionnalités IA :</p>
          <ul style="text-align: left; margin-bottom: 30px; color: #666;">
            <li>✨ Génération de fiches de révision</li>
            <li>✨ Génération de quiz</li>
            <li>✨ 1M tokens/mois</li>
          </ul>
          <button onclick="window.location.href='/dashboard'">
            Aller au Dashboard
          </button>
          <div class="note">
            💡 Mode développement : Rechargez la page du dashboard pour voir le badge Pro apparaître.
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

