import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const SELECT = `
  *,
  client:clients(id, full_name, phone, email, total_appointments, total_spent, last_appointment_at),
  service:services(id, name, description, duration_minutes, price, color)
`

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to   = searchParams.get('to')

  let query = supabase
    .from('appointments')
    .select(SELECT)
    .eq('profile_id', user.id)
    .order('starts_at')

  if (from) query = query.gte('starts_at', from)
  if (to)   query = query.lt('starts_at', to)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  const { data, error } = await supabase
    .from('appointments')
    .insert({
      profile_id: user.id,
      client_id:  body.client_id  ?? null,
      service_id: body.service_id ?? null,
      starts_at:  body.starts_at,
      ends_at:    body.ends_at,
      notes:      body.notes      ?? null,
      price:      body.price      ?? null,
    })
    .select(SELECT)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
