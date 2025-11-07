import { createServerClient } from "@/lib/supabase-server"
import { getSupabaseAdmin } from "@/lib/db"

/**
 * Crée une nouvelle note côté serveur
 * @returns L'ID de la note créée
 * @throws Error si l'utilisateur n'est pas authentifié ou si la création échoue
 */
export async function createNote(): Promise<{ id: string }> {
  const supabase = await createServerClient()
  if (!supabase) {
    throw new Error("Configuration Supabase manquante")
  }
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    throw new Error("Non authentifié")
  }

  const supabaseAdmin = getSupabaseAdmin()

  if (!supabaseAdmin) {
    throw new Error("Configuration Supabase manquante")
  }

  const { data, error } = await supabaseAdmin
    .from("notes")
    .insert({
      user_id: user.id,
      title: "Nouvelle note",
      content: "",
    })
    .select("id")
    .single()

  if (error || !data) {
    throw new Error(error?.message || "Échec de création")
  }

  return { id: data.id }
}
