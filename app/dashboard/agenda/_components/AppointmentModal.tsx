'use client'

import { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  X, CheckCircle, RotateCcw, XCircle, UserX,
  Clock, Calendar, Tag, FileText, Loader2, Phone,
} from 'lucide-react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Appointment } from './types'

const STATUS_STYLES: Record<string, { label: string; bg: string; text: string }> = {
  confirmed: { label: 'Confirmado',       bg: '#DCFCE7', text: '#15803D' },
  completed: { label: 'Concluído',        bg: '#EDE9FE', text: '#6D28D9' },
  cancelled: { label: 'Cancelado',        bg: '#FEE2E2', text: '#DC2626' },
  no_show:   { label: 'Não compareceu',   bg: '#FEF3C7', text: '#D97706' },
}

const APPT_SELECT = `
  *,
  client:clients(id, full_name, phone, email, total_appointments, total_spent, last_appointment_at),
  service:services(id, name, description, duration_minutes, price, color)
`

interface Props {
  appointment: Appointment
  supabase:    SupabaseClient
  userId:      string
  onClose:     () => void
  onUpdated:   (appt: Appointment) => void
  onDeleted:   (id: string) => void
  onComplete:  (appt: Appointment) => void
}

export function AppointmentModal({
  appointment, supabase, userId,
  onClose, onUpdated, onDeleted, onComplete,
}: Props) {
  const [loading,           setLoading]           = useState<string | null>(null)
  const [error,             setError]             = useState('')
  const [showCancel,        setShowCancel]        = useState(false)
  const [rescheduling,      setRescheduling]      = useState(false)
  const [newDate,           setNewDate]           = useState(format(parseISO(appointment.starts_at), 'yyyy-MM-dd'))
  const [newTime,           setNewTime]           = useState(format(parseISO(appointment.starts_at), 'HH:mm'))
  const [history,           setHistory]           = useState<Appointment[]>([])

  const s      = STATUS_STYLES[appointment.status] ?? STATUS_STYLES.confirmed
  const active = appointment.status === 'confirmed'

  // Histórico do cliente
  useEffect(() => {
    if (!appointment.client_id) return
    supabase
      .from('appointments')
      .select('id, starts_at, status, price, service:services(name)')
      .eq('profile_id', userId)
      .eq('client_id', appointment.client_id)
      .neq('id', appointment.id)
      .eq('status', 'completed')
      .order('starts_at', { ascending: false })
      .limit(3)
      .then(({ data }) => { if (data) setHistory(data as unknown as Appointment[]) })
  }, [appointment.client_id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function setStatus(status: string) {
    setLoading(status)
    setError('')
    const { data, error: err } = await supabase
      .from('appointments')
      .update({ status })
      .eq('id', appointment.id)
      .eq('profile_id', userId)
      .select(APPT_SELECT)
      .single()
    setLoading(null)
    if (err || !data) { setError(err?.message ?? 'Erro'); return }
    onUpdated(data as Appointment)
  }

  async function handleReschedule() {
    setLoading('reschedule')
    setError('')
    const [y, mo, d] = newDate.split('-').map(Number)
    const [h, m]     = newTime.split(':').map(Number)
    const starts     = new Date(y, mo - 1, d, h, m)
    const duration   = appointment.service?.duration_minutes ?? 60
    const ends       = new Date(starts.getTime() + duration * 60_000)

    const { data, error: err } = await supabase
      .from('appointments')
      .update({ starts_at: starts.toISOString(), ends_at: ends.toISOString() })
      .eq('id', appointment.id)
      .eq('profile_id', userId)
      .select(APPT_SELECT)
      .single()
    setLoading(null)
    if (err || !data) { setError(err?.message ?? 'Erro'); return }
    onUpdated(data as Appointment)
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg max-h-[92vh] overflow-y-auto">

        {/* Header */}
        <div className="sticky top-0 bg-white rounded-t-3xl sm:rounded-t-2xl z-10 flex items-start justify-between px-5 pt-5 pb-4 border-b border-gray-100">
          <div className="space-y-1 flex-1 min-w-0">
            <span
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold"
              style={{ backgroundColor: s.bg, color: s.text }}
            >
              {s.label}
            </span>
            <h2 className="text-lg font-bold text-gray-900 truncate">
              {appointment.client?.full_name ?? 'Sem cliente'}
            </h2>
            <p className="text-sm text-gray-500">
              {appointment.service?.name ?? 'Sem serviço'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors ml-2 shrink-0">
            <X size={20} />
          </button>
        </div>

        <div className="px-5 py-5 space-y-5">

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-2.5">
            <InfoCard icon={<Calendar size={15} className="text-[#B565A7]" />} label="Data">
              {format(parseISO(appointment.starts_at), "d 'de' MMM, yyyy", { locale: ptBR })}
            </InfoCard>
            <InfoCard icon={<Clock size={15} className="text-[#B565A7]" />} label="Horário">
              {format(parseISO(appointment.starts_at), 'HH:mm')} – {format(parseISO(appointment.ends_at), 'HH:mm')}
            </InfoCard>
            {appointment.price != null && (
              <InfoCard icon={<Tag size={15} className="text-[#B565A7]" />} label="Valor">
                R$ {appointment.price.toFixed(2).replace('.', ',')}
              </InfoCard>
            )}
            {appointment.service && (
              <InfoCard icon={<Clock size={15} className="text-[#B565A7]" />} label="Duração">
                {appointment.service.duration_minutes} min
              </InfoCard>
            )}
            {appointment.client?.phone && (
              <InfoCard icon={<Phone size={15} className="text-[#B565A7]" />} label="Telefone">
                {appointment.client.phone}
              </InfoCard>
            )}
            {appointment.client && (
              <InfoCard icon={<CheckCircle size={15} className="text-[#B565A7]" />} label="Visitas">
                {appointment.client.total_appointments} visitas
              </InfoCard>
            )}
          </div>

          {/* Observações */}
          {appointment.notes && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-100">
              <FileText size={15} className="text-amber-500 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">{appointment.notes}</p>
            </div>
          )}

          {/* Reagendar form */}
          {rescheduling && (
            <div className="space-y-3 p-4 rounded-xl border border-[#B565A7]/30 bg-[#B565A7]/5">
              <p className="text-sm font-bold text-[#B565A7]">Reagendar</p>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="date" value={newDate} onChange={e => setNewDate(e.target.value)}
                  className="px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:border-[#B565A7]"
                />
                <input
                  type="time" value={newTime} onChange={e => setNewTime(e.target.value)}
                  className="px-3 py-2.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:border-[#B565A7]"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleReschedule}
                  disabled={loading === 'reschedule'}
                  className="flex-1 py-2.5 text-sm font-bold text-white rounded-xl disabled:opacity-60 flex items-center justify-center gap-1.5"
                  style={{ background: 'linear-gradient(135deg, #B565A7, #7C5CBF)' }}
                >
                  {loading === 'reschedule' ? <Loader2 size={15} className="animate-spin" /> : 'Confirmar'}
                </button>
                <button onClick={() => setRescheduling(false)} className="px-4 py-2.5 text-sm text-gray-500 hover:bg-gray-100 rounded-xl transition-colors">
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Confirmação de cancelamento */}
          {showCancel && (
            <div className="space-y-3 p-4 rounded-xl bg-red-50 border border-red-100">
              <p className="text-sm font-bold text-red-700">Cancelar agendamento?</p>
              <p className="text-xs text-red-500">Esta ação não pode ser desfeita.</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setStatus('cancelled')}
                  disabled={loading === 'cancelled'}
                  className="flex-1 py-2.5 text-sm font-bold text-white bg-red-500 rounded-xl disabled:opacity-60 flex items-center justify-center"
                >
                  {loading === 'cancelled' ? <Loader2 size={15} className="animate-spin" /> : 'Sim, cancelar'}
                </button>
                <button onClick={() => setShowCancel(false)} className="px-4 py-2.5 text-sm text-gray-500 hover:bg-gray-100 rounded-xl transition-colors">
                  Voltar
                </button>
              </div>
            </div>
          )}

          {/* Botões de ação */}
          {active && !rescheduling && !showCancel && (
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => onComplete(appointment)}
                className="flex items-center justify-center gap-1.5 py-3 rounded-xl text-sm font-bold text-white shadow-sm col-span-2"
                style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}
              >
                <CheckCircle size={16} /> Concluído e receber
              </button>
              <button
                onClick={() => setRescheduling(true)}
                className="flex items-center justify-center gap-1.5 py-3 rounded-xl text-sm font-semibold text-[#B565A7] bg-[#B565A7]/10 hover:bg-[#B565A7]/15 transition-colors"
              >
                <RotateCcw size={15} /> Reagendar
              </button>
              <button
                onClick={() => setStatus('no_show')}
                disabled={loading === 'no_show'}
                className="flex items-center justify-center gap-1.5 py-3 rounded-xl text-sm font-semibold text-amber-600 bg-amber-50 hover:bg-amber-100 transition-colors disabled:opacity-60"
              >
                {loading === 'no_show'
                  ? <Loader2 size={15} className="animate-spin" />
                  : <><UserX size={15} /> Não compareceu</>
                }
              </button>
              <button
                onClick={() => setShowCancel(true)}
                className="col-span-2 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50 transition-colors"
              >
                <XCircle size={15} /> Cancelar agendamento
              </button>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>
          )}

          {/* Histórico do cliente */}
          {history.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                Últimas visitas — {appointment.client?.full_name}
              </p>
              {history.map(h => (
                <div key={h.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-gray-50">
                  <div>
                    <p className="text-sm text-gray-700">{(h as any).service?.name ?? 'Serviço'}</p>
                    <p className="text-xs text-gray-400">
                      {format(parseISO(h.starts_at), "d 'de' MMM yyyy", { locale: ptBR })}
                    </p>
                  </div>
                  {h.price != null && (
                    <span className="text-sm font-semibold text-gray-700">
                      R$ {h.price.toFixed(2).replace('.', ',')}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function InfoCard({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 p-3 rounded-xl bg-gray-50">
      <div className="shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-sm font-semibold text-gray-800 truncate">{children}</p>
      </div>
    </div>
  )
}
