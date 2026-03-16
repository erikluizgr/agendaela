'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, Check, Instagram, Users, Bell, ArrowRight, Loader2 } from 'lucide-react'
import { completeOnboarding, loadOnboardingData } from '../actions'

const CONFETTI_COLORS = ['#B565A7', '#7C5CBF', '#F4A5C8', '#CC86BF', '#9B7ED4', '#FAC8DF']

export default function ConcluidoPage() {
  const router      = useRouter()
  const confettiRef = useRef<HTMLDivElement>(null)
  const [slug, setSlug]         = useState('')
  const [copied, setCopied]     = useState(false)
  const [completing, setCompleting] = useState(false)
  const [done, setDone]         = useState(false)

  // Carrega o slug
  useEffect(() => {
    loadOnboardingData().then(data => {
      if (data?.profile?.slug) setSlug(data.profile.slug)
    })
  }, [])

  // Confetti ao montar
  useEffect(() => {
    const container = confettiRef.current
    if (!container) return
    container.innerHTML = ''

    for (let i = 0; i < 64; i++) {
      const piece = document.createElement('div')
      const size  = Math.random() * 8 + 4
      const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)]
      const delay = Math.random() * 2.5
      const dur   = Math.random() * 1.5 + 2

      piece.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border-radius: ${Math.random() > 0.5 ? '50%' : '3px'};
        left: ${Math.random() * 100}%;
        top: -12px;
        opacity: 0;
        animation: confetti-fall ${dur}s ease-in ${delay}s both;
        transform: rotate(${Math.random() * 360}deg);
      `
      container.appendChild(piece)
    }

    return () => { if (container) container.innerHTML = '' }
  }, [])

  const publicLink = `agendaela.com.br/${slug}`

  const handleCopy = () => {
    navigator.clipboard.writeText(`https://${publicLink}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const handleFinish = async () => {
    setCompleting(true)
    await completeOnboarding()
    setDone(true)
    setCompleting(false)
    router.push('/dashboard')
  }

  const NEXT_STEPS = [
    {
      icon:  Instagram,
      color: '#E1306C',
      bg:    '#FDE8EF',
      title: 'Compartilhe no Instagram',
      desc:  'Cole seu link na bio e nos Stories. Suas seguidoras vão amar agendar direto com você!',
    },
    {
      icon:  Users,
      color: '#7C5CBF',
      bg:    '#EDE8FB',
      title: 'Adicione suas primeiras clientes',
      desc:  'Cadastre as clientes que você já atende para manter tudo organizado em um só lugar.',
    },
    {
      icon:  Bell,
      color: '#F59E0B',
      bg:    '#FEF3C7',
      title: 'Ative os lembretes automáticos',
      desc:  'Reduza faltas com lembretes por WhatsApp enviados 24h antes do agendamento.',
    },
  ]

  return (
    <div className="animate-fade-slide-in">
      {/* Área de confetti */}
      <div
        ref={confettiRef}
        className="fixed inset-x-0 top-0 h-screen pointer-events-none overflow-hidden z-50"
        aria-hidden
      />

      <div className="space-y-8">
        {/* Celebração */}
        <div className="text-center space-y-3 pt-2">
          <div className="animate-pop-in text-6xl select-none">🎉</div>
          <h1 className="text-2xl font-bold text-[#1A1A2E]">Tudo pronto!</h1>
          <p className="text-[#6B7280] text-base">
            Sua página de agendamento está no ar. Compartilhe seu link e comece a receber agendamentos agora mesmo!
          </p>
        </div>

        {/* Link público */}
        {slug && (
          <div className="rounded-2xl border-2 border-[#B565A7]/30 bg-gradient-to-br from-[#B565A7]/5 to-[#7C5CBF]/5 p-5 space-y-3">
            <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Seu link de agendamento</p>
            <div className="flex items-center gap-2">
              <span className="flex-1 text-sm font-medium text-[#1A1A2E] bg-white rounded-xl px-4 py-3 border border-gray-200 truncate">
                {publicLink}
              </span>
              <button
                onClick={handleCopy}
                className={[
                  'shrink-0 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all active:scale-95',
                  copied
                    ? 'bg-[#10B981] text-white'
                    : 'text-white',
                ].join(' ')}
                style={!copied ? { background: 'linear-gradient(135deg, #B565A7, #7C5CBF)' } : {}}
              >
                {copied ? <><Check size={15} /> Copiado!</> : <><Copy size={15} /> Copiar</>}
              </button>
            </div>
            <p className="text-xs text-[#6B7280]">
              Cole esse link na sua bio do Instagram, WhatsApp ou onde preferir ✨
            </p>
          </div>
        )}

        {/* Próximos passos */}
        <div>
          <p className="text-sm font-semibold text-[#1A1A2E] mb-4">Próximos passos recomendados</p>
          <div className="space-y-3">
            {NEXT_STEPS.map((step, i) => {
              const Icon = step.icon
              return (
                <div
                  key={i}
                  className="flex items-start gap-4 p-4 rounded-2xl bg-white border border-gray-100 shadow-sm"
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: step.bg }}
                  >
                    <Icon size={18} style={{ color: step.color }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#1A1A2E]">{step.title}</p>
                    <p className="text-xs text-[#6B7280] mt-0.5 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* CTA principal */}
        <div className="pt-2 pb-6">
          <button
            onClick={handleFinish}
            disabled={completing || done}
            className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl text-white font-bold text-lg transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed shadow-xl shadow-[#B565A7]/40"
            style={{ background: 'linear-gradient(135deg, #B565A7, #7C5CBF)' }}
          >
            {completing ? (
              <><Loader2 size={20} className="animate-spin" /> Carregando...</>
            ) : (
              <>Ir para minha agenda <ArrowRight size={20} /></>
            )}
          </button>
          <p className="text-center text-xs text-[#6B7280] mt-3">
            Você pode editar essas informações a qualquer momento nas configurações.
          </p>
        </div>
      </div>
    </div>
  )
}
