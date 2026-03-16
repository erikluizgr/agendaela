import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { predictChurnRisk } from '@/lib/ai'
import { subDays } from 'date-fns'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const clients = await predictChurnRisk(user.id)
    return NextResponse.json({ clients })
  } catch (err) {
    console.error('[automations/churn]', err)
    // Fallback sem IA: busca simples
    const threshold = subDays(new Date(), 30).toISOString()
    const { data } = await supabase
      .from('clients')
      .select('id, full_name, phone, last_appointment_at')
      .eq('profile_id', user.id)
      .lt('last_appointment_at', threshold)
      .order('last_appointment_at', { ascending: true })
      .limit(20)

    const clients = (data ?? []).map(c => ({
      ...c,
      days_away: Math.floor((Date.now() - new Date(c.last_appointment_at ?? 0).getTime()) / 86400000),
      reactivation_msg: `Olá, ${c.full_name.split(' ')[0]}! Sentimos sua falta! Que tal marcar um horário? 💜`,
    }))
    return NextResponse.json({ clients })
  }
}
