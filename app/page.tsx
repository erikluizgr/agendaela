'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Sparkles, CalendarDays, Bell, BarChart3, Check,
  ChevronDown, ChevronUp, MessageCircle, DollarSign,
  Clock, Star, ArrowRight, Menu, X,
} from 'lucide-react'

// ── Testimonials ──────────────────────────────────────────────────────────────

const TESTIMONIALS = [
  {
    name:     'Camila Ferreira',
    role:     'Manicure · São Paulo',
    avatar:   'CF',
    color:    '#B565A7',
    text:     'Antes eu perdia horas no WhatsApp confirmando agendamentos. Agora tudo é automático e minhas clientes adoram poder agendar pela madrugada!',
    stars:    5,
  },
  {
    name:     'Juliana Ramos',
    role:     'Esteticista · Belo Horizonte',
    avatar:   'JR',
    color:    '#7C5CBF',
    text:     'Em 2 semanas usando o AgendaEla, reduzi as faltas em 60%. Os lembretes automáticos de WhatsApp fizeram toda a diferença.',
    stars:    5,
  },
  {
    name:     'Fernanda Costa',
    role:     'Designer de Sobrancelhas · Rio de Janeiro',
    avatar:   'FC',
    color:    '#10B981',
    text:     'O relatório financeiro me mostrou que eu estava cobrando barato demais. Reajustei os preços e aumentei meu faturamento em 40%.',
    stars:    5,
  },
]

const PROBLEMS = [
  {
    icon:  <MessageCircle size={28} className="text-red-400" />,
    title: 'WhatsApp virando bagunça',
    desc:  'Mensagens perdidas, clientes perguntando disponibilidade, confirmações esquecidas. O atendimento toma mais tempo que o trabalho.',
  },
  {
    icon:  <Clock size={28} className="text-orange-400" />,
    title: 'Clientes que não aparecem',
    desc:  'Aquele horário bloqueado às 10h que a cliente simplesmente não veio. Tempo perdido, dinheiro jogado fora.',
  },
  {
    icon:  <DollarSign size={28} className="text-amber-400" />,
    title: 'Zero controle financeiro',
    desc:  'Quanto entrou esse mês? Qual serviço dá mais lucro? Sem resposta, impossível crescer com segurança.',
  },
]

const HOW_IT_WORKS = [
  { n: '01', title: 'Configure em 5 min',    desc: 'Cadastre seus serviços, horários e receba seu link personalizado de agendamento.' },
  { n: '02', title: 'Compartilhe o link',     desc: 'Cole na bio do Instagram, WhatsApp ou imprima o QR Code. Suas clientes agendam 24/7.' },
  { n: '03', title: 'Trabalhe sem preocupação', desc: 'Lembretes automáticos, pagamentos registrados, relatórios prontos. Você foca no atendimento.' },
]

const FEATURES = [
  { icon: <CalendarDays size={20} className="text-[#B565A7]" />, title: 'Agenda inteligente',        desc: 'Visualização semanal e diária. Arraste, clique e organize tudo em segundos.' },
  { icon: <Bell size={20} className="text-[#7C5CBF]" />,         title: 'Lembretes automáticos',     desc: 'WhatsApp 24h antes do horário. Fim das faltas sem aviso.' },
  { icon: <BarChart3 size={20} className="text-[#10B981]" />,    title: 'Relatórios financeiros',    desc: 'Faturamento, ticket médio, serviços mais populares. Tudo em um painel.' },
  { icon: <Star size={20} className="text-amber-500" />,         title: 'Perfil público bonito',     desc: 'Página de agendamento personalizada. Sua marca, seu link, suas clientes.' },
  { icon: <Sparkles size={20} className="text-pink-500" />,      title: 'IA para sugestões',         desc: 'Inteligência artificial sugere os melhores horários e identifica clientes em risco.' },
  { icon: <MessageCircle size={20} className="text-green-500" />, title: 'Aniversário automático',   desc: 'Mensagem personalizada com desconto no dia do aniversário da cliente.' },
]

const FAQS = [
  { q: 'Preciso de cartão para testar?',         a: 'Não. 14 dias de trial gratuito, sem cartão.' },
  { q: 'Minhas clientes precisam baixar algo?',  a: 'Não! Elas agendam pelo navegador, sem instalar nada.' },
  { q: 'Funciona para clínica com mais de uma profissional?', a: 'Sim! Os planos Studio e Clínica suportam múltiplas profissionais.' },
  { q: 'Como funciona o lembrete de WhatsApp?',  a: 'Via Z-API: você conecta seu próprio WhatsApp e as mensagens saem do seu número.' },
  { q: 'Posso cancelar quando quiser?',          a: 'Sim, sem multa. Você tem acesso até o fim do período pago.' },
]

export default function LandingPage() {
  const [mobileMenu, setMobileMenu] = useState(false)
  const [openFaq,    setOpenFaq]    = useState<number | null>(null)

  return (
    <div className="min-h-screen bg-white text-[#1A1A2E]">

      {/* ── NAV ──────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#B565A7]" />
            <span className="font-bold text-lg">AgendaEla</span>
          </Link>
          <div className="hidden sm:flex items-center gap-6 text-sm">
            <a href="#como-funciona" className="text-gray-500 hover:text-gray-900">Como funciona</a>
            <a href="#features" className="text-gray-500 hover:text-gray-900">Features</a>
            <Link href="/precos" className="text-gray-500 hover:text-gray-900">Preços</Link>
            <Link href="/login" className="text-gray-600 hover:text-gray-900">Entrar</Link>
            <Link href="/register"
              className="px-4 py-2 rounded-xl text-white text-sm font-semibold"
              style={{ background: 'linear-gradient(135deg, #B565A7, #7C5CBF)' }}>
              Começar grátis
            </Link>
          </div>
          <button onClick={() => setMobileMenu(v => !v)} className="sm:hidden p-2 rounded-lg hover:bg-gray-100">
            {mobileMenu ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        {mobileMenu && (
          <div className="sm:hidden border-t border-gray-100 px-4 py-3 space-y-2 bg-white">
            <Link href="/precos" className="block py-2 text-sm text-gray-600">Preços</Link>
            <Link href="/login" className="block py-2 text-sm text-gray-600">Entrar</Link>
            <Link href="/register"
              className="block py-2 px-4 rounded-xl text-white text-sm font-semibold text-center"
              style={{ background: 'linear-gradient(135deg, #B565A7, #7C5CBF)' }}>
              Começar grátis — 14 dias
            </Link>
          </div>
        )}
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 py-20 sm:py-32 grid sm:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 bg-[#B565A7]/10 text-[#B565A7] text-sm font-semibold px-3 py-1.5 rounded-full">
            <Sparkles size={14} /> 14 dias grátis · Sem cartão
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold leading-tight">
            Sua agenda no automático.<br />
            <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg, #B565A7, #7C5CBF)' }}>
              Suas clientes, nunca esquecidas.
            </span>
          </h1>
          <p className="text-lg text-gray-500 leading-relaxed">
            Link de agendamento online, lembretes automáticos por WhatsApp e controle financeiro em um só lugar. Para manicures, esteticistas, designers de sobrancelha e muito mais.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/register"
              className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-white font-bold text-base shadow-lg"
              style={{ background: 'linear-gradient(135deg, #B565A7, #7C5CBF)' }}
            >
              Começar grátis — 14 dias <ArrowRight size={18} />
            </Link>
            <a href="#como-funciona"
              className="flex items-center justify-center px-6 py-3.5 rounded-2xl border border-gray-200 font-semibold text-gray-700 hover:bg-gray-50">
              Ver como funciona
            </a>
          </div>
          <p className="text-xs text-gray-400">Sem cartão de crédito. Configure em 5 minutos.</p>
        </div>

        {/* App mockup */}
        <div className="relative hidden sm:block">
          <div className="absolute inset-0 bg-gradient-to-br from-[#B565A7]/20 to-[#7C5CBF]/20 rounded-3xl blur-3xl" />
          <div className="relative bg-white rounded-3xl border border-gray-100 shadow-2xl overflow-hidden p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-gray-800">Agenda — Segunda-feira</span>
              <span className="text-xs text-gray-400">3 atendimentos</span>
            </div>
            {[
              { time: '09:00', client: 'Ana Costa',     service: 'Manicure',       color: '#B565A7', status: 'done' },
              { time: '10:30', client: 'Maria Souza',   service: 'Pedicure',       color: '#7C5CBF', status: 'next' },
              { time: '14:00', client: 'Juliana Lima',  service: 'Sobrancelha',    color: '#10B981', status: '' },
            ].map(a => (
              <div key={a.time} className={`flex items-center gap-3 p-3 rounded-xl border ${a.status === 'next' ? 'border-[#B565A7]/30 bg-[#B565A7]/5' : 'border-gray-100'}`}>
                <div className="w-1 h-10 rounded-full shrink-0" style={{ backgroundColor: a.color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{a.client}</p>
                  <p className="text-xs text-gray-400">{a.service}</p>
                </div>
                <span className="text-xs font-semibold text-gray-500">{a.time}</span>
              </div>
            ))}
            <div className="bg-gradient-to-r from-[#B565A7]/10 to-[#7C5CBF]/10 rounded-xl p-3 flex items-center justify-between">
              <span className="text-xs text-gray-600">Faturamento hoje</span>
              <span className="text-sm font-bold text-[#B565A7]">R$ 210,00</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── PROBLEMAS ────────────────────────────────────────────────── */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-6xl mx-auto px-4 space-y-12">
          <div className="text-center">
            <h2 className="text-3xl font-bold">Você se identifica com isso?</h2>
            <p className="text-gray-500 mt-2">Profissionais de beleza enfrentam os mesmos problemas todo dia.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {PROBLEMS.map(p => (
              <div key={p.title} className="bg-white rounded-2xl border border-gray-100 p-6 space-y-3">
                {p.icon}
                <h3 className="font-bold text-gray-800">{p.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-lg font-semibold text-gray-700">
            O AgendaEla resolve os três. <Link href="/register" className="text-[#B565A7] underline">Experimente grátis →</Link>
          </p>
        </div>
      </section>

      {/* ── COMO FUNCIONA ─────────────────────────────────────────────── */}
      <section id="como-funciona" className="max-w-6xl mx-auto px-4 py-20 space-y-12">
        <h2 className="text-3xl font-bold text-center">Como funciona</h2>
        <div className="grid sm:grid-cols-3 gap-8">
          {HOW_IT_WORKS.map(step => (
            <div key={step.n} className="text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black text-white mx-auto"
                style={{ background: 'linear-gradient(135deg, #B565A7, #7C5CBF)' }}>
                {step.n}
              </div>
              <h3 className="font-bold text-gray-800">{step.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────────────────── */}
      <section id="features" className="bg-gray-50 py-20">
        <div className="max-w-6xl mx-auto px-4 space-y-12">
          <div className="text-center">
            <h2 className="text-3xl font-bold">Tudo que você precisa</h2>
            <p className="text-gray-500 mt-2">Em um só lugar, sem complicação.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(f => (
              <div key={f.title} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-2.5">
                <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center">{f.icon}</div>
                <p className="font-bold text-gray-800">{f.title}</p>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DEPOIMENTOS ───────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 py-20 space-y-12">
        <div className="text-center">
          <h2 className="text-3xl font-bold">O que nossas clientes dizem</h2>
        </div>
        <div className="grid sm:grid-cols-3 gap-6">
          {TESTIMONIALS.map(t => (
            <div key={t.name} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
              <div className="flex gap-0.5">
                {Array.from({ length: t.stars }).map((_, i) => (
                  <Star key={i} size={14} fill="#F59E0B" className="text-amber-400" />
                ))}
              </div>
              <p className="text-sm text-gray-600 leading-relaxed italic">"{t.text}"</p>
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ backgroundColor: t.color }}
                >
                  {t.avatar}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800">{t.name}</p>
                  <p className="text-xs text-gray-400">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── PREÇOS (resumido) ─────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-[#fdf6ff] to-[#f0eaff] py-20">
        <div className="max-w-2xl mx-auto px-4 text-center space-y-6">
          <h2 className="text-3xl font-bold">Preços simples e transparentes</h2>
          <p className="text-gray-500">A partir de R$59/mês. Planos para todos os tamanhos.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/register"
              className="px-8 py-3.5 rounded-2xl text-white font-bold shadow-lg"
              style={{ background: 'linear-gradient(135deg, #B565A7, #7C5CBF)' }}>
              Começar grátis — 14 dias
            </Link>
            <Link href="/precos"
              className="px-8 py-3.5 rounded-2xl border border-gray-200 font-semibold text-gray-700 hover:bg-white">
              Ver todos os planos
            </Link>
          </div>
          <p className="text-xs text-gray-400">Sem cartão de crédito · Cancele quando quiser</p>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────── */}
      <section className="max-w-2xl mx-auto px-4 py-20 space-y-4">
        <h2 className="text-2xl font-bold text-center mb-8">Perguntas frequentes</h2>
        {FAQS.map((faq, i) => (
          <div key={i} className="bg-gray-50 rounded-2xl overflow-hidden">
            <button
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
              className="w-full flex items-center justify-between px-5 py-4 text-left"
            >
              <span className="font-semibold text-sm text-gray-800">{faq.q}</span>
              {openFaq === i ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
            </button>
            {openFaq === i && (
              <div className="px-5 pb-4">
                <p className="text-sm text-gray-500">{faq.a}</p>
              </div>
            )}
          </div>
        ))}
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-100 py-10">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-[#B565A7]" />
            <span className="font-bold text-[#1A1A2E]">AgendaEla</span>
            <span className="text-gray-400 text-sm">© {new Date().getFullYear()}</span>
          </div>
          <div className="flex gap-5 text-sm text-gray-400">
            <Link href="/precos" className="hover:text-gray-700">Preços</Link>
            <Link href="/termos" className="hover:text-gray-700">Termos</Link>
            <Link href="/privacidade" className="hover:text-gray-700">Privacidade</Link>
            <a href="mailto:suporte@agendaela.com.br" className="hover:text-gray-700">Suporte</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
