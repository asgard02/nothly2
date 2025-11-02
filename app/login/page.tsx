"use client"

import Logo from "@/components/Logo"
import { useState } from "react"
import { createClient } from "@/lib/supabase-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { useRouter } from "next/navigation"

type LoginMode = "password" | "magic-link"

export default function LoginPage() {
  const [mode, setMode] = useState<LoginMode>("password")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [isSuccess, setIsSuccess] = useState(false)

  const supabase = createClient()
  const router = useRouter()

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !password) {
      setMessage("Veuillez remplir tous les champs")
      setIsSuccess(false)
      return
    }

    setIsLoading(true)
    setMessage("")

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setMessage(`Erreur : ${error.message}`)
        setIsSuccess(false)
      } else if (data.session) {
        setMessage("✅ Connexion réussie ! Redirection...")
        setIsSuccess(true)
        // Supabase gère automatiquement la session via cookies
        setTimeout(() => {
          router.push("/dashboard")
        }, 1000)
      }
    } catch (error) {
      setMessage("Une erreur est survenue")
      setIsSuccess(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleMagicLinkLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email) {
      setMessage("Veuillez entrer votre email")
      setIsSuccess(false)
      return
    }

    setIsLoading(true)
    setMessage("")

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        setMessage(`Erreur : ${error.message}`)
        setIsSuccess(false)
      } else {
        setMessage("✉️ Vérifiez votre email pour vous connecter !")
        setIsSuccess(true)
      }
    } catch (error) {
      setMessage("Une erreur est survenue")
      setIsSuccess(false)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-2">
            <Logo size={40} showText={true} href={null} className="justify-center" />
          </div>
          <CardDescription className="text-base">
            Connectez-vous pour accéder à vos notes
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {/* Onglets pour choisir le mode de connexion */}
          <div className="flex gap-2 mb-6">
            <button
              type="button"
              onClick={() => setMode("password")}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                mode === "password"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              Mot de passe
            </button>
            <button
              type="button"
              onClick={() => setMode("magic-link")}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                mode === "magic-link"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              Lien magique
            </button>
          </div>

          {/* Formulaire mot de passe */}
          {mode === "password" ? (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                  Adresse email
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="votre@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  required
                  className="w-full"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
                  Mot de passe
                </label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  required
                  className="w-full"
                />
              </div>

              <div className="flex items-center">
                <input
                  id="remember"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-primary focus:ring-primary border-border rounded"
                />
                <label htmlFor="remember" className="ml-2 block text-sm text-foreground">
                  Rester connecté
                </label>
              </div>

              {message && (
                <div
                  className={`p-3 rounded-lg text-sm ${
                    isSuccess
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "bg-destructive/10 text-destructive border border-destructive/20"
                  }`}
                >
                  {message}
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full"
                size="lg"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Connexion en cours...
                  </span>
                ) : (
                  "Se connecter"
                )}
              </Button>

              <div className="text-center mt-4">
                <p className="text-sm text-muted-foreground">
                  Pas encore de compte ?{" "}
                  <Link href="/register" className="text-primary hover:text-primary/80 font-medium">
                    Créer un compte
                  </Link>
                </p>
              </div>
            </form>
          ) : (
            /* Formulaire magic link */
            isSuccess ? (
              <div className="text-center space-y-4">
                <div className="text-6xl">📧</div>
                <p className="text-lg font-medium text-primary">
                  Email envoyé !
                </p>
                <p className="text-sm text-muted-foreground">
                  Vérifiez votre boîte de réception et cliquez sur le lien magique pour vous connecter.
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsSuccess(false)
                    setMessage("")
                    setEmail("")
                  }}
                  className="mt-4"
                >
                  Renvoyer un email
                </Button>
              </div>
            ) : (
              <form onSubmit={handleMagicLinkLogin} className="space-y-4">
                <div>
                  <label htmlFor="email-magic" className="block text-sm font-medium text-foreground mb-2">
                    Adresse email
                  </label>
                  <Input
                    id="email-magic"
                    type="email"
                    placeholder="votre@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    required
                    className="w-full"
                  />
                </div>

                {message && (
                  <div
                    className={`p-3 rounded-lg text-sm ${
                      isSuccess
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "bg-destructive/10 text-destructive border border-destructive/20"
                    }`}
                  >
                    {message}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full"
                  size="lg"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <div className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                      Envoi en cours...
                    </span>
                  ) : (
                    "Recevoir un lien magique"
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground mt-4">
                  Un email avec un lien de connexion vous sera envoyé. Pas de mot de passe requis !
                </p>
              </form>
            )
          )}
        </CardContent>
      </Card>
    </div>
  )
}

