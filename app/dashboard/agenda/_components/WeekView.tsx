'use client'

import { useEffect, useRef, useState } from 'react'
import { format, isSameDay, isToday, parseISO, addDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Appointment, WorkingHour } from './types'

// ── Grid constants ────────────────────────────────────────────────────────────
const GRID_START = 7 * 60   // 7:00 em minutos desde meia-noite
const GRID_END   = 22 * 60  // 22:00
const SLOT_H     = 48       // px por slot de 30 min
const SLOTS      = (GRID_END - GRID_START) / 30  // 30 slots

// ── Helpers ───────────────────────────────────────────────────────────────────
function minsFromISO(iso: string): number {
  const d = parseISO(iso)
  return d.getHours() * 60 + d.getMinutes()
}

function timeToMins(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function inWorkingHours(date: Date, slotMins: number, wh: WorkingHour[]): boolean {
  const entry = wh.find(w => w.day_of_week === date.getDay() && w.is_active)
  if (!entry) return false
  const start = timeToMins(entry.start_time)
  const end   = timeToMins(entry.end_time)
  if (slotMins < start || slotMins >= end) return false
  if (entry.break_start && entry.break_end) {
    const bs = timeToMins(entry.break_start)
    const be = timeToMins(entry.break_end)
    if (slotMins >= bs && slotMins < be) return false
  }
  return true
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface Props {
  weekStart:          Date
  appointments:       Appointment[]
  workingHours:       WorkingHour[]
  currentDate:        Date
  onSlotClick:        (date: Date, time: string) => void
  onAppointmentClick: (appt: Appointment) => void
  onDayClick:         (date: Date) => void
}

// ── Component ─────────────────────────────────────────────────────────────────
export function WeekView({
  weekStart, appointments, workingHours,
  currentDate, onSlotClick, onAppointmentClick, onDayClick,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [nowMins, setNowMins] = useState(() => {
    const d = new Date()
    return d.getHours() * 60 + d.getMinutes()
  })

  // Auto-scroll para hora atual ao montar
  useEffect(() => {
    if (!scrollRef.current) return
    const top = ((nowMins - GRID_START) / 30) * SLOT_H - 200
    scrollRef.current.scrollTop = Math.max(0, top)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Atualiza indicador a cada minuto
  useEffect(() => {
    const t = setInterval(() => {
      const d = new Date()
      setNowMins(d.getHours() * 60 + d.getMinutes())
    }, 60_000)
    return () => clearInterval(t)
  }, [])

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const timeSlots = Array.from({ length: SLOTS }, (_, i) => {
    const mins = GRID_START + i * 30
    return { mins, label: mins % 60 === 0 ? `${Math.floor(mins / 60)}:00` : '' }
  })

  const nowTop =
    nowMins >= GRID_START && nowMins <= GRID_END
      ? ((nowMins - GRID_START) / 30) * SLOT_H
      : null

  function handleColumnClick(e: React.MouseEvent<HTMLDivElement>, date: Date) {
    if ((e.target as HTMLElement).closest('[data-appt]')) return
    const rect = e.currentTarget.getBoundingClientRect()
    const relY = e.clientY - rect.top
    const idx  = Math.floor(relY / SLOT_H)
    const mins = Math.max(GRID_START, Math.min(GRID_END - 30, GRID_START + idx * 30))
    const h    = Math.floor(mins / 60).toString().padStart(2, '0')
    const m    = (mins % 60).toString().padStart(2, '0')
    onSlotClick(date, `${h}:${m}`)
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden min-h-0">
      {/* ── Cabeçalho com dias ── */}
      <div className="flex shrink-0 border-b border-gray-100 bg-white z-10">
        <div className="w-14 shrink-0" />
        {days.map(day => {
          const today    = isToday(day)
          const selected = isSameDay(day, currentDate)
          return (
            <button
              key={day.toISOString()}
              className="flex-1 flex flex-col items-center py-2 hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => onDayClick(day)}
            >
              <span className="text-[10px] uppercase font-semibold text-gray-400 tracking-wide">
                {format(day, 'EEE', { locale: ptBR })}
              </span>
              <span className={[
                'mt-0.5 w-7 h-7 flex items-center justify-center rounded-full text-sm font-bold transition-colors',
                today
                  ? 'bg-[#B565A7] text-white'
                  : selected
                  ? 'bg-[#B565A7]/10 text-[#B565A7]'
                  : 'text-gray-700',
              ].join(' ')}>
                {format(day, 'd')}
              </span>
            </button>
          )
        })}
      </div>

      {/* ── Grade rolável ── */}
      <div className="flex-1 overflow-y-auto relative" ref={scrollRef}>
        <div className="flex" style={{ height: SLOTS * SLOT_H }}>

          {/* Coluna de horários */}
          <div className="w-14 shrink-0 relative select-none">
            {timeSlots.map(({ mins, label }) => (
              <div
                key={mins}
                className="absolute w-full flex items-start justify-end pr-2"
                style={{ top: ((mins - GRID_START) / 30) * SLOT_H, height: SLOT_H }}
              >
                {label && (
                  <span className="text-[10px] text-gray-400 -translate-y-2.5 tabular-nums">
                    {label}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Colunas dos dias */}
          {days.map(day => {
            const dayAppts = appointments.filter(a => isSameDay(parseISO(a.starts_at), day))
            return (
              <div
                key={day.toISOString()}
                className="flex-1 relative border-l border-gray-100 cursor-pointer"
                style={{ height: SLOTS * SLOT_H }}
                onClick={e => handleColumnClick(e, day)}
              >
                {/* Fundo dos slots */}
                {timeSlots.map(({ mins }) => {
                  const working = workingHours.length > 0
                    ? inWorkingHours(day, mins, workingHours)
                    : true
                  return (
                    <div
                      key={mins}
                      className={[
                        'absolute w-full border-b',
                        mins % 60 === 0 ? 'border-gray-100' : 'border-gray-50',
                        !working ? 'bg-gray-50/80' : '',
                      ].join(' ')}
                      style={{ top: ((mins - GRID_START) / 30) * SLOT_H, height: SLOT_H }}
                    />
                  )
                })}

                {/* Cards de agendamento */}
                {dayAppts.map(appt => {
                  const startMins = minsFromISO(appt.starts_at)
                  const endMins   = minsFromISO(appt.ends_at)
                  const top       = ((startMins - GRID_START) / 30) * SLOT_H
                  const height    = Math.max(22, ((endMins - startMins) / 30) * SLOT_H - 2)
                  const color     = appt.service?.color ?? '#B565A7'
                  const faded     = appt.status === 'cancelled' || appt.status === 'no_show'

                  return (
                    <div
                      key={appt.id}
                      data-appt
                      onClick={e => { e.stopPropagation(); onAppointmentClick(appt) }}
                      className="absolute left-0.5 right-0.5 rounded-md px-1.5 py-0.5 cursor-pointer overflow-hidden z-10 shadow-sm hover:shadow-md transition-shadow"
                      style={{
                        top:             `${top}px`,
                        height:          `${height}px`,
                        backgroundColor: faded ? '#f3f4f6' : `${color}1A`,
                        borderLeft:      `3px solid ${faded ? '#d1d5db' : color}`,
                        opacity:         faded ? 0.65 : 1,
                      }}
                    >
                      <p
                        className="text-[11px] font-bold leading-tight truncate"
                        style={{ color: faded ? '#9ca3af' : color }}
                      >
                        {appt.client?.full_name ?? 'Sem cliente'}
                      </p>
                      {height > 36 && (
                        <p className="text-[10px] text-gray-400 leading-tight truncate">
                          {appt.service?.name ?? '—'}
                        </p>
                      )}
                      {height > 52 && (
                        <p className="text-[10px] text-gray-400 leading-none tabular-nums">
                          {format(parseISO(appt.starts_at), 'HH:mm')}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}

          {/* Indicador de hora atual */}
          {nowTop !== null && (
            <div
              className="absolute pointer-events-none z-20"
              style={{ top: nowTop, left: 56, right: 0 }}
            >
              <div className="relative flex items-center">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0 -ml-1.5" />
                <div className="flex-1 h-0.5 bg-red-500" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
