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
      setMessage("Please fill in all fields")
      return
    }

    if (password.length < 6) {
      setIsError(true)
      setMessage("Password must be at least 6 characters long")
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
        setMessage(`Error: ${error.message}`)
      } else if (data.user) {
        setIsSuccess(true)
        setMessage("✉️ A confirmation email has been sent. Please check your inbox.")
        // Redirect after 3 seconds
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-2">
            <Logo size={40} showText={true} href={null} className="justify-center" />
          </div>
          <CardDescription>Create a new account</CardDescription>
        </CardHeader>

        <CardContent>
          {isSuccess ? (
            <div className="text-center space-y-4">
              <div className="text-6xl">📧</div>
              <p className="text-primary font-medium">{message}</p>
              <Link href="/login">
                <Button variant="outline" className="mt-4">Go to login</Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Email address</label>
                <Input
                  type="email"
                  placeholder="you@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Password</label>
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
                <div
                  className={`p-3 rounded-lg text-sm ${
                    isError
                      ? "bg-destructive/10 text-destructive border border-destructive/20"
                      : "bg-primary/10 text-primary border border-primary/20"
                  }`}
                >
                  {message}
                </div>
              )}

              <Button type="submit" disabled={isLoading} className="w-full" size="lg">
                {isLoading ? "Creating..." : "Create my account"}
              </Button>

              <div className="text-center mt-4">
                <p className="text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <Link href="/login" className="text-primary hover:text-primary/80 font-medium">
                    Log in
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
