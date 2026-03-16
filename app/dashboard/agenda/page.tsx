'use client'

import { useState, useEffect, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import {
  format, startOfWeek, addDays, addWeeks, subWeeks,
  isSameDay, parseISO, differenceInMinutes,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, CalendarDays, List, Plus } from 'lucide-react'

import { WeekView }              from './_components/WeekView'
import { DayView }               from './_components/DayView'
import { NewAppointmentModal }   from './_components/NewAppointmentModal'
import { AppointmentModal }      from './_components/AppointmentModal'
import { PaymentModal }          from './_components/PaymentModal'
import type { Appointment, Client, Service, WorkingHour } from './_components/types'

// ── Supabase client (singleton no módulo) ─────────────────────────────────────
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const APPT_SELECT = `
  *,
  client:clients(id, full_name, phone, email, total_appointments, total_spent, last_appointment_at),
  service:services(id, name, description, duration_minutes, price, color)
`

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AgendaPage() {
  const [currentDate,  setCurrentDate]  = useState(new Date())
  const [viewMode,     setViewMode]     = useState<'week' | 'day'>('week')
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [clients,      setClients]      = useState<Client[]>([])
  const [services,     setServices]     = useState<Service[]>([])
  const [workingHours, setWorkingHours] = useState<WorkingHour[]>([])
  const [userId,       setUserId]       = useState<string | null>(null)
  const [loading,      setLoading]      = useState(true)

  // Modal state
  const [newModal,  setNewModal]  = useState<{ open: boolean; date?: Date; time?: string }>({ open: false })
  const [viewModal, setViewModal] = useState<{ open: boolean; appt?: Appointment }>({ open: false })
  const [payModal,  setPayModal]  = useState<{ open: boolean; appt?: Appointment }>({ open: false })

  // Semana atual
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }) // começa na segunda
  const weekEnd   = addDays(weekStart, 6)

  // Ref para manter weekStart/weekEnd sempre atualizados dentro do Realtime callback
  const weekRef = useRef({ weekStart, weekEnd })
  useEffect(() => { weekRef.current = { weekStart, weekEnd } }, [weekStart, weekEnd])

  // ── Carrega agendamentos ──────────────────────────────────────────────────
  async function loadAppointments(from: Date, to: Date) {
    const { data } = await supabase
      .from('appointments')
      .select(APPT_SELECT)
      .gte('starts_at', from.toISOString())
      .lt('starts_at', addDays(to, 1).toISOString())
      .order('starts_at')
    if (data) setAppointments(data as Appointment[])
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const [clientsRes, servicesRes, whRes] = await Promise.all([
        supabase
          .from('clients')
          .select('id, full_name, phone, email, total_appointments, total_spent, last_appointment_at')
          .eq('profile_id', user.id)
          .order('full_name'),
        supabase
          .from('services')
          .select('id, name, description, duration_minutes, price, color, is_active')
          .eq('profile_id', user.id)
          .eq('is_active', true)
          .order('name'),
        supabase
          .from('working_hours')
          .select('*')
          .eq('profile_id', user.id),
      ])

      if (clientsRes.data)  setClients(clientsRes.data as Client[])
      if (servicesRes.data) setServices(servicesRes.data as Service[])
      if (whRes.data)       setWorkingHours(whRes.data as WorkingHour[])

      await loadAppointments(weekStart, weekEnd)
      setLoading(false)
    }
    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Recarrega ao mudar semana/dia ─────────────────────────────────────────
  useEffect(() => {
    if (userId) loadAppointments(weekStart, weekEnd)
  }, [currentDate, userId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Realtime subscription ─────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel(`agenda:${userId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'appointments',
        filter: `profile_id=eq.${userId}`,
      }, () => {
        const { weekStart: ws, weekEnd: we } = weekRef.current
        loadAppointments(ws, we)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Resumo do dia de hoje ─────────────────────────────────────────────────
  const today = new Date()
  const todayAppts = appointments.filter(
    a => isSameDay(parseISO(a.starts_at), today)
      && a.status !== 'cancelled'
      && a.status !== 'no_show'
  )
  const todayRevenue = todayAppts.reduce((s, a) => s + (a.price ?? 0), 0)
  const nextAppt = todayAppts
    .filter(a => a.status === 'confirmed' && parseISO(a.starts_at) > today)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))[0]
  const nextInMins = nextAppt
    ? Math.round(differenceInMinutes(parseISO(nextAppt.starts_at), today))
    : null

  // ── Navegação ─────────────────────────────────────────────────────────────
  function navigate(dir: 1 | -1) {
    if (viewMode === 'week') setCurrentDate(d => dir === 1 ? addWeeks(d, 1) : subWeeks(d, 1))
    else                     setCurrentDate(d => addDays(d, dir))
  }

  // ── Handlers de modal ─────────────────────────────────────────────────────
  function upsertAppt(appt: Appointment) {
    setAppointments(prev => {
      const exists = prev.some(a => a.id === appt.id)
      const next   = exists ? prev.map(a => a.id === appt.id ? appt : a) : [...prev, appt]
      return next.sort((a, b) => a.starts_at.localeCompare(b.starts_at))
    })
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col overflow-hidden">

      {/* ── Barra de navegação ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white shrink-0 gap-2 flex-wrap">

        {/* Navegação de datas */}
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-2.5 py-1.5 text-xs sm:text-sm font-semibold rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-gray-600"
          >
            Hoje
          </button>
          <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-600">
            <ChevronLeft size={18} />
          </button>
          <button onClick={() => navigate(1)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-600">
            <ChevronRight size={18} />
          </button>
          <span className="text-sm sm:text-base font-bold text-gray-800 capitalize">
            {viewMode === 'week'
              ? `${format(weekStart, 'd MMM', { locale: ptBR })} – ${format(weekEnd, 'd MMM yyyy', { locale: ptBR })}`
              : format(currentDate, "EEEE, d 'de' MMMM", { locale: ptBR })
            }
          </span>
        </div>

        {/* Controles */}
        <div className="flex items-center gap-2">
          {/* Toggle semana/dia */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
            <button
              onClick={() => setViewMode('week')}
              className={`px-2.5 py-1.5 flex items-center gap-1.5 transition-colors ${viewMode === 'week' ? 'bg-[#B565A7] text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <CalendarDays size={15} />
              <span className="hidden sm:inline font-medium">Semana</span>
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={`px-2.5 py-1.5 flex items-center gap-1.5 transition-colors ${viewMode === 'day' ? 'bg-[#B565A7] text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <List size={15} />
              <span className="hidden sm:inline font-medium">Dia</span>
            </button>
          </div>

          {/* Novo agendamento */}
          <button
            onClick={() => setNewModal({ open: true })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-sm font-semibold shadow-sm transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #B565A7, #7C5CBF)' }}
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Novo</span>
          </button>
        </div>
      </div>

      {/* ── Resumo do dia ── */}
      <div className="flex items-center gap-3 sm:gap-5 px-4 py-2 bg-white border-b border-gray-50 shrink-0 overflow-x-auto text-xs">
        <span className="text-gray-500 shrink-0">
          Hoje:{' '}
          <strong className="text-gray-800">
            {todayAppts.length} agendamento{todayAppts.length !== 1 ? 's' : ''}
          </strong>
        </span>
        <div className="w-px h-3 bg-gray-200 shrink-0" />
        <span className="text-gray-500 shrink-0">
          Previsto:{' '}
          <strong className="text-[#10B981]">
            R$ {todayRevenue.toFixed(2).replace('.', ',')}
          </strong>
        </span>
        {nextAppt && nextInMins !== null && (
          <>
            <div className="w-px h-3 bg-gray-200 shrink-0" />
            <span className="text-gray-500 shrink-0">
              Próximo:{' '}
              <strong className="text-[#B565A7]">
                {nextInMins <= 0
                  ? 'Agora'
                  : nextInMins < 60
                  ? `em ${nextInMins}min`
                  : `às ${format(parseISO(nextAppt.starts_at), 'HH:mm')}`
                }
                {' — '}{nextAppt.client?.full_name ?? 'Sem cliente'}
              </strong>
            </span>
          </>
        )}
      </div>

      {/* ── Calendário ── */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="w-8 h-8 border-2 border-[#B565A7] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-gray-400">Carregando agenda...</p>
          </div>
        </div>
      ) : viewMode === 'week' ? (
        <WeekView
          weekStart={weekStart}
          appointments={appointments}
          workingHours={workingHours}
          currentDate={currentDate}
          onSlotClick={(date, time) => setNewModal({ open: true, date, time })}
          onAppointmentClick={appt => setViewModal({ open: true, appt })}
          onDayClick={date => { setCurrentDate(date); setViewMode('day') }}
        />
      ) : (
        <DayView
          date={currentDate}
          appointments={appointments.filter(a => isSameDay(parseISO(a.starts_at), currentDate))}
          workingHours={workingHours}
          onSlotClick={time => setNewModal({ open: true, date: currentDate, time })}
          onAppointmentClick={appt => setViewModal({ open: true, appt })}
        />
      )}

      {/* ── Modais ── */}
      {newModal.open && (
        <NewAppointmentModal
          initialDate={newModal.date}
          initialTime={newModal.time}
          clients={clients}
          services={services}
          supabase={supabase}
          userId={userId!}
          onClose={() => setNewModal({ open: false })}
          onCreated={appt => { upsertAppt(appt); setNewModal({ open: false }) }}
        />
      )}

      {viewModal.open && viewModal.appt && (
        <AppointmentModal
          appointment={viewModal.appt}
          supabase={supabase}
          userId={userId!}
          onClose={() => setViewModal({ open: false })}
          onUpdated={appt => { upsertAppt(appt); setViewModal({ open: false }) }}
          onDeleted={id  => { setAppointments(prev => prev.filter(a => a.id !== id)); setViewModal({ open: false }) }}
          onComplete={appt => { setViewModal({ open: false }); setPayModal({ open: true, appt }) }}
        />
      )}

      {payModal.open && payModal.appt && (
        <PaymentModal
          appointment={payModal.appt}
          supabase={supabase}
          userId={userId!}
          onClose={() => setPayModal({ open: false })}
          onPaid={appt => { upsertAppt(appt); setPayModal({ open: false }) }}
        />
      )}
    </div>
  )
}
