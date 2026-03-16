/**
 * lib/zapi.ts
 * Integração com Z-API para envio de mensagens WhatsApp.
 * Todas as funções são server-only (chamadas de API routes / cron).
 */

import { createServiceClient } from '@/lib/supabase/service'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// ── Config ────────────────────────────────────────────────────────────────────

function zapiBase() {
  const instance = process.env.ZAPI_INSTANCE_ID
  const token    = process.env.ZAPI_TOKEN
  if (!instance || !token) throw new Error('Z-API não configurado (ZAPI_INSTANCE_ID / ZAPI_TOKEN)')
  return `https://api.z-api.io/instances/${instance}/token/${token}`
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Formata para padrão E.164 brasileiro: 55 + DDD + número (sem +).
 * Aceita qualquer formato de entrada.
 */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('55') && digits.length >= 12) return digits
  return `55${digits}`
}

// ── Core send ─────────────────────────────────────────────────────────────────

/**
 * Envia mensagem de texto via Z-API.
 * Faz 1 retry automático em caso de falha de rede.
 */
export async function sendMessage(phone: string, message: string): Promise<boolean> {
  const formatted = formatPhone(phone)
  const url       = `${zapiBase()}/send-text`
  const body      = JSON.stringify({ phone: formatted, message })

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(url, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      })

      if (res.ok) {
        console.log(`[zapi] ✓ Mensagem enviada para ${formatted}`)
        return true
      }

      const text = await res.text()
      console.warn(`[zapi] Tentativa ${attempt} falhou (${res.status}): ${text}`)
    } catch (err) {
      console.warn(`[zapi] Tentativa ${attempt} erro de rede:`, err)
    }

    if (attempt === 1) await sleep(2000)
  }

  console.error(`[zapi] ✗ Falha ao enviar para ${formatted} após 2 tentativas`)
  return false
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

// ── Mensagens específicas ─────────────────────────────────────────────────────

/**
 * Lembrete 24h antes do agendamento.
 * Marca reminder_sent = true após envio.
 */
export async function sendAppointmentReminder(appointmentId: string): Promise<boolean> {
  const supabase = createServiceClient()

  const { data: appt } = await supabase
    .from('appointments')
    .select(`
      id, starts_at,
      client:clients(full_name, phone),
      service:services(name),
      profile:profiles(full_name, business_name, slug)
    `)
    .eq('id', appointmentId)
    .single()

  if (!appt) {
    console.warn(`[zapi] Agendamento ${appointmentId} não encontrado`)
    return false
  }

  const client  = appt.client  as { full_name: string; phone: string | null } | null
  const service = appt.service as { name: string } | null
  const profile = appt.profile as { full_name: string; business_name: string | null; slug: string | null } | null

  if (!client?.phone) {
    console.warn(`[zapi] Cliente sem telefone — agendamento ${appointmentId}`)
    return false
  }

  const horario = format(parseISO(appt.starts_at), "HH:mm", { locale: ptBR })
  const nome    = client.full_name.split(' ')[0]
  const profissional = profile?.business_name ?? profile?.full_name ?? 'sua profissional'
  const link    = profile?.slug
    ? `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://agendaela.com.br'}/${profile.slug}`
    : ''

  const message = [
    `Olá, ${nome}! 👋`,
    ``,
    `Lembrando do seu agendamento *amanhã às ${horario}* para *${service?.name ?? 'seu serviço'}* com ${profissional}.`,
    ``,
    `Confirme respondendo *SIM* ou cancele respondendo *NÃO*.`,
    link ? `\n🔗 Reagendar: ${link}` : '',
  ].filter(l => l !== undefined).join('\n')

  const sent = await sendMessage(client.phone, message)

  if (sent) {
    await supabase
      .from('appointments')
      .update({ reminder_sent: true })
      .eq('id', appointmentId)
  }

  return sent
}

/**
 * Confirmação imediata após agendamento público.
 */
export async function sendBookingConfirmation(appointmentId: string): Promise<boolean> {
  const supabase = createServiceClient()

  const { data: appt } = await supabase
    .from('appointments')
    .select(`
      id, starts_at,
      client:clients(full_name, phone),
      service:services(name),
      profile:profiles(full_name, business_name, phone, address)
    `)
    .eq('id', appointmentId)
    .single()

  if (!appt) return false

  const client  = appt.client  as { full_name: string; phone: string | null } | null
  const service = appt.service as { name: string } | null
  const profile = appt.profile as {
    full_name: string; business_name: string | null
    phone: string | null; address: string | null
  } | null

  if (!client?.phone) return false

  const data    = format(parseISO(appt.starts_at), "d 'de' MMMM", { locale: ptBR })
  const horario = format(parseISO(appt.starts_at), "HH:mm")
  const nome    = client.full_name.split(' ')[0]
  const profissional = profile?.business_name ?? profile?.full_name ?? 'sua profissional'

  const message = [
    `✅ *Agendamento confirmado!*`,
    ``,
    `Olá, ${nome}! Seu agendamento foi marcado com sucesso.`,
    ``,
    `📋 *${service?.name ?? 'Serviço'}*`,
    `📅 ${data} às ${horario}`,
    `💆 Com ${profissional}`,
    profile?.address ? `📍 ${profile.address}` : '',
    ``,
    profile?.phone ? `Dúvidas? Fale conosco: ${profile.phone}` : '',
    ``,
    `Até logo! 😊`,
  ].filter(Boolean).join('\n')

  return sendMessage(client.phone, message)
}

/**
 * Mensagem de aniversário com desconto.
 */
export async function sendBirthdayMessage(
  clientId: string,
  discountPct = 10,
  customMessage?: string
): Promise<boolean> {
  const supabase = createServiceClient()

  const { data: client } = await supabase
    .from('clients')
    .select('full_name, phone, profile:profiles(business_name, full_name, slug)')
    .eq('id', clientId)
    .single()

  if (!client?.phone) return false

  const profile = client.profile as { business_name: string | null; full_name: string; slug: string | null } | null
  const nome    = client.full_name.split(' ')[0]
  const link    = profile?.slug
    ? `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://agendaela.com.br'}/${profile.slug}`
    : ''

  const message = customMessage
    ? customMessage
        .replace('{nome}', nome)
        .replace('{desconto}', String(discountPct))
        .replace('{link}', link)
    : [
        `🎂 *Feliz aniversário, ${nome}!*`,
        ``,
        `Que seu dia seja especial! Para comemorar, você ganhou *${discountPct}% de desconto* no seu próximo atendimento.`,
        link ? `\n👇 Agende agora e use seu desconto:\n${link}` : '',
        ``,
        `Com carinho, ${profile?.business_name ?? profile?.full_name ?? 'sua profissional'} 💜`,
      ].filter(Boolean).join('\n')

  return sendMessage(client.phone, message)
}
