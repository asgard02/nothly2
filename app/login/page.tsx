"use client"

import Logo from "@/components/Logo"
import { useState } from "react"
import { createClient } from "@/lib/supabase-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { useRouter } from "next/navigation"
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

