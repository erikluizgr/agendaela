/**
 * lib/plans.ts — Feature flags por plano + hook usePlan + componente PlanGate
 */
'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'

// ── Definição dos planos ──────────────────────────────────────────────────────

export type PlanId = 'trial' | 'solo' | 'studio' | 'clinica'

export interface PlanFeatures {
  label:               string
  price_monthly:       number
  price_annual:        number   // por mês, no plano anual
  professionals:       number   // -1 = ilimitado
  whatsapp_limit:      number   // -1 = ilimitado; 0 = sem WhatsApp
  ai_suggestions:      boolean
  advanced_reports:    boolean
  loyalty_program:     boolean
  white_label:         boolean
  api_access:          boolean
  support:             'email' | 'priority' | 'whatsapp'
}

export const PLANS: Record<PlanId, PlanFeatures> = {
  trial: {
    label:             'Trial',
    price_monthly:     0,
    price_annual:      0,
    professionals:     1,
    whatsapp_limit:    0,
    ai_suggestions:    false,
    advanced_reports:  false,
    loyalty_program:   false,
    white_label:       false,
    api_access:        false,
    support:           'email',
  },
  solo: {
    label:             'Solo',
    price_monthly:     59,
    price_annual:      49,   // R$49/mês × 12
    professionals:     1,
    whatsapp_limit:    100,
    ai_suggestions:    false,
    advanced_reports:  false,
    loyalty_program:   false,
    white_label:       false,
    api_access:        false,
    support:           'email',
  },
  studio: {
    label:             'Studio',
    price_monthly:     119,
    price_annual:      99,
    professionals:     3,
    whatsapp_limit:    -1,
    ai_suggestions:    true,
    advanced_reports:  true,
    loyalty_program:   true,
    white_label:       false,
    api_access:        false,
    support:           'priority',
  },
  clinica: {
    label:             'Clínica',
    price_monthly:     199,
    price_annual:      166,
    professionals:     -1,
    whatsapp_limit:    -1,
    ai_suggestions:    true,
    advanced_reports:  true,
    loyalty_program:   true,
    white_label:       true,
    api_access:        true,
    support:           'whatsapp',
  },
}

const PLAN_ORDER: PlanId[] = ['trial', 'solo', 'studio', 'clinica']

export function planRank(plan: PlanId): number {
  return PLAN_ORDER.indexOf(plan)
}

export function hasFeature(userPlan: PlanId, requiredPlan: PlanId): boolean {
  return planRank(userPlan) >= planRank(requiredPlan)
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function usePlan() {
  const [plan, setPlan] = useState<PlanId>('trial')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setLoading(false); return }
      supabase
        .from('profiles')
        .select('plan')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data?.plan) setPlan(data.plan as PlanId)
          setLoading(false)
        })
    })
  }, [])

  return {
    plan,
    features:   PLANS[plan],
    loading,
    can:        (feat: keyof PlanFeatures) => !!PLANS[plan][feat],
    hasAccess:  (requiredPlan: PlanId) => hasFeature(plan, requiredPlan),
  }
}

// ── PlanGate component ────────────────────────────────────────────────────────

import React from 'react'
import Link from 'next/link'
import { Lock } from 'lucide-react'

export function PlanGate({
  plan:     requiredPlan,
  children,
  fallback,
}: {
  plan:      PlanId
  children:  React.ReactNode
  fallback?: React.ReactNode
}) {
  const { plan: userPlan, loading } = usePlan()

  if (loading) return null
  if (hasFeature(userPlan, requiredPlan)) return <>{children}</>

  if (fallback) return <>{fallback}</>

  return (
    <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 rounded-xl border border-gray-200">
      <Lock size={14} className="text-gray-400 shrink-0" />
      <p className="text-sm text-gray-500">
        Disponível no plano{' '}
        <span className="font-semibold text-[#B565A7]">{PLANS[requiredPlan].label}</span>.{' '}
        <Link href="/precos" className="underline hover:text-[#B565A7]">Fazer upgrade →</Link>
      </p>
    </div>
  )
}
