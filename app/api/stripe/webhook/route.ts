import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { getSupabaseAdmin } from "@/lib/db"

let stripeClient: Stripe | null | undefined

function getStripeClient(): Stripe | null {
  if (stripeClient !== undefined) {
    return stripeClient
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY

  if (!stripeSecretKey) {
    const message = "[Stripe] STRIPE_SECRET_KEY environment variable is missing."
    if (process.env.NODE_ENV === "production") {
      console.error(message)
    } else {
      console.warn(message)
    }

    stripeClient = null
    return stripeClient
  }

  stripeClient = new Stripe(stripeSecretKey, {
    apiVersion: "2023-10-16",
  })

  return stripeClient
}

// POST: Reçoit les webhooks de Stripe
export async function POST(request: NextRequest) {
  const stripe = getStripeClient()
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!stripe || !webhookSecret) {
    console.error("[Stripe Webhook] Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET configuration.")
    return NextResponse.json(
      { error: "Configuration Stripe manquante" },
      { status: 500 }
    )
  }

  const body = await request.text()
  const signature = request.headers.get("stripe-signature")!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err: any) {
    console.error("Erreur webhook:", err.message)
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    )
  }

  // Traite l'événement
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.metadata?.user_id || session.client_reference_id

      if (userId) {
        const supabaseAdmin = getSupabaseAdmin()

        if (!supabaseAdmin) {
          console.error("[Stripe Webhook] Supabase admin client not configured")
          break
        }

        // Met à jour le rôle de l'utilisateur à "pro"
        await supabaseAdmin
          .from("users")
          .update({ role: "pro" })
          .eq("id", userId)

        console.log(`✅ Utilisateur ${userId} passé à Pro`)
      }
      break
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription
      const customerId = subscription.customer as string

      // Récupère l'email du customer
      const customer = await stripe.customers.retrieve(customerId)
      if ('email' in customer && customer.email) {
        const supabaseAdmin = getSupabaseAdmin()

        if (!supabaseAdmin) {
          console.error("[Stripe Webhook] Supabase admin client not configured")
          break
        }

        // Remet l'utilisateur en "free"
        await supabaseAdmin
          .from("users")
          .update({ role: "free" })
          .eq("email", customer.email)

        console.log(`❌ Utilisateur ${customer.email} repassé à Free`)
      }
      break
    }

    default:
      console.log(`Event non géré: ${event.type}`)
  }

  return NextResponse.json({ received: true })
}

