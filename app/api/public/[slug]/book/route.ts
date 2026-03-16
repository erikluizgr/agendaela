import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const body     = await request.json()
  const { service_id, date, time, client_name, client_phone, client_email } = body

  if (!service_id || !date || !time || !client_name || !client_phone) {
    return NextResponse.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 })
  }

  let supabase
  try { supabase = createServiceClient() } catch {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  // Profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()
  if (!profile) return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })

  // Service
  const { data: service } = await supabase
    .from('services')
    .select('duration_minutes, price')
    .eq('id', service_id)
    .eq('profile_id', profile.id)
    .single()
  if (!service) return NextResponse.json({ error: 'Serviço não encontrado' }, { status: 404 })

  // Build timestamps
  const [y, mo, d] = date.split('-').map(Number)
  const [h, m]     = time.split(':').map(Number)
  const startsAt   = new Date(y, mo - 1, d, h, m)
  const endsAt     = new Date(startsAt.getTime() + service.duration_minutes * 60_000)

  // Find or create client by phone
  let clientId: string | null = null
  const phoneClean = client_phone.replace(/\D/g, '')

  const { data: existing } = await supabase
    .from('clients')
    .select('id')
    .eq('profile_id', profile.id)
    .eq('phone', client_phone)
    .maybeSingle()

  if (existing) {
    clientId = existing.id
  } else {
    const { data: newClient } = await supabase
      .from('clients')
      .insert({
        profile_id: profile.id,
        full_name:  client_name.trim(),
        phone:      client_phone,
        email:      client_email?.trim() || null,
      })
      .select('id')
      .single()
    if (newClient) clientId = newClient.id
  }

  // Create appointment
  const { data: appt, error } = await supabase
    .from('appointments')
    .insert({
      profile_id: profile.id,
      client_id:  clientId,
      service_id,
      starts_at:  startsAt.toISOString(),
      ends_at:    endsAt.toISOString(),
      price:      service.price,
      status:     'confirmed',
    })
    .select('id, starts_at, ends_at')
    .single()

  if (error || !appt) {
    return NextResponse.json({ error: error?.message ?? 'Erro ao criar agendamento' }, { status: 500 })
  }

  return NextResponse.json({ appointment: appt }, { status: 201 })
}
