/**
 * lib/ai.ts
 * Funções de IA usando OpenAI — server-only.
 */

import OpenAI from 'openai'
import { createServiceClient } from '@/lib/supabase/service'
import { format, subDays, startOfDay, endOfDay, addDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'

function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY não configurada')
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

// ── Tipos públicos ────────────────────────────────────────────────────────────

export interface SlotSuggestion {
  date:   string   // 'yyyy-MM-dd'
  time:   string   // 'HH:mm'
  reason: string
}

export interface ChurnClient {
  id:              string
  full_name:       string
  phone:           string | null
  last_visit:      string | null
  days_away:       number
  reactivation_msg: string
}

// ── suggestAvailableSlots ─────────────────────────────────────────────────────

export async function suggestAvailableSlots(
  profileId: string,
  serviceId: string
): Promise<SlotSuggestion[]> {
  const supabase = createServiceClient()

  // Fetch service + working hours + next 7 days appointments
  const today    = new Date()
  const weekEnd  = addDays(today, 7)

  const [{ data: service }, { data: workingHours }, { data: appointments }] = await Promise.all([
    supabase.from('services').select('name, duration_minutes').eq('id', serviceId).single(),
    supabase.from('working_hours').select('*').eq('profile_id', profileId).eq('is_active', true),
    supabase
      .from('appointments')
      .select('starts_at, ends_at, status')
      .eq('profile_id', profileId)
      .gte('starts_at', today.toISOString())
      .lte('starts_at', weekEnd.toISOString())
      .in('status', ['confirmed', 'completed']),
  ])

  if (!service || !workingHours) return []

  const openai = getOpenAI()

  const prompt = `
Você é um assistente de agenda para profissionais de beleza.

Serviço a agendar: ${service.name} (duração: ${service.duration_minutes} minutos)

Horários de trabalho configurados:
${JSON.stringify(workingHours, null, 2)}

Agendamentos já existentes (próximos 7 dias):
${JSON.stringify(appointments, null, 2)}

Hoje é: ${format(today, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}

Sugira os 3 melhores horários disponíveis para este serviço nos próximos 7 dias.
Prefira:
- Horários que completam "buracos" na agenda (slots entre agendamentos)
- Horários populares (manhã: 9h-11h, tarde: 14h-16h)
- Evite deixar a agenda fragmentada

Responda APENAS com JSON válido (sem texto extra):
[
  { "date": "yyyy-MM-dd", "time": "HH:mm", "reason": "breve justificativa em português" },
  { "date": "yyyy-MM-dd", "time": "HH:mm", "reason": "..." },
  { "date": "yyyy-MM-dd", "time": "HH:mm", "reason": "..." }
]`

  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 400,
    })

    const text = res.choices[0]?.message?.content ?? '[]'
    const json = text.match(/\[[\s\S]*\]/)?.[0] ?? '[]'
    return JSON.parse(json) as SlotSuggestion[]
  } catch (err) {
    console.error('[ai] suggestAvailableSlots error:', err)
    return []
  }
}

// ── predictChurnRisk ──────────────────────────────────────────────────────────

export async function predictChurnRisk(profileId: string): Promise<ChurnClient[]> {
  const supabase  = createServiceClient()
  const threshold = subDays(new Date(), 30)

  const { data: clients } = await supabase
    .from('clients')
    .select('id, full_name, phone, last_appointment_at, total_appointments')
    .eq('profile_id', profileId)
    .lt('last_appointment_at', threshold.toISOString())
    .order('last_appointment_at', { ascending: true })
    .limit(20)

  if (!clients || clients.length === 0) return []

  // Get profile slug for the reactivation link
  const { data: profile } = await supabase
    .from('profiles')
    .select('slug, business_name, full_name')
    .eq('id', profileId)
    .single()

  const link = profile?.slug
    ? `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://agendaela.com.br'}/${profile.slug}`
    : ''

  const profissional = profile?.business_name ?? profile?.full_name ?? 'sua profissional'

  const openai = getOpenAI()

  // Generate personalized reactivation messages in batch
  const clientsInfo = clients.map(c => ({
    name:        c.full_name.split(' ')[0],
    days_away:   Math.floor((Date.now() - new Date(c.last_appointment_at ?? 0).getTime()) / 86400000),
    total_visits: c.total_appointments,
  }))

  const prompt = `
Gere mensagens de reativação personalizadas para clientes de um salão de beleza que não visitam há algum tempo.
Profissional: ${profissional}
Link de agendamento: ${link}

Clientes (em ordem):
${clientsInfo.map((c, i) => `${i + 1}. ${c.name}, ausente há ${c.days_away} dias, ${c.total_visits} visitas totais`).join('\n')}

Para cada cliente, gere uma mensagem curta (máx 3 linhas) carinhosa e personalizada.
Mencione saudade, convite para voltar e o link.

Responda APENAS com JSON:
["mensagem1", "mensagem2", ...]`

  let messages: string[] = clients.map(c =>
    `Olá, ${c.full_name.split(' ')[0]}! Sentimos sua falta! 💜 Que tal marcar um horário? ${link}`
  )

  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 600,
    })
    const text = res.choices[0]?.message?.content ?? '[]'
    const json = text.match(/\[[\s\S]*\]/)?.[0] ?? '[]'
    const parsed = JSON.parse(json)
    if (Array.isArray(parsed)) messages = parsed
  } catch (err) {
    console.error('[ai] predictChurnRisk messages error:', err)
  }

  return clients.map((c, i) => ({
    id:              c.id,
    full_name:       c.full_name,
    phone:           c.phone,
    last_visit:      c.last_appointment_at,
    days_away:       Math.floor((Date.now() - new Date(c.last_appointment_at ?? 0).getTime()) / 86400000),
    reactivation_msg: messages[i] ?? messages[0],
  }))
}

// ── generateBioSuggestion ─────────────────────────────────────────────────────

export async function generateBioSuggestion(services: string[], city: string): Promise<string> {
  const openai = getOpenAI()

  const prompt = `
Crie uma bio curta e atrativa (máx 160 caracteres) para o perfil público de uma profissional de beleza.

Serviços que ela oferece: ${services.join(', ')}
Cidade: ${city}

A bio deve:
- Ser calorosa e profissional
- Mencionar os serviços principais
- Transmitir confiança
- Usar 1-2 emojis no máximo
- Ter até 160 caracteres

Responda APENAS com o texto da bio, sem aspas ou explicações.`

  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8,
      max_tokens: 100,
    })
    return res.choices[0]?.message?.content?.trim() ?? ''
  } catch (err) {
    console.error('[ai] generateBioSuggestion error:', err)
    return ''
  }
}
