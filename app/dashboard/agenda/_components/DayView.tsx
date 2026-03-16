'use client'

import { useEffect, useRef, useState } from 'react'
import { format, parseISO } from 'date-fns'
import type { Appointment, WorkingHour } from './types'

const GRID_START = 7 * 60
const GRID_END   = 22 * 60
const SLOT_H     = 64   // slots maiores para visão diária
const SLOTS      = (GRID_END - GRID_START) / 30

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

interface Props {
  date:               Date
  appointments:       Appointment[]
  workingHours:       WorkingHour[]
  onSlotClick:        (time: string) => void
  onAppointmentClick: (appt: Appointment) => void
}

export function DayView({ date, appointments, workingHours, onSlotClick, onAppointmentClick }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [nowMins, setNowMins] = useState(() => {
    const d = new Date()
    return d.getHours() * 60 + d.getMinutes()
  })

  useEffect(() => {
    if (!scrollRef.current) return
    const top = ((nowMins - GRID_START) / 30) * SLOT_H - 200
    scrollRef.current.scrollTop = Math.max(0, top)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const t = setInterval(() => {
      const d = new Date()
      setNowMins(d.getHours() * 60 + d.getMinutes())
    }, 60_000)
    return () => clearInterval(t)
  }, [])

  const timeSlots = Array.from({ length: SLOTS }, (_, i) => {
    const mins = GRID_START + i * 30
    return { mins, label: mins % 60 === 0 ? `${Math.floor(mins / 60)}:00` : '' }
  })

  const nowTop =
    nowMins >= GRID_START && nowMins <= GRID_END
      ? ((nowMins - GRID_START) / 30) * SLOT_H
      : null

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest('[data-appt]')) return
    const rect = e.currentTarget.getBoundingClientRect()
    const relY  = e.clientY - rect.top
    const idx   = Math.floor(relY / SLOT_H)
    const mins  = Math.max(GRID_START, Math.min(GRID_END - 30, GRID_START + idx * 30))
    const h     = Math.floor(mins / 60).toString().padStart(2, '0')
    const m     = (mins % 60).toString().padStart(2, '0')
    onSlotClick(`${h}:${m}`)
  }

  // Agrupa agendamentos por slot para detectar sobreposições simples
  const apptsSorted = [...appointments].sort((a, b) => a.starts_at.localeCompare(b.starts_at))

  return (
    <div className="flex-1 overflow-y-auto relative" ref={scrollRef}>
      <div className="flex px-2 sm:px-6" style={{ height: SLOTS * SLOT_H, minHeight: '100%' }}>

        {/* Coluna de horários */}
        <div className="w-16 shrink-0 relative select-none">
          {timeSlots.map(({ mins, label }) => (
            <div
              key={mins}
              className="absolute w-full flex items-start justify-end pr-3"
              style={{ top: ((mins - GRID_START) / 30) * SLOT_H, height: SLOT_H }}
            >
              {label && (
                <span className="text-xs text-gray-400 -translate-y-2.5 tabular-nums">{label}</span>
              )}
            </div>
          ))}
        </div>

        {/* Coluna do dia */}
        <div
          className="flex-1 relative border-l border-gray-200 cursor-pointer"
          style={{ height: SLOTS * SLOT_H }}
          onClick={handleClick}
        >
          {/* Fundo dos slots */}
          {timeSlots.map(({ mins }) => {
            const working = workingHours.length > 0 ? inWorkingHours(date, mins, workingHours) : true
            return (
              <div
                key={mins}
                className={[
                  'absolute w-full border-b',
                  mins % 60 === 0 ? 'border-gray-200' : 'border-gray-100',
                  !working ? 'bg-gray-50' : '',
                ].join(' ')}
                style={{ top: ((mins - GRID_START) / 30) * SLOT_H, height: SLOT_H }}
              />
            )
          })}

          {/* Cards */}
          {apptsSorted.map(appt => {
            const startMins = minsFromISO(appt.starts_at)
            const endMins   = minsFromISO(appt.ends_at)
            const top       = ((startMins - GRID_START) / 30) * SLOT_H
            const height    = Math.max(40, ((endMins - startMins) / 30) * SLOT_H - 4)
            const color     = appt.service?.color ?? '#B565A7'
            const faded     = appt.status === 'cancelled' || appt.status === 'no_show'

            return (
              <div
                key={appt.id}
                data-appt
                onClick={e => { e.stopPropagation(); onAppointmentClick(appt) }}
                className="absolute left-2 right-2 rounded-xl px-3 py-2 cursor-pointer z-10 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                style={{
                  top:             `${top}px`,
                  height:          `${height}px`,
                  backgroundColor: faded ? '#f3f4f6' : `${color}12`,
                  borderLeft:      `4px solid ${faded ? '#d1d5db' : color}`,
                  opacity:         faded ? 0.7 : 1,
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-bold leading-tight truncate" style={{ color: faded ? '#9ca3af' : color }}>
                    {appt.client?.full_name ?? 'Sem cliente'}
                  </p>
                  <span className="text-xs text-gray-400 shrink-0 tabular-nums">
                    {format(parseISO(appt.starts_at), 'HH:mm')}
                    {' – '}
                    {format(parseISO(appt.ends_at), 'HH:mm')}
                  </span>
                </div>
                {height > 52 && (
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{appt.service?.name ?? '—'}</p>
                )}
                {height > 72 && appt.price != null && (
                  <p className="text-xs font-semibold mt-1" style={{ color: faded ? '#9ca3af' : color }}>
                    R$ {appt.price.toFixed(2).replace('.', ',')}
                  </p>
                )}
                {height > 90 && appt.notes && (
                  <p className="text-xs text-gray-400 mt-1 line-clamp-1">{appt.notes}</p>
                )}
              </div>
            )
          })}

          {/* Indicador de hora atual */}
          {nowTop !== null && (
            <div
              className="absolute pointer-events-none z-20 left-0 right-0"
              style={{ top: nowTop }}
            >
              <div className="relative flex items-center">
                <div className="w-3 h-3 rounded-full bg-red-500 shrink-0 -ml-1.5" />
                <div className="flex-1 h-0.5 bg-red-500" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
