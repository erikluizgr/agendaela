import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const SELECT = `
  *,
  client:clients(id, full_name, phone, email, total_appointments, total_spent, last_appointment_at),
  service:services(id, name, description, duration_minutes, price, color)
`

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const patch: Record<string, unknown> = {}
  if (body.client_id  !== undefined) patch.client_id  = body.client_id
  if (body.service_id !== undefined) patch.service_id = body.service_id
  if (body.starts_at  !== undefined) patch.starts_at  = body.starts_at
  if (body.ends_at    !== undefined) patch.ends_at    = body.ends_at
  if (body.notes      !== undefined) patch.notes      = body.notes
  if (body.price      !== undefined) patch.price      = body.price
  if (body.status     !== undefined) patch.status     = body.status

  const { data, error } = await supabase
    .from('appointments')
    .update(patch)
    .eq('id', id)
    .eq('profile_id', user.id)
    .select(SELECT)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('appointments')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .eq('profile_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
