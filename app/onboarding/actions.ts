'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ─── Etapa 1 — Perfil ───────────────────────────────────────────────────────

export interface ProfileData {
  businessName: string
  slug: string
  bio: string
  address: string
  atHomeService: boolean
  avatarUrl?: string
}

export async function saveProfile(data: ProfileData) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Não autenticada' }

  const { error } = await supabase
    .from('profiles')
    .update({
      business_name:   data.businessName,
      slug:            data.slug.toLowerCase().trim(),
      bio:             data.bio,
      address:         data.atHomeService ? null : data.address,
      at_home_service: data.atHomeService,
      ...(data.avatarUrl ? { avatar_url: data.avatarUrl } : {}),
    })
    .eq('id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/onboarding')
  return { success: true }
}

export async function checkSlugAvailability(slug: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const normalized = slug.toLowerCase().trim()
  if (!normalized || normalized.length < 3) return { available: false }

  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('slug', normalized)
    .neq('id', user?.id ?? '')
    .maybeSingle()

  return { available: !data }
}

// ─── Etapa 2 — Serviços ─────────────────────────────────────────────────────

export interface ServiceData {
  name: string
  duration: number
  price: number
}

export async function saveServices(services: ServiceData[]) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Não autenticada' }

  // Remove os existentes e insere os novos
  const { error: delErr } = await supabase
    .from('services')
    .delete()
    .eq('profile_id', user.id)

  if (delErr) return { error: delErr.message }

  const { error: insErr } = await supabase.from('services').insert(
    services.map(s => ({
      profile_id:       user.id,
      name:             s.name,
      duration_minutes: s.duration,
      price:            s.price,
    }))
  )

  if (insErr) return { error: insErr.message }
  revalidatePath('/onboarding')
  return { success: true }
}

// ─── Etapa 3 — Agenda ───────────────────────────────────────────────────────

export interface WorkingHourData {
  dayOfWeek:  number
  startTime:  string
  endTime:    string
  breakStart: string | null
  breakEnd:   string | null
}

export async function saveWorkingHours(
  hours: WorkingHourData[],
  minAdvanceHours: number
) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Não autenticada' }

  const { error: delErr } = await supabase
    .from('working_hours')
    .delete()
    .eq('profile_id', user.id)

  if (delErr) return { error: delErr.message }

  if (hours.length > 0) {
    const { error: insErr } = await supabase.from('working_hours').insert(
      hours.map(h => ({
        profile_id:   user.id,
        day_of_week:  h.dayOfWeek,
        start_time:   h.startTime,
        end_time:     h.endTime,
        break_start:  h.breakStart ?? null,
        break_end:    h.breakEnd   ?? null,
        is_active:    true,
      }))
    )
    if (insErr) return { error: insErr.message }
  }

  const { error: updErr } = await supabase
    .from('profiles')
    .update({ min_advance_hours: minAdvanceHours })
    .eq('id', user.id)

  if (updErr) return { error: updErr.message }
  revalidatePath('/onboarding')
  return { success: true }
}

// ─── Etapa 4 — Conclusão ────────────────────────────────────────────────────

export async function completeOnboarding() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { error: 'Não autenticada' }

  const { error } = await supabase
    .from('profiles')
    .update({ onboarding_completed: true, is_active: true })
    .eq('id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  return { success: true }
}

// ─── Helpers — carregar dados existentes ────────────────────────────────────

export async function loadOnboardingData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: profile }, { data: services }, { data: hours }] = await Promise.all([
    supabase
      .from('profiles')
      .select('business_name, slug, bio, address, at_home_service, avatar_url, min_advance_hours')
      .eq('id', user.id)
      .single(),
    supabase
      .from('services')
      .select('name, duration_minutes, price')
      .eq('profile_id', user.id),
    supabase
      .from('working_hours')
      .select('day_of_week, start_time, end_time, break_start, break_end')
      .eq('profile_id', user.id),
  ])

  return { profile, services, hours, userId: user.id }
}
