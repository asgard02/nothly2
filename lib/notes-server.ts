import { createServerClient } from "@/lib/supabase-server"
import { createClient } from "@supabase/supabase-js"

// Client admin Supabase (avec service_role pour contourner RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

/**
 * Crée une nouvelle note côté serveur
 * @returns L'ID de la note créée
 * @throws Error si l'utilisateur n'est pas authentifié ou si la création échoue
 */
export async function createNote(): Promise<{ id: string }> {
  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    throw new Error("Non authentifié")
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
