import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sendMessage } from '@/lib/zapi'
import { startOfDay, endOfDay, format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  // ── Auth ─────────────────────────────────────────────────────────────────
  const auth = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let supabase
  try { supabase = createServiceClient() } catch {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  // Busca todas as profissionais com resumo diário ativo e telefone cadastrado
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, business_name, phone, daily_summary_enabled, daily_summary_time')
    .eq('is_active', true)
    .neq('phone', null)

  const todayStart = startOfDay(new Date()).toISOString()
  const todayEnd   = endOfDay(new Date()).toISOString()
  let   sent       = 0

  for (const profile of profiles ?? []) {
    // Respeita configuração de opt-in (padrão: desligado para resumo diário)
    if (!profile.daily_summary_enabled) continue
    if (!profile.phone) continue

    // Busca agendamentos do dia
    const { data: appts } = await supabase
      .from('appointments')
      .select(`
        id, starts_at, price,
        client:clients(full_name),
        service:services(name)
      `)
      .eq('profile_id', profile.id)
      .gte('starts_at', todayStart)
      .lte('starts_at', todayEnd)
      .in('status', ['confirmed', 'completed'])
      .order('starts_at', { ascending: true })

    if (!appts || appts.length === 0) continue

    const total    = appts.reduce((s, a) => s + (a.price ?? 0), 0)
    const primeiro = appts[0]
    const client0  = primeiro.client as unknown as { full_name: string } | null
    const service0 = primeiro.service as unknown as { name: string } | null
    const hora0    = format(parseISO(primeiro.starts_at), 'HH:mm')
    const nome     = profile.full_name.split(' ')[0]

    const message = [
      `☀️ Bom dia, ${nome}!`,
      ``,
      `Hoje você tem *${appts.length} atendimento${appts.length > 1 ? 's'  : ''}*.`,
      `💰 Faturamento previsto: *R$ ${total.toFixed(2).replace('.', ',')}*`,
      ``,
      `🕐 Primeiro atendimento:`,
      `   ${hora0} — ${client0?.full_name ?? 'Cliente'} — ${service0?.name ?? 'Serviço'}`,
      ``,
      `Tenha um ótimo dia! 💜`,
    ].join('\n')

    const ok = await sendMessage(profile.phone, message)
    if (ok) sent++
  }

  console.log(`[cron/daily-summary] ${sent} resumos enviados`)
  return NextResponse.json({ ok: true, sent })
}
