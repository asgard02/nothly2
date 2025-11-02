import { NextRequest, NextResponse } from "next/server"
import { getUser } from "@/lib/auth"

// POST: Checkout Stripe (désactivé en développement)
export async function POST(request: NextRequest) {
  const user = await getUser()
  
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  // Si déjà Pro, redirige vers le dashboard
  if (user.role === "pro") {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  // TODO: Intégrer Stripe en production
  // Pour l'instant, redirige vers la page des tarifs
  return NextResponse.redirect(new URL("/pricing", request.url))

  /*
  // VERSION PRODUCTION AVEC STRIPE (décommentez et configurez)
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2024-12-18.acacia",
  })

  try {
    const session = await stripe.checkout.sessions.create({
      customer_email: user.email,
      client_reference_id: user.id,
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID_PRO!,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
      metadata: {
        user_id: user.id,
      },
    })

    return NextResponse.redirect(session.url!)
  } catch (error: any) {
    console.error("Erreur Stripe Checkout:", error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
  */
}

