import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase/service'
import type Stripe from 'stripe'

export const runtime = 'nodejs'

// Next.js App Router — desabilita body parser para ler raw body
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const sig     = request.headers.get('stripe-signature')

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('[stripe/webhook] Assinatura inválida:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createServiceClient()

  console.log(`[stripe/webhook] Evento: ${event.type}`)

  switch (event.type) {

    // ── Checkout concluído → ativa plano ────────────────────────────────────
    case 'checkout.session.completed': {
      const session    = event.data.object as Stripe.Checkout.Session
      const profileId  = session.metadata?.profile_id ?? session.client_reference_id
      const plan       = session.metadata?.plan
      const customerId = session.customer as string | null

      if (!profileId || !plan) {
        console.warn('[stripe/webhook] checkout.session.completed sem profileId/plan')
        break
      }

      await supabase
        .from('profiles')
        .update({
          plan,
          stripe_customer_id:     customerId,
          stripe_subscription_id: session.subscription as string | null,
          trial_ends_at:          null,
        })
        .eq('id', profileId)

      console.log(`[stripe/webhook] Plano ${plan} ativado para profile ${profileId}`)
      break
    }

    // ── Assinatura atualizada (upgrade/downgrade) ────────────────────────────
    case 'customer.subscription.updated': {
      const sub        = event.data.object as Stripe.Subscription
      const customerId = sub.customer as string
      const plan       = sub.metadata?.plan

      if (!plan) break

      await supabase
        .from('profiles')
        .update({ plan, stripe_subscription_id: sub.id })
        .eq('stripe_customer_id', customerId)

      console.log(`[stripe/webhook] Plano atualizado para ${plan} (customer ${customerId})`)
      break
    }

    // ── Assinatura cancelada → rebaixa para trial ───────────────────────────
    case 'customer.subscription.deleted': {
      const sub        = event.data.object as Stripe.Subscription
      const customerId = sub.customer as string

      await supabase
        .from('profiles')
        .update({ plan: 'trial', stripe_subscription_id: null })
        .eq('stripe_customer_id', customerId)

      console.log(`[stripe/webhook] Assinatura cancelada — rebaixado para trial (customer ${customerId})`)
      break
    }

    // ── Pagamento falhou → notifica ─────────────────────────────────────────
    case 'invoice.payment_failed': {
      const invoice    = event.data.object as Stripe.Invoice
      const customerId = invoice.customer as string

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, phone')
        .eq('stripe_customer_id', customerId)
        .single()

      console.warn(`[stripe/webhook] Pagamento falhou para customer ${customerId}`)

      // Aqui você pode enviar WhatsApp/e-mail de cobrança falha
      // Ex: await sendMessage(profile?.phone, 'Ops! Seu pagamento falhou...')

      break
    }

    default:
      console.log(`[stripe/webhook] Evento ignorado: ${event.type}`)
  }

  return NextResponse.json({ received: true })
}
