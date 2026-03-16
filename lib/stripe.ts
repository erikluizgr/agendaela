/**
 * lib/stripe.ts — Stripe server-side helpers
 * Nunca importar no client (contém secret key).
 */

import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-02-25.clover',
})

// ── Price IDs por plano ───────────────────────────────────────────────────────

export const PRICE_IDS: Record<string, { monthly: string; annual: string }> = {
  solo:    { monthly: process.env.STRIPE_PRICE_SOLO_MONTHLY!,    annual: process.env.STRIPE_PRICE_SOLO_ANNUAL!    },
  studio:  { monthly: process.env.STRIPE_PRICE_STUDIO_MONTHLY!,  annual: process.env.STRIPE_PRICE_STUDIO_ANNUAL!  },
  clinica: { monthly: process.env.STRIPE_PRICE_CLINICA_MONTHLY!, annual: process.env.STRIPE_PRICE_CLINICA_ANNUAL! },
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

// ── Checkout ──────────────────────────────────────────────────────────────────

export async function createCheckoutSession(
  profileId: string,
  planId:    string,
  billing:   'monthly' | 'annual' = 'monthly',
  email?:    string,
  customerId?: string
) {
  const priceId = PRICE_IDS[planId]?.[billing]
  if (!priceId) throw new Error(`Price ID não configurado para plano "${planId}" (${billing})`)

  const session = await stripe.checkout.sessions.create({
    mode:                 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url:          `${APP_URL}/dashboard?upgraded=true&plan=${planId}`,
    cancel_url:           `${APP_URL}/precos`,
    client_reference_id:  profileId,
    customer_email:       customerId ? undefined : email,
    customer:             customerId ?? undefined,
    allow_promotion_codes: true,
    subscription_data: {
      trial_period_days: 14,
      metadata: { profile_id: profileId, plan: planId },
    },
    metadata: { profile_id: profileId, plan: planId },
  })

  return session
}

// ── Customer Portal ───────────────────────────────────────────────────────────

export async function createPortalSession(customerId: string) {
  const session = await stripe.billingPortal.sessions.create({
    customer:   customerId,
    return_url: `${APP_URL}/dashboard/settings`,
  })
  return session
}
