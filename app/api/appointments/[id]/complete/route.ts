import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const SELECT = `
  *,
  client:clients(id, full_name, phone, email, total_appointments, total_spent, last_appointment_at),
  service:services(id, name, description, duration_minutes, price, color)
`

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  const { data: appt, error: apptErr } = await supabase
    .from('appointments')
    .update({ status: 'completed' })
    .eq('id', id)
    .eq('profile_id', user.id)
    .select(SELECT)
    .single()

  if (apptErr || !appt) return NextResponse.json({ error: apptErr?.message ?? 'Erro' }, { status: 500 })

  const { error: payErr } = await supabase
    .from('payments')
    .insert({
      appointment_id: id,
      profile_id:     user.id,
      amount:         body.amount,
      method:         body.method,
      status:         'paid',
      paid_at:        new Date().toISOString(),
    })

  if (payErr) return NextResponse.json({ error: payErr.message }, { status: 500 })
  return NextResponse.json(appt)
}
