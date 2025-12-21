"use client"

import Logo from "@/components/Logo"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Eye, EyeOff, Sparkles, Mail, Lock, ArrowRight, ArrowLeft } from "lucide-react"
import { useTranslations } from "next-intl"

type LoginMode = "password" | "magic-link"

export default function LoginPage() {
  const t = useTranslations("Login")
  const [mode, setMode] = useState<LoginMode>("password")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [isSuccess, setIsSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [emailError, setEmailError] = useState("")
  const [passwordError, setPasswordError] = useState("")


  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')

    if (error) {
      let errorMessage = errorDescription || t('errors.authError')

      if (error === 'invalid_grant') {
        errorMessage = t('errors.authError') // Simplified for now or add specific key
      } else if (error === 'auth_failed') {
        errorMessage = errorDescription || t('errors.authError')
      } else if (error === 'no_session') {
        errorMessage = t('errors.authError')
      } else if (error === 'configuration') {
        errorMessage = t('errors.genericError')
      }

      setMessage(`Error: ${errorMessage}`)
      setIsSuccess(false)
      router.replace('/login', { scroll: false })
    }
  }, [searchParams, router, t])

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    // Reset errors
    setEmailError("")
    setPasswordError("")
    setMessage("")

    // Validation
    let hasError = false

    if (!email) {
      setEmailError(t('errors.emailRequired'))
      hasError = true
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError(t('errors.emailInvalid'))
      hasError = true
    }

    if (!password) {
      setPasswordError(t('errors.passwordRequired'))
      hasError = true
    }

    if (hasError) return

    setIsLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setMessage(`Error: ${error.message}`)
        setIsSuccess(false)
      } else if (data.session) {
        setMessage(t('errors.successRedirect'))
        setIsSuccess(true)
        router.replace("/workspace")
      }
    } catch (error) {
      setMessage(t('errors.genericError'))
      setIsSuccess(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleMagicLinkLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    // Reset errors
    setEmailError("")
    setMessage("")

    // Validation
    if (!email) {
      setEmailError(t('errors.emailRequired'))
      return
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError(t('errors.emailInvalid'))
      return
    }

    setIsLoading(true)

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
        setIsSuccess(true)
      }
    } catch (error) {
      setMessage(t('errors.genericError'))
      setIsSuccess(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setIsLoading(true)
    setMessage("")

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
        setIsSuccess(false)
        setIsLoading(false)
      }
    } catch (error: any) {
      let errorMessage = t('errors.genericError')
      if (error?.message?.includes('not enabled') || error?.message?.includes('Unsupported provider')) {
        errorMessage = "Google sign-in is not enabled. Please configure it in Supabase Dashboard → Authentication → Providers → Google"
      }
      setMessage(errorMessage)
      setIsSuccess(false)
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FFF0F5] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Abstract Background pattern */}
      <div className="absolute inset-0 z-0" style={{
        backgroundImage: 'radial-gradient(#CBD5E1 1.5px, transparent 1.5px)',
        backgroundSize: '24px 24px'
      }}></div>

      {/* Decorative elements */}
      <div className="absolute top-10 left-10 w-20 h-20 bg-blue-400 rounded-full border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hidden md:block animate-bounce delay-700"></div>
      <div className="absolute bottom-20 right-20 w-16 h-16 bg-pink-400 rotate-12 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hidden md:block animate-pulse"></div>

      {/* Main Card */}
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rounded-2xl p-6 md:p-8">

          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-6">
              <Logo size={48} showText={true} href="/" className="justify-center" />
            </div>
            <h1 className="text-3xl font-black mb-2 text-black uppercase tracking-tight">
              {t('welcome')}
            </h1>
            <p className="text-base font-medium text-gray-500">
              {t('subtitle')}
            </p>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 mb-6">
            <button
              type="button"
              onClick={() => setMode("password")}
              className={`flex-1 py-3 px-4 rounded-xl font-bold border-2 transition-all duration-200 ${mode === "password"
                ? "bg-violet-500 text-white border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] translate-x-[-2px] translate-y-[-2px]"
                : "bg-white text-gray-500 border-transparent hover:border-black/20 hover:bg-gray-50"
                }`}
            >
              {t('tabPassword')}
            </button>
            <button
              type="button"
              onClick={() => setMode("magic-link")}
              className={`flex-1 py-3 px-4 rounded-xl font-bold border-2 transition-all duration-200 ${mode === "magic-link"
                ? "bg-blue-500 text-white border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] translate-x-[-2px] translate-y-[-2px]"
                : "bg-white text-gray-500 border-transparent hover:border-black/20 hover:bg-gray-50"
                }`}
            >
              {t('tabMagicLink')}
            </button>
          </div>

          {/* Google Login */}
          <div className="mb-8">
            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleLogin}
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
              {t('google')}
            </Button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t-2 border-dashed border-gray-300" />
              </div>
              <div className="relative flex justify-center text-xs uppercase font-bold tracking-widest">
                <span className="bg-white px-3 text-gray-400">{t('orContinueWith')}</span>
              </div>
            </div>
          </div>

          {/* Forms */}
          {mode === "password" ? (
            <form onSubmit={handlePasswordLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-black mb-2 uppercase tracking-wide">
                  {t('emailLabel')}
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 z-10" />
                  <Input
                    type="email"
                    placeholder={t('emailPlaceholder')}
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
                  {t('passwordLabel')}
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 z-10" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder={t('passwordPlaceholder')}
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
                {passwordError && (
                  <p className="mt-2 text-sm font-bold text-red-500 flex items-center gap-1.5">
                    <span className="inline-block w-2 h-2 bg-red-500 rounded-full" />
                    {passwordError}
                  </p>
                )}
              </div>

              <div className="flex items-center">
                <input
                  id="remember"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-5 w-5 rounded border-2 border-black text-black focus:ring-offset-2"
                />
                <label htmlFor="remember" className="ml-2 text-sm font-bold text-black">
                  {t('keepSignedIn')}
                </label>
              </div>

              {message && (
                <div
                  className={`p-4 rounded-xl border-2 font-bold ${isSuccess
                    ? "bg-green-100 text-green-700 border-green-700"
                    : "bg-red-100 text-red-700 border-red-700"
                    }`}
                >
                  {message}
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full py-6 text-base bg-black hover:bg-gray-800 text-white"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {t('signingIn')}
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    {t('signInButton')}
                    <ArrowRight className="h-5 w-5" />
                  </span>
                )}
              </Button>
            </form>
          ) : (
            isSuccess ? (
              <div className="text-center space-y-6 py-6">
                <div className="w-20 h-20 mx-auto bg-green-400 rounded-full border-4 border-black flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <Mail className="h-10 w-10 text-black" />
                </div>
                <div>
                  <h3 className="text-xl font-black mb-2 text-black uppercase">{t('checkEmailTitle')}</h3>
                  <p className="text-gray-600 font-medium">
                    {t('checkEmailDesc')} <br />
                    <span className="text-black font-bold bg-yellow-200 px-1">{email}</span>
                  </p>
                </div>
                <Button
                  onClick={() => {
                    setIsSuccess(false)
                    setMessage("")
                    setEmail("")
                  }}
                  variant="outline"
                  className="w-full"
                >
                  {t('sendAnotherLink')}
                </Button>
              </div>
            ) : (
              <form onSubmit={handleMagicLinkLogin} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-black mb-2 uppercase tracking-wide">
                    {t('emailLabel')}
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 z-10" />
                    <Input
                      type="email"
                      placeholder={t('emailPlaceholder')}
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

                {message && (
                  <div
                    className={`p-4 rounded-xl border-2 font-bold ${isSuccess
                      ? "bg-green-100 text-green-700 border-green-700"
                      : "bg-red-100 text-red-700 border-red-700"
                      }`}
                  >
                    {message}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-6 text-base bg-blue-500 hover:bg-blue-600 text-white"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {t('sendingLink')}
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5" />
                      {t('magicLinkButton')}
                    </span>
                  )}
                </Button>

                <p className="text-xs text-center font-bold text-gray-400 uppercase tracking-wider">
                  {t('magicLinkDesc')}
                </p>
              </form>
            )
          )}

          {/* Footer */}
          <div className="mt-8 pt-6 border-t-2 border-dashed border-gray-200 text-center">
            <p className="text-sm font-medium text-gray-600">
              {t('noAccount')}{" "}
              <Link href="/register" className="text-black font-black hover:underline uppercase">
                {t('createAccount')}
              </Link>
            </p>
          </div>
        </div>

        {/* Back to home */}
        <div className="mt-8 text-center">
          <Link href="/" className="text-sm font-bold text-gray-500 hover:text-black transition inline-flex items-center gap-2 uppercase tracking-wide">
            <ArrowLeft className="mr-2 h-4 w-4" /> {t('backToHome')}
          </Link>
        </div>
      </div>
    </div>
  )
}
