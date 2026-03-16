import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

function timeToMins(t: string) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug }     = await params
  const { searchParams } = new URL(request.url)
  const serviceId    = searchParams.get('service_id')
  const dateStr      = searchParams.get('date') // 'yyyy-MM-dd'

  if (!serviceId || !dateStr) {
    return NextResponse.json({ error: 'Parâmetros obrigatórios: service_id, date' }, { status: 400 })
  }

  let supabase
  try { supabase = createServiceClient() } catch {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  // 1. Profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, min_advance_hours')
    .eq('slug', slug)
    .single()
  if (!profile) return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })

  // 2. Service
  const { data: service } = await supabase
    .from('services')
    .select('duration_minutes')
    .eq('id', serviceId)
    .eq('profile_id', profile.id)
    .single()
  if (!service) return NextResponse.json({ error: 'Serviço não encontrado' }, { status: 404 })

  // 3. Date + working hours
  const [y, mo, d] = dateStr.split('-').map(Number)
  const date       = new Date(y, mo - 1, d)
  const dayOfWeek  = date.getDay()

  const { data: wh } = await supabase
    .from('working_hours')
    .select('start_time, end_time, break_start, break_end')
    .eq('profile_id', profile.id)
    .eq('day_of_week', dayOfWeek)
    .eq('is_active', true)
    .maybeSingle()

  if (!wh) return NextResponse.json({ slots: [] })

  // 4. Existing appointments
  const dayStart = new Date(y, mo - 1, d, 0, 0, 0).toISOString()
  const dayEnd   = new Date(y, mo - 1, d, 23, 59, 59).toISOString()

  const { data: appts } = await supabase
    .from('appointments')
    .select('starts_at, ends_at')
    .eq('profile_id', profile.id)
    .gte('starts_at', dayStart)
    .lte('starts_at', dayEnd)
    .in('status', ['confirmed', 'completed'])

  // 5. Build available slots
  const startMins  = timeToMins(wh.start_time)
  const endMins    = timeToMins(wh.end_time)
  const duration   = service.duration_minutes
  const breakStart = wh.break_start ? timeToMins(wh.break_start) : null
  const breakEnd   = wh.break_end   ? timeToMins(wh.break_end)   : null
  const minAdv     = (profile.min_advance_hours ?? 1) * 60

  const apptRanges = (appts ?? []).map(a => ({
    start: new Date(a.starts_at).getHours() * 60 + new Date(a.starts_at).getMinutes(),
    end:   new Date(a.ends_at).getHours()   * 60 + new Date(a.ends_at).getMinutes(),
  }))

  const now         = new Date()
  const isToday     = date.toDateString() === now.toDateString()
  const nowMins     = isToday ? now.getHours() * 60 + now.getMinutes() : 0
  const cutoffMins  = nowMins + minAdv

  const slots: string[] = []

  for (let mins = startMins; mins + duration <= endMins; mins += 30) {
    // Skip break time
    if (breakStart !== null && breakEnd !== null) {
      if (mins >= breakStart && mins < breakEnd)              continue
      if (mins < breakStart && mins + duration > breakStart) continue
    }
    // Skip past slots (with min advance)
    if (isToday && mins < cutoffMins) continue
    // Skip overlapping appointments
    if (apptRanges.some(a => mins < a.end && mins + duration > a.start)) continue

    slots.push(
      `${Math.floor(mins / 60).toString().padStart(2, '0')}:${(mins % 60).toString().padStart(2, '0')}`
    )
  }

  return NextResponse.json({ slots })
}
