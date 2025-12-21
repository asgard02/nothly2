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
  const [emailError, setEmailError] = useState("")
  const [passwordError, setPasswordError] = useState("")


  const supabase = createClient()
  const router = useRouter()

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
    <div className="min-h-screen bg-pink-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Abstract Background pattern */}
      <div className="absolute inset-0 z-0 opacity-10" style={{
        backgroundImage: 'radial-gradient(#000 1px, transparent 1px)',
        backgroundSize: '20px 20px'
      }}></div>

      {/* Decorative elements */}
      <div className="absolute top-20 left-10 md:left-20 w-32 h-32 bg-yellow-400 rounded-full border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hidden md:block animate-pulse"></div>
      <div className="absolute bottom-10 right-10 w-24 h-24 bg-violet-400 rotate-45 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hidden md:block animate-bounce delay-1000"></div>

      {/* Main Card */}
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-2xl p-6 md:p-8">

          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-6">
              <Logo size={48} showText={true} href="/" className="justify-center" />
            </div>
            <h1 className="text-3xl font-black mb-2 text-black uppercase tracking-tight">
              Create Account
            </h1>
            <p className="text-base font-medium text-gray-500">
              Start your learning journey today
            </p>
          </div>

          {isSuccess ? (
            <div className="text-center space-y-6 py-6">
              <div className="w-20 h-20 mx-auto bg-green-400 rounded-full border-4 border-black flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <Mail className="h-10 w-10 text-black" />
              </div>
              <div>
                <h3 className="text-xl font-black mb-2 text-black uppercase">Check your email</h3>
                <p className="text-gray-600 font-medium">{message}</p>
              </div>
              <Link href="/login" className="block w-full">
                <Button className="w-full text-base py-6 bg-black text-white hover:bg-gray-800">
                  Go to login
                </Button>
              </Link>
            </div>
          ) : (
            <>
              {/* Google Sign Up */}
              <div className="mb-8">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGoogleSignUp}
                  disabled={isLoading}
                  className="w-full py-6 text-base"
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
                    <div className="w-full border-t-2 border-dashed border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase font-bold tracking-widest">
                    <span className="bg-white px-3 text-gray-400">Or sign up with email</span>
                  </div>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleRegister} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-black mb-2 uppercase tracking-wide">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 z-10" />
                    <Input
                      type="email"
                      placeholder="you@email.com"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setEmailError("") }}
                      disabled={isLoading}
                      className={`pl-12 ${emailError ? "border-red-500 focus:border-red-500" : ""}`}
                    />
                  </div>
                  {emailError && (
                    <p className="mt-2 text-sm font-bold text-red-500 flex items-center gap-1.5">
                      <span className="inline-block w-2 h-2 bg-red-500 rounded-full" />
                      {emailError}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-black mb-2 uppercase tracking-wide">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 z-10" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setPasswordError("") }}
                      disabled={isLoading}
                      className={`pl-12 pr-12 ${passwordError ? "border-red-500 focus:border-red-500" : ""}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black transition"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {passwordError ? (
                    <p className="mt-2 text-sm font-bold text-red-500 flex items-center gap-1.5">
                      <span className="inline-block w-2 h-2 bg-red-500 rounded-full" />
                      {passwordError}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500 font-bold mt-2 uppercase tracking-wide">
                      Must be at least 6 characters long
                    </p>
                  )}
                </div>

                {message && (
                  <div
                    className={`p-4 rounded-xl border-2 font-bold ${isError
                        ? "bg-red-100 text-red-700 border-red-700"
                        : "bg-green-100 text-green-700 border-green-700"
                      }`}
                  >
                    {message}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-6 text-base bg-violet-600 hover:bg-violet-700 text-white"
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

                <div className="text-center mt-6">
                  <p className="text-sm font-medium text-gray-600">
                    Already have an account?{" "}
                    <Link href="/login" className="text-black font-black hover:underline uppercase">
                      Log in
                    </Link>
                  </p>
                </div>
              </form>
            </>
          )}
        </div>

        {/* Back to home */}
        <div className="mt-8 text-center">
          <Link href="/" className="text-sm font-bold text-gray-500 hover:text-black transition inline-flex items-center gap-2 uppercase tracking-wide">
            ← Back to homepage
          </Link>
        </div>
      </div>
    </div>
  )
}
