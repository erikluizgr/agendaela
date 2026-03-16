import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { sendAppointmentReminder, sendBirthdayMessage } from '@/lib/zapi'
import { startOfDay, endOfDay, addDays } from 'date-fns'

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

  const results = { reminders: 0, birthdays: 0, errors: 0 }

  // ── 1. Lembretes de agendamentos do dia seguinte ──────────────────────────
  const tomorrow      = addDays(new Date(), 1)
  const tomorrowStart = startOfDay(tomorrow).toISOString()
  const tomorrowEnd   = endOfDay(tomorrow).toISOString()

  const { data: appointments } = await supabase
    .from('appointments')
    .select(`
      id,
      profile:profiles(
        whatsapp_reminders_enabled
      )
    `)
    .gte('starts_at', tomorrowStart)
    .lte('starts_at', tomorrowEnd)
    .eq('status', 'confirmed')
    .eq('reminder_sent', false)

  console.log(`[cron/reminders] ${appointments?.length ?? 0} agendamentos para lembrar`)

  for (const appt of appointments ?? []) {
    const profile = appt.profile as { whatsapp_reminders_enabled?: boolean } | null
    // Se a profissional não configurou a flag, enviamos por padrão (opt-out model)
    if (profile?.whatsapp_reminders_enabled === false) continue

    try {
      const sent = await sendAppointmentReminder(appt.id)
      if (sent) results.reminders++
      else results.errors++
    } catch (err) {
      console.error(`[cron/reminders] Erro ao enviar lembrete ${appt.id}:`, err)
      results.errors++
    }
  }

  // ── 2. Mensagens de aniversário ───────────────────────────────────────────
  const today = new Date()
  const mm    = String(today.getMonth() + 1).padStart(2, '0')
  const dd    = String(today.getDate()).padStart(2, '0')

  // birth_date armazenado como 'yyyy-MM-dd' — filtra por mês e dia
  const { data: birthdayClients } = await supabase
    .from('clients')
    .select('id, profile_id, profile:profiles(whatsapp_birthday_enabled, birthday_discount_pct, birthday_custom_message)')
    .like('birth_date', `%-${mm}-${dd}`)

  console.log(`[cron/reminders] ${birthdayClients?.length ?? 0} aniversariantes hoje`)

  for (const client of birthdayClients ?? []) {
    const profile = client.profile as {
      whatsapp_birthday_enabled?: boolean
      birthday_discount_pct?: number
      birthday_custom_message?: string
    } | null

    if (profile?.whatsapp_birthday_enabled === false) continue

    try {
      const sent = await sendBirthdayMessage(
        client.id,
        profile?.birthday_discount_pct ?? 10,
        profile?.birthday_custom_message
      )
      if (sent) results.birthdays++
      else results.errors++
    } catch (err) {
      console.error(`[cron/reminders] Erro ao enviar aniversário ${client.id}:`, err)
      results.errors++
    }
  }

  console.log('[cron/reminders] Concluído:', results)
  return NextResponse.json({ ok: true, ...results })
}
