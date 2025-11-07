"use client"

import { useState } from "react"
import { Shield, Key, LogOut } from "lucide-react"

export default function SecuritySettingsPage() {
  const [loading, setLoading] = useState(false)

  const handleResetPassword = async () => {
    setLoading(true)
    try {
      const { createClient } = await import("@/lib/supabase-client")
      const supabase = createClient()
      
      const { data, error } = await supabase.auth.getUser()
      if (error) throw error

      // Envoyer un email de réinitialisation
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        data.user.email!,
        {
          redirectTo: `${window.location.origin}/reset-password`,
        }
      )

      if (resetError) throw resetError

      alert("Un email de réinitialisation a été envoyé à votre adresse email")
    } catch (error) {
      console.error("Erreur:", error)
      alert("Erreur lors de l'envoi de l'email de réinitialisation")
    } finally {
      setLoading(false)
    }
  }

  const handleLogoutAll = async () => {
    if (
      !confirm(
        "Voulez-vous vraiment déconnecter tous vos appareils ? Vous devrez vous reconnecter partout."
      )
    ) {
      return
    }

    try {
      const { createClient } = await import("@/lib/supabase-client")
      const supabase = createClient()
      await supabase.auth.signOut()
      
      alert("Toutes les sessions ont été fermées")
      window.location.href = "/"  // Changé de "/login" à "/"
    } catch (error) {
      console.error("Erreur:", error)
      alert("Erreur lors de la déconnexion")
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Sécurité</h1>
        <p className="text-muted-foreground">
          Gérez la sécurité de votre compte
        </p>
      </div>

      {/* Sécurité du compte */}
      <div className="bg-card rounded-xl border border-border shadow-sm p-6 mb-6 transition-colors">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">
            Sécurité du compte
          </h2>
        </div>

        <p className="text-sm text-muted-foreground mb-6">
          Assurez-vous que votre compte est bien protégé
        </p>

        <div className="space-y-3">
          {/* Réinitialiser le mot de passe */}
          <button
            onClick={handleResetPassword}
            disabled={loading}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-border text-foreground hover:bg-muted transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Key className="h-5 w-5" />
            {loading ? "Envoi en cours..." : "Réinitialiser mon mot de passe"}
          </button>

          {/* Déconnecter toutes les sessions */}
          <button
            onClick={handleLogoutAll}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-border text-foreground hover:bg-muted transition-all duration-200 font-medium"
          >
            <LogOut className="h-5 w-5" />
            Déconnecter toutes les sessions
          </button>
        </div>
      </div>

      {/* Bonnes pratiques */}
      <div className="bg-primary/10 border border-primary/20 rounded-xl p-6 transition-colors">
        <h3 className="text-sm font-semibold text-foreground mb-2">
          💡 Bonnes pratiques
        </h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>• Utilisez un mot de passe fort et unique</li>
          <li>• Ne partagez jamais votre mot de passe</li>
          <li>• Activez l'authentification à deux facteurs si disponible</li>
          <li>• Changez régulièrement votre mot de passe</li>
        </ul>
      </div>
    </div>
  )
}

