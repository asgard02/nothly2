"use client"

import Logo from "@/components/Logo"
import { useState } from "react"
import { createClient } from "@/lib/supabase-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function RegisterPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [message, setMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isError, setIsError] = useState(false)

  const supabase = createClient()
  const router = useRouter()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !password) {
      setIsError(true)
      setMessage("Veuillez remplir tous les champs")
      return
    }

    if (password.length < 6) {
      setIsError(true)
      setMessage("Le mot de passe doit contenir au moins 6 caractères")
      return
    }

    setIsLoading(true)
    setIsError(false)
    setIsSuccess(false)
    setMessage("")

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        setIsError(true)
        setMessage(`Erreur : ${error.message}`)
      } else if (data.user) {
        setIsSuccess(true)
        setMessage("✉️ Un email de confirmation vous a été envoyé. Vérifiez votre boîte de réception.")
        // Rediriger après 3 secondes
        setTimeout(() => {
          router.push("/login")
        }, 3000)
      }
    } catch (error: any) {
      setIsError(true)
      setMessage(`Erreur inattendue : ${error.message || "Une erreur est survenue"}`)
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
          <CardDescription>Créer un nouveau compte</CardDescription>
        </CardHeader>

        <CardContent>
          {isSuccess ? (
            <div className="text-center space-y-4">
              <div className="text-6xl">📧</div>
              <p className="text-primary font-medium">{message}</p>
              <Link href="/login">
                <Button variant="outline" className="mt-4">Aller à la connexion</Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Adresse email</label>
                <Input
                  type="email"
                  placeholder="votre@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Mot de passe</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              {message && (
                <div className={`p-3 rounded-lg text-sm ${
                  isError ? "bg-destructive/10 text-destructive border border-destructive/20" : "bg-primary/10 text-primary border border-primary/20"
                }`}>
                  {message}
                </div>
              )}

              <Button type="submit" disabled={isLoading} className="w-full" size="lg">
                {isLoading ? "Création..." : "Créer mon compte"}
              </Button>

              <div className="text-center mt-4">
                <p className="text-sm text-muted-foreground">
                  Vous avez déjà un compte ?{" "}
                  <Link href="/login" className="text-primary hover:text-primary/80 font-medium">
                    Se connecter
                  </Link>
                </p>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
