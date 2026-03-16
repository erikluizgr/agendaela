'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Check, X, Sparkles, ChevronDown, ChevronUp, Zap, Shield, Clock,
} from 'lucide-react'
import { PLANS, type PlanId } from '@/lib/plans'

// ── Plan display data ─────────────────────────────────────────────────────────

const PLAN_DISPLAY: Record<string, {
  id:       string
  color:    string
  bg:       string
  popular:  boolean
  features: string[]
}> = {
  solo: {
    id:      'solo',
    color:   '#B565A7',
    bg:      'from-[#B565A7] to-[#7C5CBF]',
    popular: false,
    features: [
      '1 profissional',
      'Agenda ilimitada',
      'Link público de agendamento',
      '100 lembretes WhatsApp/mês',
      'Relatórios básicos',
      'Suporte por e-mail',
    ],
  },
  studio: {
    id:      'studio',
    color:   '#7C5CBF',
    bg:      'from-[#7C5CBF] to-[#5B3FA6]',
    popular: true,
    features: [
      'Até 3 profissionais',
      'Agenda ilimitada',
      'Link público de agendamento',
      'Lembretes WhatsApp ilimitados',
      'IA para sugestões de horário',
      'Relatórios avançados',
      'Programa de fidelidade',
      'Suporte prioritário',
    ],
  },
  clinica: {
    id:      'clinica',
    color:   '#1A1A2E',
    bg:      'from-[#1A1A2E] to-[#2D2D4E]',
    popular: false,
    features: [
      'Profissionais ilimitados',
      'Tudo do Studio',
      'Marca branca no link público',
      'API de integração',
      'Onboarding personalizado',
      'Suporte via WhatsApp',
    ],
  },
}

const FAQS = [
  {
    q: 'Preciso de cartão de crédito para o trial?',
    a: 'Não! Os 14 dias de trial são completamente gratuitos e sem necessidade de cartão. Você só paga se decidir continuar.',
  },
  {
    q: 'Posso cancelar a qualquer momento?',
    a: 'Sim, sem multa e sem burocracia. Você pode cancelar diretamente pelo portal de assinatura e continua tendo acesso até o fim do período pago.',
  },
  {
    q: 'O que acontece com meus dados se eu cancelar?',
    a: 'Seus dados ficam armazenados por 30 dias após o cancelamento. Dentro desse prazo, você pode exportar tudo ou reativar sua conta.',
  },
  {
    q: 'Posso mudar de plano depois?',
    a: 'Sim! Você pode fazer upgrade ou downgrade a qualquer momento. A diferença de valor é calculada proporcionalmente.',
  },
  {
    q: 'Como funciona o plano anual?',
    a: 'No plano anual você paga antecipado por 12 meses e ganha o equivalente a 2 meses grátis. O desconto é aplicado automaticamente no checkout.',
  },
]

export default function PrecosPage() {
  const router  = useRouter()
  const [billing,  setBilling]  = useState<'monthly' | 'annual'>('monthly')
  const [loading,  setLoading]  = useState<string | null>(null)
  const [openFaq,  setOpenFaq]  = useState<number | null>(null)

  async function handleCheckout(planId: string) {
    setLoading(planId)
    try {
      const res  = await fetch('/api/stripe/checkout', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ plan: planId, billing }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        // Não logado — vai para cadastro
        router.push(`/register?plan=${planId}`)
      }
    } catch {
      router.push(`/register?plan=${planId}`)
    }
    setLoading(null)
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA]">

      {/* Nav */}
      <header className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <Link href="/" className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#B565A7]" />
          <span className="font-bold text-[#1A1A2E]">AgendaEla</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900">Entrar</Link>
          <Link href="/register" className="text-sm px-4 py-2 rounded-xl text-white font-semibold"
            style={{ background: 'linear-gradient(135deg, #B565A7, #7C5CBF)' }}>
            Começar grátis
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-12 space-y-20">

        {/* Hero */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl sm:text-5xl font-bold text-[#1A1A2E]">
            Preço simples,<br />resultado real
          </h1>
          <p className="text-lg text-gray-500 max-w-xl mx-auto">
            14 dias grátis em qualquer plano. Sem cartão de crédito para começar.
          </p>

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-1 bg-gray-100 rounded-2xl p-1 mt-2">
            <button
              onClick={() => setBilling('monthly')}
              className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
                billing === 'monthly' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
              }`}
            >
              Mensal
            </button>
            <button
              onClick={() => setBilling('annual')}
              className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5 ${
                billing === 'annual' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
              }`}
            >
              Anual
              <span className="text-xs font-bold text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full">
                -2 meses
              </span>
            </button>
          </div>
        </div>

        {/* Plans */}
        <div className="grid sm:grid-cols-3 gap-6 items-start">
          {(['solo', 'studio', 'clinica'] as PlanId[]).map(id => {
            const display = PLAN_DISPLAY[id]
            const plan    = PLANS[id]
            const price   = billing === 'monthly' ? plan.price_monthly : plan.price_annual

            return (
              <div
                key={id}
                className={`relative bg-white rounded-3xl border shadow-sm overflow-hidden flex flex-col ${
                  display.popular
                    ? 'border-[#7C5CBF] ring-2 ring-[#7C5CBF]/20 scale-[1.02]'
                    : 'border-gray-100'
                }`}
              >
                {display.popular && (
                  <div className="bg-gradient-to-r from-[#7C5CBF] to-[#B565A7] text-white text-xs font-bold text-center py-1.5 tracking-wide uppercase">
                    ⭐ Mais popular
                  </div>
                )}

                <div className="p-7 flex-1 space-y-5">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400">{plan.label}</p>
                    <div className="mt-2 flex items-end gap-1">
                      <span className="text-4xl font-bold text-[#1A1A2E]">R${price}</span>
                      <span className="text-gray-400 mb-1">/mês</span>
                    </div>
                    {billing === 'annual' && (
                      <p className="text-xs text-green-600 font-medium mt-0.5">
                        Cobrado R${price * 12}/ano · Economia de R${(plan.price_monthly - price) * 12}
                      </p>
                    )}
                  </div>

                  <ul className="space-y-2.5">
                    {display.features.map(f => (
                      <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                        <Check size={15} className="text-[#10B981] shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="px-7 pb-7">
                  <button
                    onClick={() => handleCheckout(id)}
                    disabled={loading === id}
                    className={`w-full py-3.5 rounded-2xl text-white font-bold shadow-sm disabled:opacity-60 transition-opacity`}
                    style={{ background: `linear-gradient(135deg, ${display.color}, ${display.color}CC)` }}
                  >
                    {loading === id ? 'Carregando...' : 'Começar 14 dias grátis'}
                  </button>
                  <p className="text-center text-xs text-gray-400 mt-2">Sem cartão de crédito</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Garantias */}
        <div className="grid sm:grid-cols-3 gap-6 text-center">
          {[
            { icon: <Zap size={22} className="text-[#B565A7] mx-auto" />,   title: 'Setup em 5 minutos', desc: 'Seu link de agendamento no ar ainda hoje, sem precisar de ajuda técnica.' },
            { icon: <Shield size={22} className="text-[#10B981] mx-auto" />, title: 'Dados protegidos', desc: 'Seus dados e os das suas clientes são armazenados com segurança no Brasil.' },
            { icon: <Clock size={22} className="text-amber-500 mx-auto" />,  title: 'Cancele quando quiser', desc: 'Sem fidelidade, sem multa. Cancele a qualquer momento com 1 clique.' },
          ].map(g => (
            <div key={g.title} className="bg-white rounded-2xl border border-gray-100 p-6 space-y-2">
              {g.icon}
              <p className="font-bold text-gray-800">{g.title}</p>
              <p className="text-sm text-gray-400">{g.desc}</p>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto space-y-3">
          <h2 className="text-2xl font-bold text-center text-[#1A1A2E] mb-8">Perguntas frequentes</h2>
          {FAQS.map((faq, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-left"
              >
                <span className="font-semibold text-gray-800 text-sm">{faq.q}</span>
                {openFaq === i
                  ? <ChevronUp size={16} className="text-gray-400 shrink-0" />
                  : <ChevronDown size={16} className="text-gray-400 shrink-0" />
                }
              </button>
              {openFaq === i && (
                <div className="px-5 pb-4">
                  <p className="text-sm text-gray-500 leading-relaxed">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>

      </main>

      <footer className="text-center py-8 text-sm text-gray-400 border-t border-gray-100 mt-12">
        <div className="flex items-center justify-center gap-1.5 mb-3">
          <Sparkles size={14} className="text-[#B565A7]" />
          <span className="font-semibold text-[#1A1A2E]">AgendaEla</span>
        </div>
        <div className="flex justify-center gap-4 text-xs">
          <Link href="/termos" className="hover:text-gray-600">Termos de uso</Link>
          <Link href="/privacidade" className="hover:text-gray-600">Privacidade</Link>
          <a href="mailto:suporte@agendaela.com.br" className="hover:text-gray-600">Suporte</a>
        </div>
      </footer>
    </div>
  )
}
