"use client"

import Logo from "@/components/Logo"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Eye, EyeOff } from "lucide-react"

type LoginMode = "password" | "magic-link"

export default function LoginPage() {
  const [mode, setMode] = useState<LoginMode>("password")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [isSuccess, setIsSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Vérifier les erreurs OAuth dans l'URL
  useEffect(() => {
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')
    
    if (error) {
      let errorMessage = errorDescription || "An authentication error occurred"
      
      // Messages d'erreur plus conviviaux
      if (error === 'invalid_grant') {
        errorMessage = "The authentication session has expired or is invalid. Please try signing in again."
      } else if (error === 'auth_failed') {
        errorMessage = errorDescription || "Authentication failed. Please try again."
      } else if (error === 'no_session') {
        errorMessage = "Failed to create session. Please try again."
      } else if (error === 'configuration') {
        errorMessage = "Server configuration error. Please contact support."
      }
      
      setMessage(`Error: ${errorMessage}`)
      setIsSuccess(false)
      
      // Nettoyer l'URL
      router.replace('/login', { scroll: false })
    }
  }, [searchParams, router])

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !password) {
      setMessage("Please fill in all fields")
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
        setMessage(`Error: ${error.message}`)
        setIsSuccess(false)
      } else if (data.session) {
        setMessage("✅ Logged in! Redirecting...")
        setIsSuccess(true)
        router.replace("/stack")
      }
    } catch (error) {
        setMessage("An error occurred")
      setIsSuccess(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleMagicLinkLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email) {
      setMessage("Please enter your email")
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
        setMessage(`Error: ${error.message}`)
        setIsSuccess(false)
      } else {
        setMessage("✉️ Check your mailbox to complete login!")
        setIsSuccess(true)
      }
    } catch (error) {
      setMessage("An error occurred")
      setIsSuccess(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setIsLoading(true)
    setMessage("")
    
    try {
      // Utiliser l'origine actuelle (localhost en dev, production en prod)
      const redirectUrl = `${window.location.origin}/auth/callback`
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            // Forcer l'utilisation de l'URL actuelle
            redirect_to: redirectUrl,
          },
        },
      })

      if (error) {
        let errorMessage = error.message
        // Message plus clair si le provider n'est pas activé
        if (error.message.includes('not enabled') || error.message.includes('Unsupported provider')) {
          errorMessage = "Google sign-in is not enabled. Please configure it in Supabase Dashboard → Authentication → Providers → Google"
        }
        setMessage(`Error: ${errorMessage}`)
        setIsSuccess(false)
        setIsLoading(false)
      }
      // Le navigateur sera redirigé automatiquement vers Google si tout va bien
    } catch (error: any) {
      let errorMessage = "An error occurred"
      if (error?.message?.includes('not enabled') || error?.message?.includes('Unsupported provider')) {
        errorMessage = "Google sign-in is not enabled. Please configure it in Supabase Dashboard → Authentication → Providers → Google"
      }
      setMessage(errorMessage)
      setIsSuccess(false)
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
            Log in to access your notes
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {/* Tabs to choose login method */}
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
              Password
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
              Magic link
            </button>
          </div>

          {/* Google Sign In Button */}
          <div className="mb-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>
            
            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full mt-4"
              size="lg"
            >
              <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </Button>
          </div>

          {/* Password form */}
          {mode === "password" ? (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                  Email address
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  required
                  className="w-full"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
                  Password
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    required
                    className="w-full pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground transition hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-r-md"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
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
                  Stay signed in
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
                    Signing in...
                  </span>
                ) : (
                  "Sign in"
                )}
              </Button>

              <div className="text-center mt-4">
                <p className="text-sm text-muted-foreground">
                  Don't have an account yet?{" "}
                  <Link href="/register" className="text-primary hover:text-primary/80 font-medium">
                    Create an account
                  </Link>
                </p>
              </div>
            </form>
          ) : (
            /* Magic link form */
            isSuccess ? (
              <div className="text-center space-y-4">
                <div className="text-6xl">📧</div>
                <p className="text-lg font-medium text-primary">
                  Email sent!
                </p>
                <p className="text-sm text-muted-foreground">
                  Check your inbox and click the magic link to sign in.
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
                  Resend email
                </Button>
              </div>
            ) : (
              <form onSubmit={handleMagicLinkLogin} className="space-y-4">
                <div>
                  <label htmlFor="email-magic" className="block text-sm font-medium text-foreground mb-2">
                    Email address
                  </label>
                  <Input
                    id="email-magic"
                    type="email"
                    placeholder="you@email.com"
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
                      Sending link...
                    </span>
                  ) : (
                    "Send magic link"
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground mt-4">
                  We'll send you a login link by email. No password needed!
                </p>
              </form>
            )
          )}
        </CardContent>
      </Card>
    </div>
  )
}

