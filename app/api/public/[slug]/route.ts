import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  let supabase
  try { supabase = createServiceClient() } catch {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  console.log('[public/slug] buscando slug:', slug)

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, business_name, full_name, bio, address, avatar_url, at_home_service, min_advance_hours, slug, is_active')
    .eq('slug', slug)
    .single()

  console.log('[public/slug] resultado:', { profile, error: profileError?.message })

  if (!profile) return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })

  const [{ data: services }, { data: workingHours }] = await Promise.all([
    supabase
      .from('services')
      .select('id, name, description, duration_minutes, price, color')
      .eq('profile_id', profile.id)
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('working_hours')
      .select('day_of_week, start_time, end_time, is_active')
      .eq('profile_id', profile.id),
  ])

  return NextResponse.json({
    profile,
    services:     services     ?? [],
    workingHours: workingHours ?? [],
  })
}
