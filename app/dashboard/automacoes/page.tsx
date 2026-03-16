'use client'

import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Bell, CheckCircle, Cake, Sun, MessageCircle,
  Users, Loader2, Send, AlertTriangle, Eye, EyeOff,
  Sparkles,
} from 'lucide-react'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Profile {
  id: string
  full_name: string
  business_name: string | null
  phone: string | null
  slug: string | null
  // automação
  whatsapp_reminders_enabled:    boolean
  whatsapp_confirmation_enabled: boolean
  whatsapp_birthday_enabled:     boolean
  daily_summary_enabled:         boolean
  daily_summary_time:            string
  birthday_discount_pct:         number
  birthday_custom_message:       string | null
}

interface ChurnClient {
  id:              string
  full_name:       string
  phone:           string | null
  last_appointment_at: string | null
  days_away:       number
  reactivation_msg: string
}

const DEFAULT_MSGS = {
  reminder: (name: string, horario: string, servico: string, profissional: string, link: string) =>
    `Olá, ${name}! 👋\n\nLembrando do seu agendamento *amanhã às ${horario}* para *${servico}* com ${profissional}.\n\nConfirme respondendo *SIM* ou cancele respondendo *NÃO*.\n\n🔗 Reagendar: ${link}`,

  confirmation: (name: string, data: string, horario: string, servico: string, profissional: string) =>
    `✅ *Agendamento confirmado!*\n\nOlá, ${name}! Seu agendamento foi marcado com sucesso.\n\n📋 *${servico}*\n📅 ${data} às ${horario}\n💆 Com ${profissional}\n\nAté logo! 😊`,

  birthday: (name: string, desconto: number, link: string) =>
    `🎂 *Feliz aniversário, ${name}!*\n\nQue seu dia seja especial! Para comemorar, você ganhou *${desconto}% de desconto* no seu próximo atendimento.\n\n👇 Agende agora:\n${link}`,
}

export default function AutomacoesPage() {
  const [profile,      setProfile]      = useState<Profile | null>(null)
  const [churnClients, setChurnClients] = useState<ChurnClient[]>([])
  const [loading,      setLoading]      = useState(true)
  const [loadingChurn, setLoadingChurn] = useState(false)
  const [saving,       setSaving]       = useState<string | null>(null)
  const [testSending,  setTestSending]  = useState<string | null>(null)
  const [testResult,   setTestResult]   = useState<{ key: string; ok: boolean } | null>(null)
  const [previews,     setPreviews]     = useState<Record<string, boolean>>({})

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, business_name, phone, slug, whatsapp_reminders_enabled, whatsapp_confirmation_enabled, whatsapp_birthday_enabled, daily_summary_enabled, daily_summary_time, birthday_discount_pct, birthday_custom_message')
        .eq('id', user.id)
        .single()

      if (data) setProfile(data as Profile)
      setLoading(false)
    }
    load()
  }, [])

  async function toggleSetting(key: keyof Profile, value: boolean | string | number) {
    if (!profile) return
    setSaving(String(key))
    const { error } = await supabase
      .from('profiles')
      .update({ [key]: value })
      .eq('id', profile.id)

    if (!error) setProfile(p => p ? { ...p, [key]: value } : p)
    setSaving(null)
  }

  async function sendTest(type: string) {
    if (!profile?.phone) {
      alert('Adicione seu telefone nas Configurações para testar.')
      return
    }
    setTestSending(type)
    try {
      const res = await fetch('/api/automations/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, phone: profile.phone }),
      })
      setTestResult({ key: type, ok: res.ok })
      setTimeout(() => setTestResult(null), 3000)
    } catch {
      setTestResult({ key: type, ok: false })
    }
    setTestSending(null)
  }

  async function loadChurnClients() {
    setLoadingChurn(true)
    try {
      const res  = await fetch('/api/automations/churn')
      const data = await res.json()
      setChurnClients(data.clients ?? [])
    } catch {
      /* ignore */
    }
    setLoadingChurn(false)
  }

  useEffect(() => { loadChurnClients() }, [])

  function openWhatsApp(client: ChurnClient) {
    if (!client.phone) return
    const phone = client.phone.replace(/\D/g, '')
    const br    = phone.startsWith('55') ? phone : `55${phone}`
    const msg   = encodeURIComponent(client.reactivation_msg)
    window.open(`https://wa.me/${br}?text=${msg}`, '_blank')
  }

  const link = profile?.slug
    ? `${typeof window !== 'undefined' ? window.location.origin : 'https://agendaela.com.br'}/${profile.slug}`
    : 'seu-link'

  const togglePreview = (key: string) =>
    setPreviews(p => ({ ...p, [key]: !p[key] }))

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={28} className="animate-spin text-[#B565A7]" />
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Automações</h1>
        <p className="text-sm text-gray-500 mt-0.5">Configure mensagens automáticas via WhatsApp</p>
      </div>

      {!profile?.phone && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
          <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-700">
            Adicione seu número de WhatsApp nas{' '}
            <a href="/dashboard/settings" className="font-semibold underline">Configurações</a>{' '}
            para ativar as automações.
          </p>
        </div>
      )}

      {/* ── Lembrete 24h ─────────────────────────────────────────────── */}
      <AutoCard
        icon={<Bell size={18} className="text-[#B565A7]" />}
        title="Lembrete automático 24h antes"
        desc="Envia mensagem no dia anterior ao agendamento pedindo confirmação."
        enabled={!!profile?.whatsapp_reminders_enabled}
        saving={saving === 'whatsapp_reminders_enabled'}
        onToggle={v => toggleSetting('whatsapp_reminders_enabled', v)}
        onTest={() => sendTest('reminder')}
        testSending={testSending === 'reminder'}
        testResult={testResult?.key === 'reminder' ? testResult.ok : null}
        showPreview={!!previews.reminder}
        onTogglePreview={() => togglePreview('reminder')}
        preview={DEFAULT_MSGS.reminder(
          profile?.full_name.split(' ')[0] ?? 'Maria',
          '14:00', 'Manicure', profile?.business_name ?? 'Studio da Maria', link
        )}
      />

      {/* ── Confirmação imediata ──────────────────────────────────────── */}
      <AutoCard
        icon={<CheckCircle size={18} className="text-[#10B981]" />}
        title="Confirmação automática ao agendar"
        desc="Envia mensagem imediatamente após um novo agendamento ser feito."
        enabled={!!profile?.whatsapp_confirmation_enabled}
        saving={saving === 'whatsapp_confirmation_enabled'}
        onToggle={v => toggleSetting('whatsapp_confirmation_enabled', v)}
        onTest={() => sendTest('confirmation')}
        testSending={testSending === 'confirmation'}
        testResult={testResult?.key === 'confirmation' ? testResult.ok : null}
        showPreview={!!previews.confirmation}
        onTogglePreview={() => togglePreview('confirmation')}
        preview={DEFAULT_MSGS.confirmation(
          'Maria', '15 de março', '14:00', 'Manicure', profile?.business_name ?? 'Studio da Maria'
        )}
      />

      {/* ── Aniversário ───────────────────────────────────────────────── */}
      <AutoCard
        icon={<Cake size={18} className="text-pink-500" />}
        title="Mensagem de aniversário"
        desc="Envia mensagem carinhosa no aniversário da cliente com desconto especial."
        enabled={!!profile?.whatsapp_birthday_enabled}
        saving={saving === 'whatsapp_birthday_enabled'}
        onToggle={v => toggleSetting('whatsapp_birthday_enabled', v)}
        onTest={() => sendTest('birthday')}
        testSending={testSending === 'birthday'}
        testResult={testResult?.key === 'birthday' ? testResult.ok : null}
        showPreview={!!previews.birthday}
        onTogglePreview={() => togglePreview('birthday')}
        preview={DEFAULT_MSGS.birthday('Maria', profile?.birthday_discount_pct ?? 10, link)}
      >
        {/* Desconto customizável */}
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100">
          <label className="text-xs font-semibold text-gray-500 whitespace-nowrap">Desconto:</label>
          <select
            value={profile?.birthday_discount_pct ?? 10}
            onChange={e => toggleSetting('birthday_discount_pct', Number(e.target.value))}
            className="text-xs px-2 py-1 border border-gray-200 rounded-lg text-gray-700 focus:outline-none"
          >
            {[5, 10, 15, 20, 25].map(v => (
              <option key={v} value={v}>{v}%</option>
            ))}
          </select>
        </div>
      </AutoCard>

      {/* ── Resumo diário ─────────────────────────────────────────────── */}
      <AutoCard
        icon={<Sun size={18} className="text-amber-500" />}
        title="Resumo diário pela manhã"
        desc="Receba um resumo dos seus atendimentos do dia direto no WhatsApp."
        enabled={!!profile?.daily_summary_enabled}
        saving={saving === 'daily_summary_enabled'}
        onToggle={v => toggleSetting('daily_summary_enabled', v)}
        onTest={() => sendTest('daily_summary')}
        testSending={testSending === 'daily_summary'}
        testResult={testResult?.key === 'daily_summary' ? testResult.ok : null}
        showPreview={!!previews.daily}
        onTogglePreview={() => togglePreview('daily')}
        preview={`☀️ Bom dia, ${profile?.full_name.split(' ')[0] ?? 'Maria'}!\n\nHoje você tem *3 atendimentos*.\n💰 Faturamento previsto: *R$ 280,00*\n\n🕐 Primeiro atendimento:\n   09:00 — Ana Costa — Manicure\n\nTenha um ótimo dia! 💜`}
      >
        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100">
          <label className="text-xs font-semibold text-gray-500">Horário de envio:</label>
          <input
            type="time"
            value={profile?.daily_summary_time ?? '07:00'}
            onChange={e => toggleSetting('daily_summary_time', e.target.value)}
            className="text-xs px-2 py-1 border border-gray-200 rounded-lg text-gray-700 focus:outline-none"
          />
        </div>
      </AutoCard>

      {/* ── Clientes em risco ────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-[#7C5CBF]" />
            <div>
              <h2 className="text-sm font-bold text-gray-700">Clientes em risco de perda</h2>
              <p className="text-xs text-gray-400">Sem visitas há mais de 30 dias</p>
            </div>
          </div>
          <button
            onClick={loadChurnClients}
            disabled={loadingChurn}
            className="text-xs text-[#B565A7] font-semibold hover:underline disabled:opacity-50"
          >
            {loadingChurn ? <Loader2 size={12} className="animate-spin inline" /> : 'Atualizar'}
          </button>
        </div>

        {loadingChurn ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={20} className="animate-spin text-[#B565A7]" />
          </div>
        ) : churnClients.length === 0 ? (
          <div className="text-center py-8">
            <Sparkles size={28} className="text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Nenhum cliente em risco. Ótimo trabalho! 🎉</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {churnClients.map(c => (
              <div key={c.id} className="flex items-center justify-between px-5 py-3.5 gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{c.full_name}</p>
                  <p className="text-xs text-gray-400">
                    Última visita: {c.last_appointment_at
                      ? format(parseISO(c.last_appointment_at), "d 'de' MMM", { locale: ptBR })
                      : 'nunca'
                    } ({c.days_away} dias atrás)
                  </p>
                </div>
                {c.phone && (
                  <button
                    onClick={() => openWhatsApp(c)}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-500 text-white text-xs font-semibold hover:bg-green-600 transition-colors"
                  >
                    <MessageCircle size={12} /> Reativar
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── AutoCard ──────────────────────────────────────────────────────────────────

function AutoCard({
  icon, title, desc, enabled, saving, onToggle,
  onTest, testSending, testResult,
  showPreview, onTogglePreview, preview, children,
}: {
  icon:            React.ReactNode
  title:           string
  desc:            string
  enabled:         boolean
  saving:          boolean
  onToggle:        (v: boolean) => void
  onTest:          () => void
  testSending:     boolean
  testResult:      boolean | null
  showPreview:     boolean
  onTogglePreview: () => void
  preview:         string
  children?:       React.ReactNode
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center shrink-0 mt-0.5">
            {icon}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-800">{title}</p>
            <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{desc}</p>
          </div>
        </div>
        <Toggle enabled={enabled} loading={saving} onToggle={onToggle} />
      </div>

      {children}

      {/* Actions */}
      <div className="flex items-center gap-2 mt-4">
        <button
          onClick={onTogglePreview}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 font-medium"
        >
          {showPreview ? <EyeOff size={12} /> : <Eye size={12} />}
          {showPreview ? 'Ocultar preview' : 'Ver preview'}
        </button>

        {enabled && (
          <button
            onClick={onTest}
            disabled={testSending}
            className="flex items-center gap-1.5 ml-auto text-xs font-semibold px-3 py-1.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {testSending
              ? <Loader2 size={11} className="animate-spin" />
              : testResult !== null
              ? testResult ? '✓ Enviado!' : '✗ Falhou'
              : <><Send size={11} /> Testar agora</>
            }
          </button>
        )}
      </div>

      {showPreview && (
        <div className="mt-3 bg-[#DCF8C6] rounded-2xl rounded-tl-sm px-4 py-3 max-w-xs">
          <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">{preview}</p>
        </div>
      )}
    </div>
  )
}

function Toggle({ enabled, loading, onToggle }: {
  enabled: boolean; loading: boolean; onToggle: (v: boolean) => void
}) {
  return (
    <button
      onClick={() => onToggle(!enabled)}
      disabled={loading}
      className={[
        'w-11 h-6 rounded-full relative transition-colors duration-300 shrink-0 disabled:opacity-60',
        enabled ? 'bg-[#B565A7]' : 'bg-gray-200',
      ].join(' ')}
    >
      <span className={[
        'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-300',
        enabled ? 'left-5' : 'left-0.5',
      ].join(' ')} />
      {loading && (
        <Loader2 size={10} className="absolute inset-0 m-auto text-white animate-spin" />
      )}
    </button>
  )
}
