'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Clock, ArrowLeft, ArrowRight, Loader2, Calendar } from 'lucide-react'
import { saveWorkingHours, loadOnboardingData } from '../actions'

interface DayConfig {
  active:     boolean
  startTime:  string
  endTime:    string
  hasBreak:   boolean
  breakStart: string
  breakEnd:   string
}

const DAYS = [
  { dow: 1, short: 'Seg', full: 'Segunda-feira'  },
  { dow: 2, short: 'Ter', full: 'Terça-feira'    },
  { dow: 3, short: 'Qua', full: 'Quarta-feira'   },
  { dow: 4, short: 'Qui', full: 'Quinta-feira'   },
  { dow: 5, short: 'Sex', full: 'Sexta-feira'    },
  { dow: 6, short: 'Sáb', full: 'Sábado'         },
  { dow: 0, short: 'Dom', full: 'Domingo'         },
]

const ADVANCE_OPTIONS = [
  { value: 1,  label: '1 hora'  },
  { value: 2,  label: '2 horas' },
  { value: 4,  label: '4 horas' },
  { value: 24, label: '1 dia'   },
  { value: 48, label: '2 dias'  },
]

const DEFAULT_DAY: DayConfig = {
  active:     false,
  startTime:  '08:00',
  endTime:    '18:00',
  hasBreak:   false,
  breakStart: '12:00',
  breakEnd:   '13:00',
}

type DayState = { [dow: number]: DayConfig }

function buildInitialState(): DayState {
  return Object.fromEntries(DAYS.map(d => [d.dow, { ...DEFAULT_DAY }]))
}

export default function AgendaPage() {
  const router = useRouter()
  const [days, setDays]               = useState<DayState>(buildInitialState)
  const [sameHours, setSameHours]     = useState(true)
  const [masterStart, setMasterStart] = useState('08:00')
  const [masterEnd, setMasterEnd]     = useState('18:00')
  const [minAdvance, setMinAdvance]   = useState(1)
  const [error, setError]             = useState('')
  const [saving, setSaving]           = useState(false)

  // Carrega dados salvos
  useEffect(() => {
    loadOnboardingData().then(data => {
      if (!data) return
      if (data.profile?.min_advance_hours) {
        setMinAdvance(data.profile.min_advance_hours)
      }
      if (data.hours && data.hours.length > 0) {
        setDays(prev => {
          const next = { ...prev }
          data.hours!.forEach(h => {
            next[h.day_of_week] = {
              active:     true,
              startTime:  h.start_time.slice(0, 5),
              endTime:    h.end_time.slice(0, 5),
              hasBreak:   !!h.break_start,
              breakStart: h.break_start ? h.break_start.slice(0, 5) : '12:00',
              breakEnd:   h.break_end   ? h.break_end.slice(0, 5)   : '13:00',
            }
          })
          return next
        })
        setSameHours(false)
      }
    })
  }, [])

  // Sincroniza horário mestre com todos os dias ativos quando sameHours ligado
  const applyMasterHours = (start: string, end: string) => {
    setDays(prev => {
      const next = { ...prev }
      DAYS.forEach(d => {
        if (next[d.dow].active) {
          next[d.dow] = { ...next[d.dow], startTime: start, endTime: end }
        }
      })
      return next
    })
  }

  const toggleDay = (dow: number) => {
    setDays(prev => {
      const wasActive = prev[dow].active
      const next = {
        ...prev,
        [dow]: {
          ...prev[dow],
          active:    !wasActive,
          startTime: sameHours ? masterStart : prev[dow].startTime,
          endTime:   sameHours ? masterEnd   : prev[dow].endTime,
        },
      }
      return next
    })
    setError('')
  }

  const updateDay = (dow: number, field: keyof DayConfig, value: unknown) => {
    setDays(prev => ({ ...prev, [dow]: { ...prev[dow], [field]: value } }))
  }

  const activeDays = DAYS.filter(d => days[d.dow].active)

  const validate = () => {
    if (activeDays.length === 0) {
      setError('Selecione pelo menos um dia de trabalho.')
      return false
    }
    for (const d of activeDays) {
      const cfg = days[d.dow]
      if (cfg.endTime <= cfg.startTime) {
        setError(`O horário de término deve ser após o início em ${d.full}.`)
        return false
      }
    }
    return true
  }

  const handleContinue = async () => {
    if (!validate()) return
    setSaving(true)
    const hoursPayload = activeDays.map(d => ({
      dayOfWeek:  d.dow,
      startTime:  days[d.dow].startTime,
      endTime:    days[d.dow].endTime,
      breakStart: days[d.dow].hasBreak ? days[d.dow].breakStart : null,
      breakEnd:   days[d.dow].hasBreak ? days[d.dow].breakEnd   : null,
    }))
    const result = await saveWorkingHours(hoursPayload, minAdvance)
    setSaving(false)
    if (result?.error) { setError(result.error); return }
    router.push('/onboarding/concluido')
  }

  return (
    <div className="animate-fade-slide-in space-y-8">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-bold text-[#1A1A2E]">Sua agenda 📅</h1>
        <p className="text-[#6B7280] mt-1.5">
          Configure os dias e horários em que você atende. Suas clientes só poderão agendar nesses horários.
        </p>
      </div>

      {/* Seletor de dias */}
      <div>
        <p className="text-sm font-semibold text-[#1A1A2E] mb-3">Dias que você trabalha</p>
        <div className="flex gap-2 flex-wrap">
          {DAYS.map(d => (
            <button
              key={d.dow}
              type="button"
              onClick={() => toggleDay(d.dow)}
              className={[
                'w-12 h-12 rounded-full text-sm font-semibold transition-all active:scale-90',
                days[d.dow].active
                  ? 'text-white shadow-md shadow-[#B565A7]/30'
                  : 'bg-gray-100 text-[#6B7280] hover:bg-gray-200',
              ].join(' ')}
              style={days[d.dow].active
                ? { background: 'linear-gradient(135deg, #B565A7, #7C5CBF)' }
                : {}}
            >
              {d.short}
            </button>
          ))}
        </div>
      </div>

      {/* Toggle mesmo horário */}
      {activeDays.length > 0 && (
        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => setSameHours(!sameHours)}
              className={[
                'w-11 h-6 rounded-full relative transition-colors duration-300 shrink-0',
                sameHours ? 'bg-[#B565A7]' : 'bg-gray-300',
              ].join(' ')}
            >
              <span className={[
                'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-300',
                sameHours ? 'left-5' : 'left-0.5',
              ].join(' ')} />
            </div>
            <span className="text-sm font-medium text-[#1A1A2E]">
              Mesmo horário para todos os dias
            </span>
          </label>

          {/* Horário mestre */}
          {sameHours && (
            <div className="bg-[#B565A7]/5 border border-[#B565A7]/20 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Clock size={15} className="text-[#B565A7]" />
                <span className="text-sm font-semibold text-[#1A1A2E]">Horário de atendimento</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 space-y-1">
                  <label className="text-xs text-[#6B7280]">Início</label>
                  <input
                    type="time"
                    value={masterStart}
                    onChange={e => {
                      setMasterStart(e.target.value)
                      applyMasterHours(e.target.value, masterEnd)
                    }}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-[#1A1A2E] focus:outline-none focus:ring-2 focus:ring-[#B565A7] focus:border-transparent"
                  />
                </div>
                <span className="text-[#6B7280] mt-5">até</span>
                <div className="flex-1 space-y-1">
                  <label className="text-xs text-[#6B7280]">Fim</label>
                  <input
                    type="time"
                    value={masterEnd}
                    onChange={e => {
                      setMasterEnd(e.target.value)
                      applyMasterHours(masterStart, e.target.value)
                    }}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-[#1A1A2E] focus:outline-none focus:ring-2 focus:ring-[#B565A7] focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Horários individuais */}
          {!sameHours && (
            <div className="space-y-3">
              {activeDays.map(d => {
                const cfg = days[d.dow]
                return (
                  <div key={d.dow} className="border border-gray-100 rounded-2xl p-4 space-y-3 bg-white shadow-sm">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                        style={{ background: 'linear-gradient(135deg, #B565A7, #7C5CBF)' }}
                      >
                        {d.short}
                      </span>
                      <span className="text-sm font-semibold text-[#1A1A2E]">{d.full}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex-1 space-y-1">
                        <label className="text-xs text-[#6B7280]">Início</label>
                        <input
                          type="time"
                          value={cfg.startTime}
                          onChange={e => updateDay(d.dow, 'startTime', e.target.value)}
                          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#B565A7] focus:border-transparent"
                        />
                      </div>
                      <span className="text-[#6B7280] mt-5 text-sm">até</span>
                      <div className="flex-1 space-y-1">
                        <label className="text-xs text-[#6B7280]">Fim</label>
                        <input
                          type="time"
                          value={cfg.endTime}
                          onChange={e => updateDay(d.dow, 'endTime', e.target.value)}
                          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#B565A7] focus:border-transparent"
                        />
                      </div>
                    </div>

                    {/* Pausa */}
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cfg.hasBreak}
                        onChange={e => updateDay(d.dow, 'hasBreak', e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 accent-[#B565A7]"
                      />
                      <span className="text-xs text-[#6B7280]">Pausa para almoço</span>
                    </label>

                    {cfg.hasBreak && (
                      <div className="flex items-center gap-3 pl-6">
                        <div className="flex-1 space-y-1">
                          <label className="text-xs text-[#6B7280]">Início da pausa</label>
                          <input
                            type="time"
                            value={cfg.breakStart}
                            onChange={e => updateDay(d.dow, 'breakStart', e.target.value)}
                            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#B565A7] focus:border-transparent"
                          />
                        </div>
                        <span className="text-[#6B7280] mt-5 text-xs">até</span>
                        <div className="flex-1 space-y-1">
                          <label className="text-xs text-[#6B7280]">Fim da pausa</label>
                          <input
                            type="time"
                            value={cfg.breakEnd}
                            onChange={e => updateDay(d.dow, 'breakEnd', e.target.value)}
                            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#B565A7] focus:border-transparent"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Antecedência mínima */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-[#1A1A2E] flex items-center gap-1.5">
          <Clock size={15} className="text-[#B565A7]" />
          Antecedência mínima para agendamento
        </label>
        <p className="text-xs text-[#6B7280]">Com quanto tempo de antecedência as clientes podem agendar?</p>
        <div className="flex flex-wrap gap-2">
          {ADVANCE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setMinAdvance(opt.value)}
              className={[
                'px-4 py-2 rounded-full text-sm font-medium border transition-all',
                minAdvance === opt.value
                  ? 'text-white border-transparent shadow-sm'
                  : 'bg-white border-gray-200 text-[#6B7280] hover:border-[#B565A7]',
              ].join(' ')}
              style={minAdvance === opt.value
                ? { background: 'linear-gradient(135deg, #B565A7, #7C5CBF)' }
                : {}}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="text-sm text-[#EF4444] bg-red-50 rounded-xl px-4 py-3">{error}</p>
      )}

      {/* Navegação */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={() => router.push('/onboarding/servicos')}
          className="flex items-center gap-2 px-5 py-4 rounded-2xl border border-gray-200 text-sm text-[#6B7280] font-medium hover:bg-gray-50 transition-all active:scale-95"
        >
          <ArrowLeft size={16} /> Voltar
        </button>
        <button
          onClick={handleContinue}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl text-white font-semibold text-base transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-[#B565A7]/30"
          style={{ background: 'linear-gradient(135deg, #B565A7, #7C5CBF)' }}
        >
          {saving ? (
            <><Loader2 size={18} className="animate-spin" /> Salvando...</>
          ) : (
            <>Continuar <ArrowRight size={18} /></>
          )}
        </button>
      </div>
    </div>
  )
}
