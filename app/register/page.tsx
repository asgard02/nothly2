"use client"

import Logo from "@/components/Logo"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Mail, Lock } from "lucide-react"

export default function RegisterPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [message, setMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isError, setIsError] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [emailError, setEmailError] = useState("")
  const [passwordError, setPasswordError] = useState("")


  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }
    window.addEventListener("mousemove", handleMouseMove, { passive: true })
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [])

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()

    // Reset errors
    setEmailError("")
    setPasswordError("")
    setMessage("")
    setIsError(false)

    // Validation
    let hasError = false

    if (!email) {
      setEmailError("Email address is required")
      hasError = true
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError("Please enter a valid email address")
      hasError = true
    }

    if (!password) {
      setPasswordError("Password is required")
      hasError = true
    } else if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters long")
      hasError = true
    }

    if (hasError) return

    setIsLoading(true)
    setIsSuccess(false)

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
        setMessage(`Error: ${error.message}`)
      } else if (data.user) {
        setIsSuccess(true)
        setMessage("✉️ A confirmation email has been sent. Please check your inbox.")
        setTimeout(() => {
          router.push("/login")
        }, 3000)
      }
    } catch (error: any) {
      setIsError(true)
      setMessage(`Unexpected error: ${error.message || "Something went wrong"}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignUp = async () => {
    setIsLoading(true)
    setMessage("")
    setIsError(false)

    try {
      const redirectUrl = `${window.location.origin}/auth/callback`

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
        },
      })

      if (error) {
        let errorMessage = error.message
        if (error.message.includes('not enabled') || error.message.includes('Unsupported provider')) {
          errorMessage = "Google sign-in is not enabled. Please configure it in Supabase Dashboard → Authentication → Providers → Google"
        }
        setMessage(`Error: ${errorMessage}`)
        setIsError(true)
        setIsLoading(false)
      }
    } catch (error: any) {
      let errorMessage = "An error occurred"
      if (error?.message?.includes('not enabled') || error?.message?.includes('Unsupported provider')) {
        errorMessage = "Google sign-in is not enabled. Please configure it in Supabase Dashboard → Authentication → Providers → Google"
      }
      setMessage(errorMessage)
      setIsError(true)
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-background text-foreground relative overflow-hidden flex items-center justify-center p-4">
      {/* Grille de fond subtile */}
      <div className="fixed inset-0 z-0" style={{
        backgroundImage: `
          linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px),
          linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)
        `,
        backgroundSize: '100px 100px',
        opacity: 0.3
      }} />

      {/* Gradient suivant la souris */}
      <div
        className="fixed inset-0 z-0 opacity-20 transition-opacity duration-700"
        style={{
          background: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, hsl(var(--primary) / 0.08), transparent 50%)`,
        }}
      />

      {/* Blobs animés subtils */}
      <div className="fixed inset-0 z-0 opacity-5">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-br from-nothly-blue to-nothly-violet rounded-full blur-[100px] animate-blob" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-br from-nothly-violet to-nothly-blue rounded-full blur-[100px] animate-blob animation-delay-2000" />
      </div>

      {/* Card de register */}
      <div className="relative z-10 w-full max-w-md">
        <div className="rounded-3xl border-2 border-border bg-card/80 backdrop-blur-xl p-6 md:p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="flex items-center justify-center mb-4">
              <Logo size={40} showText={true} href="/" className="justify-center" />
            </div>
            <h1 className="text-2xl font-black mb-1 text-foreground">
              Create your account
            </h1>
            <p className="text-sm text-muted-foreground">
              Start your learning journey today
            </p>
          </div>

          {isSuccess ? (
            <div className="text-center space-y-4 py-6">
              <div className="w-16 h-16 mx-auto bg-gradient-to-r from-nothly-blue to-nothly-violet rounded-full flex items-center justify-center">
                <Mail className="h-8 w-8 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-1 text-foreground">Check your email</h3>
                <p className="text-muted-foreground">{message}</p>
              </div>
              <Link href="/login">
                <Button className="bg-muted/20 border-2 border-border hover:bg-muted/50 text-foreground rounded-2xl px-6 py-4">
                  Go to login
                </Button>
              </Link>
            </div>
          ) : (
            <>
              {/* Google Sign Up */}
              <div className="mb-6">
                <Button
                  type="button"
                  onClick={handleGoogleSignUp}
                  disabled={isLoading}
                  className="w-full py-4 rounded-2xl bg-muted/30 border-2 border-border hover:bg-muted/50 hover:border-border/80 transition-all duration-300 text-foreground font-semibold"
                >
                  <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
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
                  Sign up with Google
                </Button>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-3 text-muted-foreground font-semibold">Or</span>
                  </div>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="you@email.com"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setEmailError("") }}
                      disabled={isLoading}
                      className={`w-full pl-12 py-4 rounded-2xl bg-muted/20 border-2 text-foreground placeholder:text-muted-foreground focus:bg-muted/30 transition-all ${emailError ? "border-red-500 focus:border-red-500" : "border-border focus:border-primary"
                        }`}
                    />
                  </div>
                  {emailError && (
                    <p className="mt-2 text-sm text-red-400 flex items-center gap-1.5">
                      <span className="inline-block w-1 h-1 bg-red-400 rounded-full" />
                      {emailError}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setPasswordError("") }}
                      disabled={isLoading}
                      className={`w-full pl-12 pr-12 py-4 rounded-2xl bg-muted/20 border-2 text-foreground placeholder:text-muted-foreground focus:bg-muted/30 transition-all ${passwordError ? "border-red-500 focus:border-red-500" : "border-border focus:border-primary"
                        }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {passwordError ? (
                    <p className="mt-2 text-sm text-red-400 flex items-center gap-1.5">
                      <span className="inline-block w-1 h-1 bg-red-400 rounded-full" />
                      {passwordError}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground mt-2">
                      Must be at least 6 characters long
                    </p>
                  )}
                </div>

                {message && (
                  <div
                    className={`p-4 rounded-2xl text-sm font-medium ${isError
                      ? "bg-red-500/10 text-red-400 border-2 border-red-500/20"
                      : "bg-emerald-500/10 text-emerald-400 border-2 border-emerald-500/20"
                      }`}
                  >
                    {message}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-5 rounded-2xl bg-gradient-to-r from-nothly-blue to-nothly-violet text-white font-bold text-base shadow-lg shadow-nothly-blue/30 hover:shadow-xl hover:shadow-nothly-violet/40 hover:scale-105 transition-all duration-300"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Creating...
                    </span>
                  ) : (
                    "Create my account"
                  )}
                </Button>

                <div className="text-center mt-4">
                  <p className="text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <Link href="/login" className="text-primary hover:text-primary/80 font-semibold transition">
                      Log in
                    </Link>
                  </p>
                </div>
              </form>
            </>
          )}
        </div>

        {/* Back to home */}
        <div className="mt-6 text-center">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition inline-flex items-center gap-2">
            ← Back to homepage
          </Link>
        </div>
      </div>
    </div>
  )
}
