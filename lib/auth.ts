import { randomUUID } from 'crypto'
import { createServerClient } from './supabase-server'
import { supabaseAdmin } from './db'
import type { User } from './db'

// Récupère l'utilisateur connecté via Supabase Auth
export async function getUser(): Promise<User | null> {
  try {
    const supabase = await createServerClient()
    
    const { data: { user: authUser }, error } = await supabase.auth.getUser()
    
    if (error) {
      console.error('[getUser] Erreur auth.getUser():', error.message)
      return null
    }
    
    if (!authUser) {
      console.log('[getUser] Aucun utilisateur authentifié')
      return null
    }

    console.log('[getUser] Utilisateur authentifié:', authUser.email)

    // Vérifie si l'utilisateur existe dans notre table users
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single()

    // Si l'utilisateur n'existe pas dans notre table, on le crée
    if (userError) {
      if (userError.code === 'PGRST116') {
        // Utilisateur n'existe pas, on le crée
        console.log('[getUser] Création du user dans la table users...')
        const { data: newUser, error: createError } = await supabaseAdmin
          .from('users')
          .insert({
            id: authUser.id,
            email: authUser.email!,
            role: 'free',
          })
          .select()
          .single()

        if (createError) {
          console.error('[getUser] Erreur lors de la création:', createError.message)
          return null
        }

        console.log('[getUser] Utilisateur créé avec succès')
        return newUser as User
      } else {
        // Autre erreur (table n'existe pas, etc.)
        console.error('[getUser] Erreur lors de la récupération:', userError.message, 'Code:', userError.code)
        return null
      }
    }

    if (!userData) {
      console.error('[getUser] userData est null malgré l\'absence d\'erreur')
      return null
    }

    console.log('[getUser] Utilisateur récupéré:', userData.email)
    return userData as User
  } catch (error: any) {
    console.error('[getUser] Exception non gérée:', error.message)
    return null
  }
}

// Vérifie si l'utilisateur a le rôle Pro
export async function isPro(): Promise<boolean> {
  const user = await getUser()
  return user?.role === 'pro'
}

// Fonction de connexion mock pour l'environnement de développement
// Crée ou récupère un utilisateur dans la table users
export async function mockLogin(email: string): Promise<User> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('mockLogin ne peut être utilisé qu\'en développement')
  }

  // Normalise l'email
  const normalizedEmail = email.toLowerCase().trim()

  // Vérifie si l'utilisateur existe déjà
  const { data: existingUser, error: fetchError } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('email', normalizedEmail)
    .maybeSingle()

  if (existingUser) {
    console.log('[mockLogin] Utilisateur existant trouvé:', normalizedEmail)
    return existingUser as User
  }

  // Crée un nouvel utilisateur
  // Génère un UUID v4 unique pour l'utilisateur
  const userId = randomUUID()

  const { data: newUser, error: createError } = await supabaseAdmin
    .from('users')
    .insert({
      id: userId,
      email: normalizedEmail,
      role: 'free',
    })
    .select()
    .single()

  if (createError) {
    console.error('[mockLogin] Erreur lors de la création:', createError.message)
    throw new Error(`Erreur lors de la création de l'utilisateur: ${createError.message}`)
  }

  console.log('[mockLogin] Nouvel utilisateur créé:', normalizedEmail)
  return newUser as User
}
